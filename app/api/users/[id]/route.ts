import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';
import { getCurrentUser } from '@/lib/auth';
import bcrypt from 'bcryptjs';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const currentUser = await getCurrentUser();
    
    if (!currentUser || currentUser.role !== 'admin') {
      return NextResponse.json(
        { error: 'ไม่มีสิทธิ์เข้าถึง' },
        { status: 403 }
      );
    }

    const userId = parseInt(params.id);
    const database = getDatabase();
    const user = await database.getUserById(userId);
    
    if (!user) {
      return NextResponse.json(
        { error: 'ไม่พบผู้ใช้' },
        { status: 404 }
      );
    }

    // ลบ password_hash ออกจากข้อมูลที่ส่งกลับ
    const safeUser = {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      is_active: user.is_active,
      last_login: user.last_login,
      created_at: user.created_at,
      updated_at: user.updated_at
    };

    return NextResponse.json({ user: safeUser });
  } catch (error) {
    console.error('Get user error:', error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการดึงข้อมูลผู้ใช้' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const currentUser = await getCurrentUser();
    
    if (!currentUser || currentUser.role !== 'admin') {
      return NextResponse.json(
        { error: 'ไม่มีสิทธิ์เข้าถึง' },
        { status: 403 }
      );
    }

    const userId = parseInt(params.id);
    const { username, email, password, role, is_active } = await request.json();
    
    const database = getDatabase();
    const existingUser = await database.getUserById(userId);
    
    if (!existingUser) {
      return NextResponse.json(
        { error: 'ไม่พบผู้ใช้' },
        { status: 404 }
      );
    }

    // ตรวจสอบว่า username ซ้ำหรือไม่ (ยกเว้นตัวเอง)
    if (username && username !== existingUser.username) {
      const duplicateUser = await database.getUserByUsername(username);
      if (duplicateUser) {
        return NextResponse.json(
          { error: 'ชื่อผู้ใช้นี้ถูกใช้งานแล้ว' },
          { status: 400 }
        );
      }
    }

    // เตรียมข้อมูลสำหรับอัพเดท
    const updateData: any = {
      username: username || existingUser.username,
      email: email || existingUser.email,
      role: role || existingUser.role,
      is_active: is_active !== undefined ? is_active : existingUser.is_active
    };

    // ถ้ามีการเปลี่ยนรหัสผ่าน
    if (password) {
      updateData.password_hash = await bcrypt.hash(password, 10);
    } else {
      updateData.password_hash = existingUser.password_hash;
    }

    await database.updateUser(userId, updateData);

    return NextResponse.json({
      message: 'อัพเดทข้อมูลผู้ใช้สำเร็จ',
      user: {
        id: userId,
        username: updateData.username,
        email: updateData.email,
        role: updateData.role,
        is_active: updateData.is_active
      }
    });
  } catch (error) {
    console.error('Update user error:', error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการอัพเดทข้อมูลผู้ใช้' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const currentUser = await getCurrentUser();
    
    if (!currentUser || currentUser.role !== 'admin') {
      return NextResponse.json(
        { error: 'ไม่มีสิทธิ์เข้าถึง' },
        { status: 403 }
      );
    }

    const userId = parseInt(params.id);
    
    // ไม่ให้ลบตัวเอง
    if (currentUser.id === userId) {
      return NextResponse.json(
        { error: 'ไม่สามารถลบบัญชีตัวเองได้' },
        { status: 400 }
      );
    }

    const database = getDatabase();
    const user = await database.getUserById(userId);
    
    if (!user) {
      return NextResponse.json(
        { error: 'ไม่พบผู้ใช้' },
        { status: 404 }
      );
    }

    await database.deleteUser(userId);

    return NextResponse.json({
      message: 'ลบผู้ใช้สำเร็จ'
    });
  } catch (error) {
    console.error('Delete user error:', error);
    return NextResponse.json(
      { error: 'เกิดข้อผิดพลาดในการลบผู้ใช้' },
      { status: 500 }
    );
  }
} 