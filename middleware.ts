import { NextRequest, NextResponse } from 'next/server';

// Protected API routes that require authentication
const protectedApiRoutes = [
  '/api/sites',
  '/api/upstreams',
  '/api/certificates',
  '/api/config',
  '/api/nginx',
  '/api/redirections',
  '/api/users'
];

// Public API routes that don't require authentication
const publicApiRoutes = [
  '/api/auth'
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Only process API routes - let client-side handle page routing
  if (!pathname.startsWith('/api/')) {
    return NextResponse.next();
  }
  
  // Allow public API routes
  if (publicApiRoutes.some(route => pathname.startsWith(route))) {
    return NextResponse.next();
  }
  
  // Check if API route is protected
  const isProtectedApiRoute = protectedApiRoutes.some(route => 
    pathname.startsWith(route)
  );
  
  if (!isProtectedApiRoute) {
    return NextResponse.next();
  }
  
  // Check for session token for protected API routes
  const sessionToken = request.cookies.get('session')?.value;
  
  if (!sessionToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: ['/api/:path*'],
}; 