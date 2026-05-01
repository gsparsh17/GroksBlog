'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Zap, Lock, User, ArrowRight, Shield } from 'lucide-react';
import Cookies from 'js-cookie';
import { authApi } from '../../../lib/api';
import toast from 'react-hot-toast';

export default function AdminLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (Cookies.get('admin_token')) router.push('/admin/dashboard');
  }, [router]);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!username || !password) { toast.error('Please fill in all fields'); return; }
    setLoading(true);
    try {
      const res = await authApi.login(username, password);
      console.log('Login response:', res.data);
      Cookies.set('admin_token', res.data.token, { expires: 1, sameSite: 'lax' });
      toast.success('Welcome back, Admin!');
      router.push('/admin/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background glows */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          className="absolute -top-40 -right-40 w-[600px] h-[600px] rounded-full bg-[var(--accent)]/8 blur-[120px]"
          animate={{ scale: [1, 1.15, 1], opacity: [0.5, 0.8, 0.5] }}
          transition={{ repeat: Infinity, duration: 8, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute -bottom-40 -left-40 w-[500px] h-[500px] rounded-full bg-blue-500/8 blur-[120px]"
          animate={{ scale: [1.15, 1, 1.15], opacity: [0.5, 0.8, 0.5] }}
          transition={{ repeat: Infinity, duration: 8, ease: 'easeInOut' }}
        />
        <div className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: 'linear-gradient(var(--text-primary) 1px, transparent 1px), linear-gradient(90deg, var(--text-primary) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, type: 'spring', stiffness: 100 }}
        className="relative w-full max-w-md"
      >
        <div className="glass rounded-3xl border border-[var(--border)] p-8 shadow-2xl backdrop-blur-xl bg-[var(--bg-card)]/80">
          {/* Logo */}
          <div className="text-center mb-8">
            <motion.div
              className="w-16 h-16 rounded-2xl bg-[var(--accent)] flex items-center justify-center mx-auto mb-4"
              whileHover={{ rotate: 5, scale: 1.05 }}
              animate={{ boxShadow: ['0 0 20px rgba(249,115,22,0.3)', '0 0 40px rgba(249,115,22,0.6)', '0 0 20px rgba(249,115,22,0.3)'] }}
              transition={{ repeat: Infinity, duration: 3 }}
            >
              <Zap size={28} className="text-white fill-white" />
            </motion.div>
            <h1 className="font-display font-black text-2xl text-[var(--text-primary)]">
              News<span className="text-[var(--accent)]">Forge</span>
            </h1>
            <p className="text-sm text-[var(--text-muted)] mt-1">Admin Control Center</p>
          </div>

          <div className="flex items-center gap-2 bg-[var(--accent)]/10 border border-[var(--accent)]/20 rounded-xl px-4 py-2.5 mb-6">
            <Shield size={15} className="text-[var(--accent)]" />
            <span className="text-xs text-[var(--accent)] font-semibold">Secure Admin Access Only</span>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1.5 block">Username</label>
              <div className="relative">
                <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                <input type="text" value={username} onChange={e => setUsername(e.target.value)} placeholder="admin"
                  className="w-full pl-10 pr-4 py-3 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl text-[var(--text-primary)] placeholder-[var(--text-muted)] text-sm outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/15 transition-all"
                  autoComplete="username" />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1.5 block">Password</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                <input type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••"
                  className="w-full pl-10 pr-11 py-3 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl text-[var(--text-primary)] placeholder-[var(--text-muted)] text-sm outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/15 transition-all"
                  autoComplete="current-password" />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <motion.button type="submit" disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-[var(--accent)] hover:bg-[var(--accent-hover)] disabled:opacity-60 text-white font-semibold py-3.5 rounded-xl transition-colors duration-200 mt-2"
              whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}>
              {loading
                ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                : <><span>Enter Dashboard</span> <ArrowRight size={16} /></>
              }
            </motion.button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-xs text-[var(--text-muted)]">
              Default: <code className="bg-[var(--bg-secondary)] px-1.5 py-0.5 rounded text-[var(--accent)]">admin</code> / <code className="bg-[var(--bg-secondary)] px-1.5 py-0.5 rounded text-[var(--accent)]">admin123</code>
            </p>
          </div>
        </div>

        <p className="text-center text-sm text-[var(--text-muted)] mt-6">
          ← <a href="/" className="text-[var(--accent)] hover:underline">Back to NewsForge</a>
        </p>
      </motion.div>
    </div>
  );
}
