import type { Metadata } from 'next';
import '../globals.css';

export const metadata: Metadata = {
  title: 'เข้าสู่ระบบ - Nginx Manager',
  description: 'เข้าสู่ระบบเพื่อจัดการ Proxy',
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="bg-gradient-to-br from-gray-50 via-blue-50/30 to-indigo-50/30 w-full max-w-md mx-auto">
      {children}
    </div>
  );
} 