import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import { database, SSLCertificate } from './database';

const execAsync = promisify(exec);

export class CertbotService {
  private certbotPath = '/usr/bin/certbot';
  private nginxConfigPath = '/etc/nginx';
  private letsencryptPath = '/etc/letsencrypt';
  private webroot = '/var/www/certbot';

  constructor() {
    // เรียก ensureDirectories เฉพาะใน production environment
    if (process.env.NODE_ENV === 'production') {
      this.ensureDirectories();
    }
  }

  private async ensureDirectories(): Promise<void> {
    try {
      // ตรวจสอบว่าอยู่ใน production environment และมี permission ในการสร้าง directory
      if (process.env.NODE_ENV === 'production') {
        await fs.mkdir(this.webroot, { recursive: true });
        await fs.mkdir(path.join(this.letsencryptPath, 'live'), { recursive: true });
      }
    } catch (error) {
      console.error('Failed to create directories:', error);
    }
  }

  async issueCertificate(domain: string, email: string): Promise<{ success: boolean; message: string; certificate?: SSLCertificate }> {
    try {
      // ตรวจสอบว่ามี certificate อยู่แล้วหรือไม่
      const existing = await database.getCertificateByDomain(domain);
      if (existing && existing.status === 'active') {
        return {
          success: false,
          message: `Certificate สำหรับ ${domain} มีอยู่แล้วและยังใช้งานได้`
        };
      }

      // สร้าง certificate record ใน database
      const certificate = await database.createCertificate({
        domain,
        email,
        status: 'pending'
      });

      // สร้าง webroot challenge directory
      const challengeDir = path.join(this.webroot, '.well-known/acme-challenge');
      await fs.mkdir(challengeDir, { recursive: true });

      // สร้าง temporary nginx config สำหรับ HTTP validation
      await this.createHttpValidationConfig(domain);

      // Reload nginx เพื่อใช้ config ใหม่
      await this.reloadNginx();

      // รัน certbot
      const certbotCommand = [
        this.certbotPath,
        'certonly',
        '--webroot',
        '-w', this.webroot,
        '-d', domain,
        '--email', email,
        '--agree-tos',
        '--non-interactive',
        '--expand',
        '--keep-until-expiring'
      ].join(' ');

      console.log('Running certbot:', certbotCommand);
      const { stdout, stderr } = await execAsync(certbotCommand);

      // ตรวจสอบว่า certificate ถูกสร้างสำเร็จ
      const certPath = path.join(this.letsencryptPath, 'live', domain, 'fullchain.pem');
      const keyPath = path.join(this.letsencryptPath, 'live', domain, 'privkey.pem');

      try {
        await fs.access(certPath);
        await fs.access(keyPath);
      } catch {
        throw new Error('Certificate files not found after certbot execution');
      }

      // อ่านข้อมูล certificate เพื่อหา expiry date
      const expiryDate = await this.getCertificateExpiry(certPath);

      // อัปเดต certificate record
      const updatedCert = await database.updateCertificate(certificate.id!, {
        status: 'active',
        certificate_path: certPath,
        private_key_path: keyPath,
        expires_at: expiryDate
      });

      // สร้าง SSL nginx config
      await this.createSslConfig(domain, certPath, keyPath);
      await this.reloadNginx();

      return {
        success: true,
        message: `Certificate สำหรับ ${domain} ถูกสร้างสำเร็จ`,
        certificate: updatedCert!
      };

    } catch (error) {
      console.error('Certificate issuance failed:', error);
      
      // อัปเดตสถานะเป็น failed
      const existing = await database.getCertificateByDomain(domain);
      if (existing) {
        await database.updateCertificate(existing.id!, { status: 'failed' });
      }

      return {
        success: false,
        message: `ไม่สามารถสร้าง certificate ได้: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  async renewCertificate(domain: string): Promise<{ success: boolean; message: string }> {
    try {
      const certificate = await database.getCertificateByDomain(domain);
      if (!certificate) {
        return { success: false, message: 'Certificate ไม่พบในระบบ' };
      }

      // รัน certbot renew
      const renewCommand = [
        this.certbotPath,
        'renew',
        '--cert-name', domain,
        '--non-interactive'
      ].join(' ');

      const { stdout, stderr } = await execAsync(renewCommand);

      // ตรวจสอบว่า renewal สำเร็จ
      if (stdout.includes('Certificate not yet due for renewal') || stdout.includes('Congratulations, all renewals succeeded')) {
        const certPath = path.join(this.letsencryptPath, 'live', domain, 'fullchain.pem');
        const expiryDate = await this.getCertificateExpiry(certPath);

        await database.updateCertificate(certificate.id!, {
          status: 'active',
          expires_at: expiryDate
        });

        await this.reloadNginx();

        return {
          success: true,
          message: `Certificate สำหรับ ${domain} ถูก renew สำเร็จ`
        };
      }

      return {
        success: false,
        message: 'Certificate renewal ไม่สำเร็จ'
      };

    } catch (error) {
      return {
        success: false,
        message: `Renewal failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  async revokeCertificate(domain: string): Promise<{ success: boolean; message: string }> {
    try {
      const certificate = await database.getCertificateByDomain(domain);
      if (!certificate || !certificate.certificate_path) {
        return { success: false, message: 'Certificate ไม่พบ' };
      }

      // รัน certbot revoke
      const revokeCommand = [
        this.certbotPath,
        'revoke',
        '--cert-path', certificate.certificate_path,
        '--non-interactive'
      ].join(' ');

      await execAsync(revokeCommand);

      // ลบ certificate record
      await database.deleteCertificate(certificate.id!);

      // ลบ SSL config
      await this.removeSslConfig(domain);
      await this.reloadNginx();

      return {
        success: true,
        message: `Certificate สำหรับ ${domain} ถูก revoke สำเร็จ`
      };

    } catch (error) {
      return {
        success: false,
        message: `Revocation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  async checkCertificateStatus(domain: string): Promise<{ valid: boolean; daysLeft?: number; expiryDate?: string }> {
    try {
      const certificate = await database.getCertificateByDomain(domain);
      if (!certificate || !certificate.certificate_path) {
        return { valid: false };
      }

      const certPath = certificate.certificate_path;
      await fs.access(certPath);

      const expiryDate = await this.getCertificateExpiry(certPath);
      const expiryTime = new Date(expiryDate).getTime();
      const currentTime = new Date().getTime();
      const daysLeft = Math.floor((expiryTime - currentTime) / (1000 * 60 * 60 * 24));

      return {
        valid: daysLeft > 0,
        daysLeft,
        expiryDate
      };

    } catch (error) {
      return { valid: false };
    }
  }

  private async createHttpValidationConfig(domain: string): Promise<void> {
    const config = `
server {
    listen 80;
    server_name ${domain};
    
    location /.well-known/acme-challenge/ {
        root ${this.webroot};
        try_files $uri =404;
    }
    
    location / {
        return 301 https://$server_name$request_uri;
    }
}
`;

    const configPath = path.join(this.nginxConfigPath, 'conf.d', `${domain}-http.conf`);
    await fs.writeFile(configPath, config);
  }

  private async createSslConfig(domain: string, certPath: string, keyPath: string): Promise<void> {
    const config = `
server {
    listen 80;
    server_name ${domain};
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name ${domain};
    
    ssl_certificate ${certPath};
    ssl_certificate_key ${keyPath};
    
    # SSL Configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-RSA-AES128-SHA256:ECDHE-RSA-AES256-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    
    # HSTS
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    
    # Security headers
    add_header X-Frame-Options DENY always;
    add_header X-Content-Type-Options nosniff always;
    add_header X-XSS-Protection "1; mode=block" always;
    
    location / {
        # Default proxy or static content
        return 200 'SSL Certificate Active for ${domain}';
        add_header Content-Type text/plain;
    }
}
`;

    const configPath = path.join(this.nginxConfigPath, 'conf.d', `${domain}-ssl.conf`);
    await fs.writeFile(configPath, config);

    // ลบ HTTP-only config
    const httpConfigPath = path.join(this.nginxConfigPath, 'conf.d', `${domain}-http.conf`);
    try {
      await fs.unlink(httpConfigPath);
    } catch {
      // Ignore if file doesn't exist
    }
  }

  private async removeSslConfig(domain: string): Promise<void> {
    const sslConfigPath = path.join(this.nginxConfigPath, 'conf.d', `${domain}-ssl.conf`);
    const httpConfigPath = path.join(this.nginxConfigPath, 'conf.d', `${domain}-http.conf`);

    try {
      await fs.unlink(sslConfigPath);
    } catch {
      // Ignore if file doesn't exist
    }

    try {
      await fs.unlink(httpConfigPath);
    } catch {
      // Ignore if file doesn't exist
    }
  }

  private async getCertificateExpiry(certPath: string): Promise<string> {
    try {
      const { stdout } = await execAsync(`openssl x509 -enddate -noout -in "${certPath}"`);
      const match = stdout.match(/notAfter=(.+)/);
      if (match) {
        return new Date(match[1]).toISOString();
      }
      throw new Error('Could not parse certificate expiry date');
    } catch (error) {
      throw new Error(`Failed to get certificate expiry: ${error}`);
    }
  }

  private async reloadNginx(): Promise<void> {
    try {
      await execAsync('nginx -t'); // Test configuration
      await execAsync('nginx -s reload'); // Reload if test passes
    } catch (error) {
      throw new Error(`Failed to reload nginx: ${error}`);
    }
  }

  async renewAllCertificates(): Promise<{ renewed: number; failed: string[] }> {
    const certificates = await database.getAllCertificates();
    const activeCerts = certificates.filter(cert => cert.status === 'active');
    
    let renewed = 0;
    const failed: string[] = [];

    for (const cert of activeCerts) {
      try {
        const status = await this.checkCertificateStatus(cert.domain);
        
        // Renew if certificate expires within 30 days
        if (status.valid && status.daysLeft !== undefined && status.daysLeft <= 30) {
          const result = await this.renewCertificate(cert.domain);
          if (result.success) {
            renewed++;
          } else {
            failed.push(cert.domain);
          }
        }
      } catch (error) {
        failed.push(cert.domain);
      }
    }

    return { renewed, failed };
  }
}

let _certbotService: CertbotService | null = null;

export const getCertbotService = (): CertbotService => {
  if (!_certbotService) {
    _certbotService = new CertbotService();
  }
  return _certbotService;
};

// สำหรับ backward compatibility
export const certbotService = {
  get issueCertificate() { return getCertbotService().issueCertificate.bind(getCertbotService()); },
  get renewCertificate() { return getCertbotService().renewCertificate.bind(getCertbotService()); },
  get revokeCertificate() { return getCertbotService().revokeCertificate.bind(getCertbotService()); },
  get checkCertificateStatus() { return getCertbotService().checkCertificateStatus.bind(getCertbotService()); },
  get renewAllCertificates() { return getCertbotService().renewAllCertificates.bind(getCertbotService()); }
}; 