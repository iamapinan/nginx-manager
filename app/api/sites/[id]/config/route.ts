import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';
import { database } from '@/lib/database';
import path from 'path';

const execAsync = promisify(exec);

// Use appropriate paths based on environment
const isDevelopment = process.env.NODE_ENV === 'development';
const NGINX_SITES_PATH = isDevelopment ? './nginx-config' : '/etc/nginx/sites-available';
const NGINX_ENABLED_PATH = isDevelopment ? './nginx-config' : '/etc/nginx/sites-enabled';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);
    const site = await database.getSiteById(id);
    
    if (!site) {
      return NextResponse.json(
        { error: 'Site not found' },
        { status: 404 }
      );
    }

    const configPath = path.join(NGINX_SITES_PATH, `${site.domain}.conf`);
    
    try {
      const content = await fs.readFile(configPath, 'utf-8');
      return NextResponse.json({ content, path: configPath });
    } catch (error) {
      // ถ้าไฟล์ไม่มี ให้สร้างไฟล์ default
      const defaultConfig = generateDefaultSiteConfig(site);
      return NextResponse.json({ 
        content: defaultConfig, 
        path: configPath,
        isNew: true 
      });
    }
  } catch (error) {
    console.error('Error reading site config:', error);
    return NextResponse.json(
      { error: 'Failed to read site configuration' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = parseInt(params.id);
    const { content } = await request.json();
    
    const site = await database.getSiteById(id);
    if (!site) {
      return NextResponse.json(
        { error: 'Site not found' },
        { status: 404 }
      );
    }

    const configPath = path.join(NGINX_SITES_PATH, `${site.domain}.conf`);
    const enabledPath = path.join(NGINX_ENABLED_PATH, `${site.domain}.conf`);
    
    // Create backup
    const backupPath = `${configPath}.backup`;
    try {
      await fs.access(configPath);
      await fs.copyFile(configPath, backupPath);
    } catch (error) {
      // ไฟล์ยังไม่มี ไม่ต้อง backup
    }

    // Write new config
    await fs.writeFile(configPath, content);
    
    // Validate config
    const validation = await validateNginxConfig();
    if (!validation.valid) {
      // Restore backup if validation failed
      try {
        await fs.copyFile(backupPath, configPath);
      } catch (error) {
        // ไม่มี backup ให้ลบไฟล์ที่เพิ่งสร้าง
        await fs.unlink(configPath);
      }
      
      return NextResponse.json(
        { error: 'Configuration is invalid', details: validation.error },
        { status: 400 }
      );
    }

    // Create symlink to enabled sites if not exists
    try {
      await fs.access(enabledPath);
    } catch (error) {
      // Symlink doesn't exist, create it
      if (!isDevelopment) {
        await fs.symlink(configPath, enabledPath);
      }
    }

    // Reload nginx
    try {
      if (!isDevelopment) {
        await execAsync('nginx -s reload');
      }
    } catch (error) {
      console.warn('Failed to reload nginx:', error);
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Configuration saved and nginx reloaded successfully',
      path: configPath
    });
  } catch (error) {
    console.error('Error saving site config:', error);
    return NextResponse.json(
      { error: 'Failed to save configuration' },
      { status: 500 }
    );
  }
}

async function validateNginxConfig(): Promise<{ valid: boolean; error?: string }> {
  try {
    if (isDevelopment) {
      // In development, just return valid
      return { valid: true };
    }
    
    await execAsync('nginx -t');
    return { valid: true };
  } catch (error: any) {
    return { 
      valid: false, 
      error: error.stderr || error.message || 'Configuration validation failed' 
    };
  }
}

function generateDefaultSiteConfig(site: any): string {
  return `# Configuration for ${site.name}
# Domain: ${site.domain}
# Auto-generated on ${new Date().toISOString()}

server {
    listen 80;
    ${site.ssl ? 'listen 443 ssl http2;' : ''}
    server_name ${site.domain};

    # Client max body size
    client_max_body_size ${site.client_max_body_size || '1m'};

    ${site.ssl ? generateSSLBlock(site.domain) : ''}
    ${site.block_exploits ? generateSecurityBlock() : ''}

    location / {
        proxy_pass ${site.target || 'http://localhost:3000'};
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Timeout settings
        proxy_connect_timeout 30s;
        proxy_send_timeout 30s;
        proxy_read_timeout 30s;
        
        # Buffer settings
        proxy_buffering on;
        proxy_buffer_size 4k;
        proxy_buffers 8 4k;
    }

    ${site.advanced_config || ''}
}

${site.ssl_forced ? generateHTTPSRedirect(site.domain) : ''}
`;
}

function generateSSLBlock(domain: string): string {
  return `
    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/${domain}/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/${domain}/privkey.pem;
    
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;`;
}

function generateSecurityBlock(): string {
  return `
    # Security Headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;

    # Block common exploits
    location ~* /(\\.|\\.\\.) {
        deny all;
    }
    
    location ~* \\.(aspx?|php|jsp|cgi)$ {
        deny all;
    }`;
}

function generateHTTPSRedirect(domain: string): string {
  return `
# Force HTTPS redirect
server {
    listen 80;
    server_name ${domain};
    return 301 https://$server_name$request_uri;
}`;
} 