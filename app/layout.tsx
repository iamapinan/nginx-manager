import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Navigation } from '@/components/Navigation';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Nginx Manager',
  description: 'Manage proxy hosts and SSL certificates easily',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-indigo-50/30">
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
                  <span>Nginx Manager v2.0.1</span>
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
      </body>
    </html>
  );
}