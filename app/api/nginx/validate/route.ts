import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';

export async function POST(request: NextRequest) {
  try {
    const { config, domain } = await request.json();

    if (!config || !domain) {
      return NextResponse.json(
        { valid: false, error: 'Config and domain are required' },
        { status: 400 }
      );
    }

    // สร้างไฟล์ config ชั่วคราวเพื่อทดสอบ
    const tempDir = '/tmp/nginx-validate';
    const tempConfigFile = path.join(tempDir, `${domain}.conf`);

    try {
      // สร้างโฟลเดอร์ถ้ายังไม่มี
      await fs.mkdir(tempDir, { recursive: true });

      // เขียนไฟล์ config
      await fs.writeFile(tempConfigFile, config);

      // ตรวจสอบ syntax ด้วย nginx -t
      return new Promise<Response>((resolve) => {
        exec(`nginx -t -c ${tempConfigFile}`, (error, stdout, stderr) => {
          // ลบไฟล์ชั่วคราว
          fs.unlink(tempConfigFile).catch(() => {});

          if (error) {
            resolve(NextResponse.json({
              valid: false,
              error: stderr || error.message
            }));
          } else {
            resolve(NextResponse.json({
              valid: true,
              message: 'Configuration is valid'
            }));
          }
        });
      });
    } catch (fileError) {
      // ลบไฟล์ถ้าเกิดข้อผิดพลาด
      try {
        await fs.unlink(tempConfigFile);
      } catch {}

      return NextResponse.json(
        { valid: false, error: 'Failed to create temporary config file' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Validation error:', error);
    return NextResponse.json(
      { valid: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
} 