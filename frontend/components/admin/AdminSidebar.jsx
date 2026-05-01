'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { LayoutDashboard, FilePlus, LogOut, Zap, ExternalLink, ChevronRight } from 'lucide-react';
import Cookies from 'js-cookie';
import toast from 'react-hot-toast';
import { Bot } from 'lucide-react';

export default function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const logout = () => {
    Cookies.remove('admin_token');
    toast.success('Logged out');
    router.push('/admin/login');
  };

  const navItems = [
  { href: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/admin/create', icon: FilePlus, label: 'New Post' },
  { href: '/admin/scraped', icon: Bot, label: 'Scraped News' }, // ✅ THIS
];

  return (
    <aside className="w-64 shrink-0 hidden lg:flex flex-col bg-[var(--bg-card)] border-r border-[var(--border)] min-h-screen sticky top-0">
      <div className="p-6 border-b border-[var(--border)]">
        <Link href="/admin/dashboard" className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-[var(--accent)] flex items-center justify-center">
            <Zap size={18} className="text-white fill-white" />
          </div>
          <div>
            <span className="font-display font-black text-lg text-[var(--text-primary)]">
              Groks<span className="text-[var(--accent)]">Blog</span>
            </span>
            <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">Admin Panel</p>
          </div>
        </Link>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {navItems.map(({ href, icon: Icon, label }) => {
          const active = pathname === href || (href !== '/admin/dashboard' && pathname.startsWith(href));
          return (
            <Link key={href} href={href}>
              <motion.div
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all relative ${
                  active
                    ? 'text-[var(--accent)] bg-[var(--accent)]/10'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]'
                }`}
                whileHover={{ x: 2 }}
              >
                {active && (
                  <motion.div
                    layoutId="sidebar-active"
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-[var(--accent)] rounded-full"
                  />
                )}
                <Icon size={17} />
                {label}
                {active && <ChevronRight size={14} className="ml-auto" />}
              </motion.div>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-[var(--border)] space-y-2">
        <Link href="/" target="_blank">
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-colors">
            <ExternalLink size={16} /> View Site
          </div>
        </Link>
        <button onClick={logout} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-red-400 hover:bg-red-500/10 transition-colors">
          <LogOut size={16} /> Logout
        </button>
      </div>
    </aside>
  );
}
