import { NextRequest, NextResponse } from 'next/server';
import { database, Upstream } from '@/lib/database';
import { dockerService } from '@/lib/docker';

export async function GET() {
  try {
    const upstreams = await database.getAllUpstreams();
    return NextResponse.json(upstreams);
  } catch (error) {
    console.error('Error fetching upstreams:', error);
    return NextResponse.json({ error: 'Failed to fetch upstreams' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description, method, hash_key, servers } = body;

    if (!name || !description || !method || !servers || !Array.isArray(servers)) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Create upstream
    const upstreamId = await database.createUpstream({
      name,
      description,
      method,
      hash_key
    });

    // Create servers
    for (const server of servers) {
      await database.createUpstreamServer({
        upstream_id: upstreamId,
        server: server.server,
        weight: server.weight || 1,
        max_fails: server.max_fails || 1,
        fail_timeout: server.fail_timeout || '10s',
        backup: server.backup || false,
        down: server.down || false
      });
    }

    // Update nginx configuration
    try {
      await dockerService.updateNginxConfig();
    } catch (nginxError) {
      console.error('Error updating nginx config:', nginxError);
    }

    return NextResponse.json({ 
      id: upstreamId, 
      message: 'Upstream created successfully' 
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating upstream:', error);
    return NextResponse.json({ error: 'Failed to create upstream' }, { status: 500 });
  }
} 