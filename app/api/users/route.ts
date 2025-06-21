import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';
import { getCurrentUser } from '@/lib/auth';
import bcrypt from 'bcryptjs';

export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    
    if (!currentUser || currentUser.role !== 'admin') {
      return NextResponse.json(
        { error: 'ไม่มีสิทธิ์เข้าถึง' },
        { status: 403 }
      );
    }

    const database = getDatabase();
    const users = await database.getAllUsers();
    
    // ลบ password_hash ออกจากข้อมูลที่ส่งกลับ
    const safeUsers = users.map(user => ({
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      is_active: user.is_active,
      last_login: user.last_login,
      created_at: user.created_at,
      updated_at: user.updated_at
    }));

    return NextResponse.json({ users: safeUsers });
  } catch (error) {
    console.error('Get users error:', error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการดึงข้อมูลผู้ใช้' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    
    if (!currentUser || currentUser.role !== 'admin') {
      return NextResponse.json(
        { error: 'ไม่มีสิทธิ์เข้าถึง' },
        { status: 403 }
      );
    }

    const { username, email, password, role = 'user', is_active = true } = await request.json();
    
    if (!username || !email || !password) {
      return NextResponse.json(
        { error: 'กรุณากรอกข้อมูลให้ครบถ้วน' },
        { status: 400 }
      );
    }

    // ตรวจสอบว่า username ซ้ำหรือไม่
    const database = getDatabase();
    const existingUser = await database.getUserByUsername(username);
    
    if (existingUser) {
      return NextResponse.json(
        { error: 'ชื่อผู้ใช้นี้ถูกใช้งานแล้ว' },
        { status: 400 }
      );
    }

    // เข้ารหัสรหัสผ่าน
    const password_hash = await bcrypt.hash(password, 10);
    
    const userId = await database.createUser({
      username,
      email,
      password_hash,
      role: role as 'admin' | 'user',
      is_active
    });

    return NextResponse.json({
      message: 'สร้างผู้ใช้สำเร็จ',
      user: {
        id: userId,
        username,
        email,
        role,
        is_active
      }
    });
  } catch (error) {
    console.error('Create user error:', error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการสร้างผู้ใช้' },
      { status: 500 }
    );
  }
} 