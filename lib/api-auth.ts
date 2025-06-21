import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, AuthUser } from './auth';

export interface AuthenticatedRequest extends NextRequest {
  user?: AuthUser;
}

export async function withAuth<T>(
  handler: (request: AuthenticatedRequest) => Promise<T>,
  request: NextRequest
): Promise<T | NextResponse> {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json(
        { error: 'ไม่ได้รับอนุญาต - กรุณาเข้าสู่ระบบ' },
        { status: 401 }
      );
    }
    
    // Attach user to request
    (request as AuthenticatedRequest).user = user;
    
    return await handler(request as AuthenticatedRequest);
    
  } catch (error) {
    console.error('Authentication error:', error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการตรวจสอบสิทธิ์' },
      { status: 500 }
    );
  }
}

export async function withAdminAuth<T>(
  handler: (request: AuthenticatedRequest) => Promise<T>,
  request: NextRequest
): Promise<T | NextResponse> {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json(
        { error: 'ไม่ได้รับอนุญาต - กรุณาเข้าสู่ระบบ' },
        { status: 401 }
      );
    }
    
    if (user.role !== 'admin') {
      return NextResponse.json(
        { error: 'ไม่มีสิทธิ์เข้าถึง - ต้องเป็น Admin' },
        { status: 403 }
      );
    }
    
    // Attach user to request
    (request as AuthenticatedRequest).user = user;
    
    return await handler(request as AuthenticatedRequest);
    
  } catch (error) {
    console.error('Admin authentication error:', error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการตรวจสอบสิทธิ์' },
      { status: 500 }
    );
  }
} 