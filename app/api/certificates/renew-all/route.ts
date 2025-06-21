import { NextResponse } from 'next/server';
import { certbotService } from '@/lib/certbot';

export async function POST() {
  try {
    const result = await certbotService.renewAllCertificates();
    
    return NextResponse.json({
      success: true,
      message: `Renewal completed: ${result.renewed} certificates renewed`,
      renewed: result.renewed,
      failed: result.failed
    });
  } catch (error) {
    console.error('Auto-renewal failed:', error);
    return NextResponse.json(
      { error: 'Auto-renewal failed' },
      { status: 500 }
    );
  }
} 