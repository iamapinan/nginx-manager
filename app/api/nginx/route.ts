import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Use local paths for development, container paths for production
const isDevelopment = process.env.NODE_ENV === 'development';
const NGINX_CONF_PATH = isDevelopment ? './nginx.conf' : '/etc/nginx/nginx.conf';
const BACKUP_PATH = isDevelopment ? './nginx.conf.backup' : '/etc/nginx/nginx.conf.backup';

export async function GET() {
  try {
    const content = await fs.readFile(NGINX_CONF_PATH, 'utf-8');
    return NextResponse.json({ content });
  } catch (error) {
    console.error('Error reading nginx.conf:', error);
    return NextResponse.json(
      { error: 'Failed to read nginx configuration file' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { action, content } = await request.json();

    switch (action) {
      case 'save':
        return await saveConfig(content);
      case 'validate':
        const validationResult = await validateConfig(content);
        return NextResponse.json(validationResult);
      case 'backup':
        return await createBackup();
      case 'restore':
        return await restoreBackup();
      case 'reload':
        return await reloadNginx();
      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Error in nginx config API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function saveConfig(content: string) {
  try {
    // Create backup before saving
    await createBackup();
    
    // Write new content
    await fs.writeFile(NGINX_CONF_PATH, content);
    
    // Validate the new configuration
    const validation = await validateConfig(content);
    if (!validation.valid) {
      // Restore backup if invalid
      await restoreBackup();
      return NextResponse.json(
        { error: 'Configuration is invalid', details: validation.error },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true, message: 'Configuration saved successfully' });
  } catch (error) {
    console.error('Error saving config:', error);
    return NextResponse.json(
      { error: 'Failed to save configuration' },
      { status: 500 }
    );
  }
}

async function validateConfig(content: string): Promise<{ valid: boolean; error?: string }> {
  try {
    // Write to temporary file
    const tempPath = '/tmp/nginx-test.conf';
    await fs.writeFile(tempPath, content);
    
    // Test nginx configuration
    await execAsync(`nginx -t -c ${tempPath}`);
    
    // Clean up temp file
    await fs.unlink(tempPath);
    
    return { valid: true };
  } catch (error: any) {
    return { 
      valid: false, 
      error: error.stderr || error.message || 'Configuration validation failed' 
    };
  }
}

async function createBackup() {
  try {
    const content = await fs.readFile(NGINX_CONF_PATH, 'utf-8');
    await fs.writeFile(BACKUP_PATH, content);
    return NextResponse.json({ success: true, message: 'Backup created successfully' });
  } catch (error) {
    console.error('Error creating backup:', error);
    return NextResponse.json(
      { error: 'Failed to create backup' },
      { status: 500 }
    );
  }
}

async function restoreBackup() {
  try {
    const backupExists = await fs.access(BACKUP_PATH).then(() => true).catch(() => false);
    if (!backupExists) {
      return NextResponse.json(
        { error: 'No backup file found' },
        { status: 404 }
      );
    }
    
    const backupContent = await fs.readFile(BACKUP_PATH, 'utf-8');
    await fs.writeFile(NGINX_CONF_PATH, backupContent);
    
    return NextResponse.json({ success: true, message: 'Configuration restored from backup' });
  } catch (error) {
    console.error('Error restoring backup:', error);
    return NextResponse.json(
      { error: 'Failed to restore backup' },
      { status: 500 }
    );
  }
}

async function reloadNginx() {
  try {
    await execAsync('nginx -s reload');
    return NextResponse.json({ success: true, message: 'Nginx reloaded successfully' });
  } catch (error: any) {
    console.error('Error reloading nginx:', error);
    return NextResponse.json(
      { error: error.stderr || error.message || 'Failed to reload nginx' },
      { status: 500 }
    );
  }
} 