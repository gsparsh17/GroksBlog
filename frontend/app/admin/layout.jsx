'use client';
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import Cookies from 'js-cookie';
import { authApi } from '../../lib/api';

export default function AdminLayout({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (pathname === '/admin/login') { setChecking(false); return; }
    const verify = async () => {
      const token = Cookies.get('admin_token');
      if (!token) { router.push('/admin/login'); return; }
      try {
        await authApi.verify();
        setChecking(false);
      } catch {
        Cookies.remove('admin_token');
        router.push('/admin/login');
      }
    };
    verify();
  }, [pathname, router]);

  if (checking && pathname !== '/admin/login') {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center">
        <motion.div
          className="rounded-full border-[var(--accent)] border-t-transparent"
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }}
          style={{ width: 40, height: 40, border: '3px solid var(--accent)', borderTopColor: 'transparent' }}
        />
      </div>
    );
  }

  return <>{children}</>;
}
