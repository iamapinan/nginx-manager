'use client';

import { usePathname } from 'next/navigation';
import { Navigation } from './Navigation';
import { AuthGuard } from './AuthGuard';

const authRoutes = ['/auth/login', '/auth/register'];

export function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuthRoute = authRoutes.includes(pathname);

  if (isAuthRoute) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-indigo-50/30">
        <div className="flex items-center justify-center min-h-screen px-4">
          {children}
        </div>
      </div>
    );
  }

  return (
    <AuthGuard>
      <div className="bg-gradient-to-br from-gray-50 via-blue-50/30 to-indigo-50/30 min-h-screen">
        {/* Navigation */}
        <Navigation />

        {/* Main Content */}
        <main className="container mx-auto px-6 py-6">
          <div className="relative">
            {children}
          </div>
        </main>

        {/* Footer */}
        <footer className="mt-16 border-t border-gray-200">
          <div className="container mx-auto px-6 py-4">
            <div className="flex items-center justify-between text-sm text-gray-500">
              <div>
                <span>Nginx Manager v2.0.2</span>
              </div>
              <div>
                <span>© 2024 by </span>
                <a href="https://iamapinan.com" target="_blank" rel="noopener noreferrer" className="hover:text-gray-700 transition-colors">
                  iamapinan
                </a>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </AuthGuard>
  );
} 