import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import { ProxySite, Redirection, AccessList, database } from './database';
import { nginxConfigGenerator } from './nginx-config';

const execAsync = promisify(exec);

export class DockerService {
  private nginxConfigPath = '/etc/nginx/conf.d';
  private isInternalNginx = true; // nginx อยู่ใน container เดียวกัน

    async generateNginxConfig(): Promise<string> {
    const sites = await database.getAllSites();
    const redirections = await database.getAllRedirections();
    const accessLists = await database.getAllAccessLists();
    const upstreams = await database.getAllUpstreams();
    
    return nginxConfigGenerator.generateMainConfig(sites, redirections, accessLists, upstreams);
  }

  async updateNginxConfig(): Promise<void> {
    const sites = await database.getAllSites();
    const redirections = await database.getAllRedirections();
    const accessLists = await database.getAllAccessLists();
    const upstreams = await database.getAllUpstreams();
    
    if (this.isInternalNginx) {
      // ลบไฟล์ config เก่าทั้งหมด (ยกเว้น default.conf หลัก)
      await this.cleanupOldConfigs();
      
      // สร้างไฟล์แยกสำหรับแต่ละ upstream
      for (const upstream of upstreams) {
        const upstreamConfig = nginxConfigGenerator.generateSingleUpstreamConfig(upstream);
        await fs.writeFile(`/etc/nginx/conf.d/upstream-${upstream.id}.conf`, upstreamConfig);
      }
      
      // สร้างไฟล์แยกสำหรับแต่ละ site
      for (const site of sites) {
        const accessList = site.access_list_id ? accessLists.find(al => al.id === site.access_list_id) : undefined;
        const upstream = site.upstream_id ? upstreams.find(u => u.id === site.upstream_id) : undefined;
        const siteConfig = nginxConfigGenerator.generateProxyConfig(site, accessList, upstream);
        
        await fs.writeFile(`/etc/nginx/conf.d/site-${site.id}.conf`, siteConfig);
      }
      
      // สร้างไฟล์แยกสำหรับแต่ละ redirection
      for (const redirection of redirections) {
        const redirectionConfig = nginxConfigGenerator.generateRedirectionConfig(redirection);
        await fs.writeFile(`/etc/nginx/conf.d/redirect-${redirection.id}.conf`, redirectionConfig);
      }
      
    } else {
      // เขียนไฟล์ config ไปยัง mounted volume
      const configDir = path.join(process.cwd(), 'nginx-config');
      await fs.mkdir(configDir, { recursive: true });
      
      // ลบไฟล์ config เก่าทั้งหมด
      await this.cleanupOldConfigs(configDir);
      
      // สร้างไฟล์แยกสำหรับแต่ละ upstream
      for (const upstream of upstreams) {
        const upstreamConfig = nginxConfigGenerator.generateSingleUpstreamConfig(upstream);
        await fs.writeFile(path.join(configDir, `upstream-${upstream.id}.conf`), upstreamConfig);
      }
      
      // สร้างไฟล์แยกสำหรับแต่ละ site
      for (const site of sites) {
        const accessList = site.access_list_id ? accessLists.find(al => al.id === site.access_list_id) : undefined;
        const upstream = site.upstream_id ? upstreams.find(u => u.id === site.upstream_id) : undefined;
        const siteConfig = nginxConfigGenerator.generateProxyConfig(site, accessList, upstream);
        
        await fs.writeFile(path.join(configDir, `site-${site.id}.conf`), siteConfig);
      }
      
      // สร้างไฟล์แยกสำหรับแต่ละ redirection
      for (const redirection of redirections) {
        const redirectionConfig = nginxConfigGenerator.generateRedirectionConfig(redirection);
        await fs.writeFile(path.join(configDir, `redirect-${redirection.id}.conf`), redirectionConfig);
      }
    }
  }

  private async cleanupOldConfigs(configDir?: string): Promise<void> {
    try {
      const targetDir = configDir || '/etc/nginx/conf.d';
      const files = await fs.readdir(targetDir);
      
      for (const file of files) {
        // ลบไฟล์ที่ขึ้นต้นด้วย site-, redirect-, upstream-, หรือ 00-upstreams
        if (file.startsWith('site-') || 
            file.startsWith('redirect-') || 
            file.startsWith('upstream-') || 
            file === '00-upstreams.conf') {
          await fs.unlink(path.join(targetDir, file));
        }
      }
    } catch (error) {
      console.warn('Warning: Could not cleanup old config files:', error);
    }
  }

  async readNginxConfig(): Promise<string> {
    try {
      if (this.isInternalNginx) {
        return await fs.readFile('/etc/nginx/conf.d/default.conf', 'utf-8');
      } else {
        const configPath = path.join(process.cwd(), 'nginx-config', 'default.conf');
        return await fs.readFile(configPath, 'utf-8');
      }
    } catch (error) {
      return '';
    }
  }

  async writeNginxConfig(config: string): Promise<void> {
    if (this.isInternalNginx) {
      await fs.writeFile('/etc/nginx/conf.d/default.conf', config);
    } else {
      const configPath = path.join(process.cwd(), 'nginx-config', 'default.conf');
      await fs.mkdir(path.dirname(configPath), { recursive: true });
      await fs.writeFile(configPath, config);
    }
  }

  async restartNginx(): Promise<{ success: boolean; message: string }> {
    try {
      if (this.isInternalNginx) {
        // Reload nginx configuration ใน container เดียวกัน
        const { stdout, stderr } = await execAsync('nginx -s reload');
        
        return {
          success: true,
          message: 'Nginx configuration reloaded successfully'
        };
      } else {
        // ใช้ Docker service update เพื่อ restart external nginx
        const { stdout, stderr } = await execAsync(`supervisorctl restart nginx`);
        
        return {
          success: true,
          message: 'Nginx service restarted successfully'
        };
      }
    } catch (error) {
      console.error('Error restarting nginx:', error);
      return {
        success: false,
        message: `Failed to restart nginx: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  async testNginxConfig(): Promise<{ success: boolean; message: string }> {
    try {
      // ทดสอบ nginx config
      const { stdout, stderr } = await execAsync('nginx -t');
      
      return {
        success: true,
        message: 'Nginx configuration is valid'
      };
    } catch (error) {
      return {
        success: false,
        message: `Nginx configuration test failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  async getNginxStatus(): Promise<{ running: string; message: string }> {
    const { stdout } = await execAsync('cat /var/run/nginx.pid');
    return {
      running: stdout.trim() !== '' ? 'yes' : 'no',
      message: 'Nginx status'
    };
  }
}

export const dockerService = new DockerService(); 