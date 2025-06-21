import { NextResponse } from 'next/server';
import { DockerService } from '@/lib/docker';

const dockerService = new DockerService();

export async function GET() {
  try {
    const status = await dockerService.getNginxStatus();
    
    return NextResponse.json({
      running: status.running,
      message: status.message,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error checking nginx status:', error);
    return NextResponse.json(
      { 
        running: false, 
        message: 'Failed to check nginx status',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 