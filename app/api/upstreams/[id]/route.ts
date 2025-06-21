import { NextRequest, NextResponse } from 'next/server';
import { database } from '@/lib/database';
import { dockerService } from '@/lib/docker';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);
    const upstream = await database.getUpstreamById(id);
    
    if (!upstream) {
      return NextResponse.json({ error: 'Upstream not found' }, { status: 404 });
    }
    
    return NextResponse.json(upstream);
  } catch (error) {
    console.error('Error fetching upstream:', error);
    return NextResponse.json({ error: 'Failed to fetch upstream' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);
    const body = await request.json();
    const { name, description, method, hash_key, servers } = body;

    if (!name || !description || !method || !servers || !Array.isArray(servers)) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Update upstream
    await database.updateUpstream(id, {
      name,
      description,
      method,
      hash_key
    });

    // Delete existing servers
    const existingServers = await database.getUpstreamServers(id);
    for (const server of existingServers) {
      await database.deleteUpstreamServer(server.id!);
    }

    // Create new servers
    for (const server of servers) {
      await database.createUpstreamServer({
        upstream_id: id,
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

    return NextResponse.json({ message: 'Upstream updated successfully' });
  } catch (error) {
    console.error('Error updating upstream:', error);
    return NextResponse.json({ error: 'Failed to update upstream' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);
    
    // Check if upstream exists
    const upstream = await database.getUpstreamById(id);
    if (!upstream) {
      return NextResponse.json({ error: 'Upstream not found' }, { status: 404 });
    }

    // Delete upstream (cascade will delete servers)
    await database.deleteUpstream(id);

    // Update nginx configuration
    try {
      await dockerService.updateNginxConfig();
    } catch (nginxError) {
      console.error('Error updating nginx config:', nginxError);
    }

    return NextResponse.json({ message: 'Upstream deleted successfully' });
  } catch (error) {
    console.error('Error deleting upstream:', error);
    return NextResponse.json({ error: 'Failed to delete upstream' }, { status: 500 });
  }
} 