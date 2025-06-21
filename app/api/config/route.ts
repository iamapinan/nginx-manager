import { NextRequest, NextResponse } from 'next/server';
import { dockerService } from '@/lib/docker';

export async function GET() {
  try {
    const config = await dockerService.readNginxConfig();
    return NextResponse.json({ config });
  } catch (error) {
    console.error('Error reading nginx config:', error);
    return NextResponse.json(
      { error: 'Failed to read nginx config' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { config, action } = body;

    switch (action) {
      case 'save':
        await dockerService.writeNginxConfig(config);
        
        // ทดสอบ config
        const testResult = await dockerService.testNginxConfig();
        if (!testResult.success) {
          return NextResponse.json(
            { error: 'Invalid nginx configuration', details: testResult.message },
            { status: 400 }
          );
        }

        // Restart nginx ถ้า config ถูกต้อง
        const restartResult = await dockerService.restartNginx();
        return NextResponse.json({
          success: true,
          message: 'Configuration saved and nginx restarted',
          restartResult
        });

      case 'test':
        await dockerService.writeNginxConfig(config);
        const result = await dockerService.testNginxConfig();
        return NextResponse.json(result);

      case 'generate':
        const generatedConfig = await dockerService.generateNginxConfig();
        return NextResponse.json({ config: generatedConfig });

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Error handling nginx config:', error);
    return NextResponse.json(
      { error: 'Failed to handle nginx config' },
      { status: 500 }
    );
  }
} 