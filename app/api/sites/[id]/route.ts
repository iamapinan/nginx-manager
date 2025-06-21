import { NextRequest, NextResponse } from 'next/server';
import { database } from '@/lib/database';
import { dockerService } from '@/lib/docker';

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

    return NextResponse.json(site);
  } catch (error) {
    console.error('Error fetching site:', error);
    return NextResponse.json(
      { error: 'Failed to fetch site' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);
    const body = await request.json();
    const { 
      name, domain, target, ssl, ssl_forced, hsts_enabled, 
      http2_support, block_exploits, caching_enabled, advanced_config,
      client_max_body_size, upstream_id, access_list_id
    } = body;

    if (!name || !domain || (!target && !upstream_id)) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    await database.updateSite(id, {
      name,
      domain,
      target,
      ssl: ssl || false,
      ssl_forced: ssl_forced || false,
      hsts_enabled: hsts_enabled || false,
      http2_support: http2_support ?? true,
      block_exploits: block_exploits ?? true,
      caching_enabled: caching_enabled || false,
      advanced_config: advanced_config || null,
      client_max_body_size: client_max_body_size || '1m',
      upstream_id: upstream_id || null,
      access_list_id: access_list_id || null
    });

    // อัปเดต nginx config
    await dockerService.updateNginxConfig();

    // ทดสอบ config และ restart nginx
    const testResult = await dockerService.testNginxConfig();
    if (testResult.success) {
      const restartResult = await dockerService.restartNginx();
      if (!restartResult.success) {
        console.warn('Config updated but failed to restart nginx:', restartResult.message);
      }
    } else {
      console.warn('Nginx config test failed:', testResult.message);
    }

    const updatedSite = await database.getSiteById(id);
    return NextResponse.json(updatedSite);
  } catch (error) {
    console.error('Error updating site:', error);
    return NextResponse.json(
      { error: 'Failed to update site' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);
    
    await database.deleteSite(id);

    // อัปเดต nginx config
    await dockerService.updateNginxConfig();

    // ทดสอบ config และ restart nginx
    const testResult = await dockerService.testNginxConfig();
    if (testResult.success) {
      const restartResult = await dockerService.restartNginx();
      if (!restartResult.success) {
        console.warn('Config updated but failed to restart nginx:', restartResult.message);
      }
    } else {
      console.warn('Nginx config test failed:', testResult.message);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting site:', error);
    return NextResponse.json(
      { error: 'Failed to delete site' },
      { status: 500 }
    );
  }
} 