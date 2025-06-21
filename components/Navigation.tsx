'use client';

import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { NginxStatusMini } from '@/components/NginxStatus';
import { UserMenu } from '@/components/UserMenu';
import { Globe, Server, Shield, Users } from 'lucide-react';

export function Navigation() {
  const pathname = usePathname();
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await fetch('/api/auth/me');
      if (response.ok) {
        const data = await response.json();
        setCurrentUser(data.user);
      }
    } catch (error) {
      // Ignore error
    }
  };
  
  // ซ่อนแถบนำทางในหน้า auth
  if (pathname?.startsWith('/auth')) {
    return null;
  }

  return (
    <nav className="relative bg-gradient-to-r from-white/95 via-blue-50/90 to-indigo-50/95 backdrop-blur-md border-b border-gray-200/30 shadow-sm sticky top-0 z-50">
      <div className="container mx-auto px-6">
        <div className="flex items-center justify-between">
          {/* App Title */}
          <div className="flex items-center gap-6 py-4">
            <div>
              <h1 className="text-xl font-bold text-gray-900">Nginx Manager</h1>
              <p className="text-xs text-gray-500">Proxy Management System</p>
            </div>
            
            {/* Nginx Status Mini */}
            <div className="flex items-center gap-2 px-3 py-2 bg-gray-50/80 rounded-lg border border-gray-200/50">
              <NginxStatusMini />
            </div>
          </div>

          {/* Navigation Links */}
          <div className="flex items-center gap-1">
            <a href="/" className="group relative flex items-center gap-2 px-4 py-3 text-sm font-medium text-gray-700 hover:text-blue-600 transition-all duration-300">
              <div className="p-1 bg-blue-100 group-hover:bg-blue-200 rounded-lg transition-colors">
                <Globe className="w-4 h-4 text-blue-600" />
              </div>
              <span>Proxy Hosts</span>
              <div className="absolute bottom-0 left-1/2 w-0 h-0.5 bg-gradient-to-r from-blue-500 to-indigo-500 group-hover:w-full group-hover:left-0 transition-all duration-300"></div>
            </a>
            
            <a href="/upstreams" className="group relative flex items-center gap-2 px-4 py-3 text-sm font-medium text-gray-700 hover:text-blue-600 transition-all duration-300">
              <div className="p-1 bg-green-100 group-hover:bg-green-200 rounded-lg transition-colors">
                <Server className="w-4 h-4 text-green-600" />
              </div>
              <span>Upstreams</span>
              <div className="absolute bottom-0 left-1/2 w-0 h-0.5 bg-gradient-to-r from-green-500 to-emerald-500 group-hover:w-full group-hover:left-0 transition-all duration-300"></div>
            </a>
            
            <a href="/certificates" className="group relative flex items-center gap-2 px-4 py-3 text-sm font-medium text-gray-700 hover:text-blue-600 transition-all duration-300">
              <div className="p-1 bg-yellow-100 group-hover:bg-yellow-200 rounded-lg transition-colors">
                <Shield className="w-4 h-4 text-yellow-600" />
              </div>
              <span>SSL Certificates</span>
              <div className="absolute bottom-0 left-1/2 w-0 h-0.5 bg-gradient-to-r from-yellow-500 to-amber-500 group-hover:w-full group-hover:left-0 transition-all duration-300"></div>
            </a>
            
            {currentUser?.role === 'admin' && (
              <a href="/users" className="group relative flex items-center gap-2 px-4 py-3 text-sm font-medium text-gray-700 hover:text-blue-600 transition-all duration-300">
                <div className="p-1 bg-indigo-100 group-hover:bg-indigo-200 rounded-lg transition-colors">
                  <Users className="w-4 h-4 text-indigo-600" />
                </div>
                <span>Users</span>
                <div className="absolute bottom-0 left-1/2 w-0 h-0.5 bg-gradient-to-r from-indigo-500 to-purple-500 group-hover:w-full group-hover:left-0 transition-all duration-300"></div>
              </a>
            )}
            
            <a href="/config" className="group relative flex items-center gap-2 px-4 py-3 text-sm font-medium text-gray-700 hover:text-blue-600 transition-all duration-300">
              <div className="p-1 bg-purple-100 group-hover:bg-purple-200 rounded-lg transition-colors">
                <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <span>Nginx Config</span>
              <div className="absolute bottom-0 left-1/2 w-0 h-0.5 bg-gradient-to-r from-purple-500 to-violet-500 group-hover:w-full group-hover:left-0 transition-all duration-300"></div>
            </a>
            
            {/* User Menu */}
            <div className="ml-4 pl-4 border-l border-gray-200">
              <UserMenu />
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}