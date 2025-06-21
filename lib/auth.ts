import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { cookies } from 'next/headers';
import { getDatabase, User, Session } from './database';

export interface AuthUser {
  id: number;
  username: string;
  email: string;
  role: 'admin' | 'user';
}

// Generate secure session token
export function generateSessionToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

// Hash password
export async function hashPassword(password: string): Promise<string> {
  return await bcrypt.hash(password, 10);
}

// Verify password
export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return await bcrypt.compare(password, hashedPassword);
}

// Create session (for server components)
export async function createSession(userId: number): Promise<string> {
  const db = getDatabase();
  const sessionToken = generateSessionToken();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // 7 days
  
  await db.createSession(userId, sessionToken, expiresAt.toISOString());
  
  // Set cookie (only for server components)
  cookies().set('session', sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    expires: expiresAt,
    path: '/'
  });
  
  return sessionToken;
}

// Create session without setting cookie (for API routes)
export async function createSessionToken(userId: number): Promise<{ token: string; expiresAt: Date }> {
  const db = getDatabase();
  const sessionToken = generateSessionToken();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // 7 days
  
  await db.createSession(userId, sessionToken, expiresAt.toISOString());
  
  return { token: sessionToken, expiresAt };
}

// Get current user from session
export async function getCurrentUser(): Promise<AuthUser | null> {
  try {
    const db = getDatabase();
    const sessionToken = cookies().get('session')?.value;
    
    if (!sessionToken) {
      return null;
    }
    
    const session = await db.getSessionByToken(sessionToken);
    if (!session) {
      return null;
    }
    
    const user = await db.getUserById(session.user_id);
    if (!user) {
      return null;
    }
    
    return {
      id: user.id!,
      username: user.username,
      email: user.email,
      role: user.role
    };
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
}

// Authenticate user
export async function authenticateUser(username: string, password: string): Promise<AuthUser | null> {
  try {
    const db = getDatabase();
    const user = await db.getUserByUsername(username);
    if (!user) {
      return null;
    }
    
    const isValid = await verifyPassword(password, user.password_hash);
    if (!isValid) {
      return null;
    }
    
    // Update last login
    await db.updateUserLastLogin(user.id!);
    
    return {
      id: user.id!,
      username: user.username,
      email: user.email,
      role: user.role
    };
  } catch (error) {
    console.error('Error authenticating user:', error);
    return null;
  }
}

// Logout user
export async function logoutUser(): Promise<void> {
  try {
    const db = getDatabase();
    const sessionToken = cookies().get('session')?.value;
    
    if (sessionToken) {
      await db.deleteSession(sessionToken);
    }
    
    // Clear cookie
    cookies().delete('session');
  } catch (error) {
    console.error('Error logging out user:', error);
  }
}

// Check if user is admin
export async function isAdmin(): Promise<boolean> {
  const user = await getCurrentUser();
  return user?.role === 'admin';
}

// Cleanup expired sessions
export async function cleanupExpiredSessions(): Promise<void> {
  try {
    const db = getDatabase();
    await db.deleteExpiredSessions();
  } catch (error) {
    console.error('Error cleaning up expired sessions:', error);
  }
} 