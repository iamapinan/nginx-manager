import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';
import { withAuth } from '@/lib/api-auth';
import { dockerService } from '@/lib/docker';

export async function GET(request: NextRequest) {
  return withAuth(async (request) => {
    try {
      const database = getDatabase();
      const sites = await database.getAllSites();
      return NextResponse.json(sites);
    } catch (error) {
      console.error('Error fetching sites:', error);
      return NextResponse.json(
        { error: 'Failed to fetch sites' },
        { status: 500 }
      );
    }
  }, request);
}

export async function POST(request: NextRequest) {
  return withAuth(async (request) => {
    try {
      const database = getDatabase();
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

      const siteId = await database.createSite({
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

      const newSite = await database.getSiteById(siteId);
      return NextResponse.json(newSite, { status: 201 });
    } catch (error) {
      console.error('Error creating site:', error);
      return NextResponse.json(
        { error: 'Failed to create site' },
        { status: 500 }
      );
    }
  }, request);
} 