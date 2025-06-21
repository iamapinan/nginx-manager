import { NextRequest, NextResponse } from 'next/server';
import { database } from '@/lib/database';
import { dockerService } from '@/lib/docker';

export async function GET() {
  try {
    const redirections = await database.getAllRedirections();
    return NextResponse.json(redirections);
  } catch (error) {
    console.error('Error fetching redirections:', error);
    return NextResponse.json(
      { error: 'Failed to fetch redirections' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, domain, target_url, ssl, preserve_path, status_code } = body;

    if (!name || !domain || !target_url) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const redirectionId = await database.createRedirection({
      name,
      domain,
      target_url,
      ssl: ssl || false,
      preserve_path: preserve_path ?? true,
      status_code: status_code || 302
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

    const newRedirection = { id: redirectionId, ...body };
    return NextResponse.json(newRedirection, { status: 201 });
  } catch (error) {
    console.error('Error creating redirection:', error);
    return NextResponse.json(
      { error: 'Failed to create redirection' },
      { status: 500 }
    );
  }
} 