import { NextRequest, NextResponse } from 'next/server';
import { database } from '@/lib/database';
import { certbotService } from '@/lib/certbot';

export async function GET() {
  try {
    const certificates = await database.getAllCertificates();
    
    // เพิ่มข้อมูลสถานะ certificate
    const certificatesWithStatus = await Promise.all(
      certificates.map(async (cert) => {
        const status = await certbotService.checkCertificateStatus(cert.domain);
        return {
          ...cert,
          isValid: status.valid,
          daysLeft: status.daysLeft,
          expiryDate: status.expiryDate
        };
      })
    );

    return NextResponse.json(certificatesWithStatus);
  } catch (error) {
    console.error('Failed to fetch certificates:', error);
    return NextResponse.json(
      { error: 'ไม่สามารถดึงข้อมูล certificates ได้' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { domain, email, action } = body;

    if (!domain || !email) {
      return NextResponse.json(
        { error: 'กรุณาระบุ domain และ email' },
        { status: 400 }
      );
    }

    if (action === 'issue') {
      const result = await certbotService.issueCertificate(domain, email);
      
      if (result.success) {
        return NextResponse.json({
          success: true,
          message: result.message,
          certificate: result.certificate
        });
      } else {
        return NextResponse.json(
          { error: result.message },
          { status: 400 }
        );
      }
    }

    if (action === 'renew') {
      const result = await certbotService.renewCertificate(domain);
      
      if (result.success) {
        return NextResponse.json({
          success: true,
          message: result.message
        });
      } else {
        return NextResponse.json(
          { error: result.message },
          { status: 400 }
        );
      }
    }

    if (action === 'revoke') {
      const result = await certbotService.revokeCertificate(domain);
      
      if (result.success) {
        return NextResponse.json({
          success: true,
          message: result.message
        });
      } else {
        return NextResponse.json(
          { error: result.message },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Action ไม่ถูกต้อง' },
      { status: 400 }
    );

  } catch (error) {
    console.error('Certificate operation failed:', error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการดำเนินการ' },
      { status: 500 }
    );
  }
} 