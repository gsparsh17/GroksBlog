'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import {
  FilePlus,
  Pencil,
  Trash2,
  Eye,
  Search,
  AlertTriangle,
  LogOut,
  FileText,
  Star,
  BarChart2,
  TrendingUp,
  Sparkles,
  CalendarDays,
} from 'lucide-react';
import AdminSidebar from '../../../components/admin/AdminSidebar';
import { blogApi, CATEGORY_COLORS, getImageUrl } from '../../../lib/api';
import toast from 'react-hot-toast';
import Cookies from 'js-cookie';
import { useRouter } from 'next/navigation';

export default function AdminDashboard() {
  const router = useRouter();
  const [blogs, setBlogs] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deleteId, setDeleteId] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchData = async () => {
    try {
      const [blogsRes, statsRes] = await Promise.all([
        blogApi.getAll({ limit: 50 }),
        blogApi.getStats(),
      ]);
      setBlogs(blogsRes.data.blogs);
      setStats(statsRes.data.stats);
    } catch (err) {
      if (err.response?.status === 401) router.push('/admin/login');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDelete = async (id) => {
    setDeleting(true);
    try {
      await blogApi.delete(id);
      toast.success('Post deleted');
      setDeleteId(null);
      fetchData();
    } catch {
      toast.error('Delete failed');
    } finally {
      setDeleting(false);
    }
  };

  const logout = () => {
    Cookies.remove('admin_token');
    router.push('/admin/login');
  };

  const filtered = blogs.filter(
    (b) =>
      b.title.toLowerCase().includes(search.toLowerCase()) ||
      b.category.toLowerCase().includes(search.toLowerCase())
  );

  const statCards = [
    {
      label: 'Total Posts',
      value: stats?.total || 0,
      icon: FileText,
      tone: 'text-blue-400',
      bg: 'bg-blue-500/10',
      border: 'border-blue-500/20',
    },
    {
      label: 'Featured',
      value: stats?.featured || 0,
      icon: Star,
      tone: 'text-amber-400',
      bg: 'bg-amber-500/10',
      border: 'border-amber-500/20',
    },
    {
      label: 'Total Views',
      value: (stats?.totalViews || 0).toLocaleString(),
      icon: Eye,
      tone: 'text-emerald-400',
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/20',
    },
    {
      label: 'Categories',
      value: stats?.byCategory?.length || 0,
      icon: BarChart2,
      tone: 'text-purple-400',
      bg: 'bg-purple-500/10',
      border: 'border-purple-500/20',
    },
  ];

  return (
    <div className="flex min-h-screen bg-[var(--bg-primary)]">
      <AdminSidebar />

      <div className="flex-1 overflow-auto">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="mb-6">
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] overflow-hidden">
              <div className="border-b border-[var(--border)] p-6">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <div className="mb-3 flex flex-wrap items-center gap-2">
                      <span className="rounded-full border border-[var(--border)] bg-[var(--bg-secondary)] px-2.5 py-1 text-xs font-medium text-[var(--text-muted)]">
                        Admin Panel
                      </span>
                      <span className="rounded-full border border-cyan-500/20 bg-cyan-500/10 px-2.5 py-1 text-xs font-medium text-cyan-400">
                        Content Workspace
                      </span>
                    </div>

                    <h1 className="text-2xl font-bold text-[var(--text-primary)] sm:text-3xl">
                      Manage Published Posts
                    </h1>

                    <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--text-muted)]">
                      Review, search, edit, and maintain your published articles from one clean workspace.
                    </p>
                  </div>

                  <div className="flex flex-col gap-3 sm:flex-row">
                    <Link
                      href="/admin/create"
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-[var(--accent-hover)]"
                    >
                      <FilePlus size={16} />
                      <span>Create New Post</span>
                    </Link>

                    <button
                      onClick={logout}
                      className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-400 transition-colors hover:bg-red-500/15"
                    >
                      <LogOut size={16} />
                      <span>Logout</span>
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4 lg:p-6">
                {statCards.map(({ label, value, icon: Icon, tone, bg, border }, i) => (
                  <motion.div
                    key={label}
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.06 }}
                    className={`rounded-xl border ${border} bg-[var(--bg-primary)] p-4`}
                  >
                    <div className="mb-3 flex items-center justify-between">
                      <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${bg}`}>
                        <Icon size={17} className={tone} />
                      </div>
                      <span className="text-xs text-[var(--text-muted)]">{label}</span>
                    </div>

                    <div className="text-xl font-bold text-[var(--text-primary)] sm:text-2xl">
                      {loading ? '—' : value}
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] overflow-hidden">
            <div className="border-b border-[var(--border)] p-5 sm:p-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0">
                  <div className="mb-2 flex items-center gap-2">
                    <TrendingUp size={17} className="text-[var(--accent)]" />
                    <h2 className="text-lg font-semibold text-[var(--text-primary)]">
                      All Posts
                    </h2>
                    <span className="rounded-full border border-[var(--border)] bg-[var(--bg-secondary)] px-2 py-0.5 text-xs text-[var(--text-muted)]">
                      {filtered.length}
                    </span>
                  </div>

                  <p className="text-sm text-[var(--text-muted)]">
                    Browse your latest content, open live posts, edit details, or remove outdated entries.
                  </p>
                </div>

                <div className="flex w-full flex-col gap-3 sm:flex-row lg:w-auto">
                  <div className="relative w-full sm:w-80">
                    <Search
                      size={16}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
                    />
                    <input
                      type="text"
                      placeholder="Search by title or category..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] py-3 pl-10 pr-4 text-sm text-[var(--text-primary)] outline-none transition-colors placeholder:text-[var(--text-muted)] focus:border-[var(--accent)]"
                    />
                  </div>
                </div>
              </div>
            </div>

            {loading ? (
              <div className="space-y-4 p-5 sm:p-6">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-28 animate-pulse rounded-2xl border border-[var(--border)] bg-[var(--bg-secondary)]"
                  />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="px-6 py-20 text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--bg-secondary)]">
                  <FileText size={28} className="text-[var(--text-muted)] opacity-60" />
                </div>
                <h3 className="mb-2 text-lg font-semibold text-[var(--text-primary)]">
                  No posts found
                </h3>
                <p className="mx-auto max-w-md text-sm text-[var(--text-muted)]">
                  Try changing your search term or create a new article to populate this workspace.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-[var(--border)]">
                {filtered.map((blog, i) => (
                  <motion.div
                    key={blog._id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className="group p-5 transition-colors hover:bg-[var(--bg-secondary)]/60 sm:p-6"
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
                      <div className="relative h-44 w-full overflow-hidden rounded-2xl bg-[var(--bg-secondary)] sm:h-52 lg:h-28 lg:w-44 lg:shrink-0">
                        {blog.image ? (
                          <Image
                            src={getImageUrl(blog.image)}
                            alt={blog.title}
                            fill
                            className="object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center">
                            <FileText size={28} className="text-[var(--text-muted)] opacity-40" />
                          </div>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="mb-3 flex flex-wrap items-center gap-2">
                          <span
                            className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${
                              CATEGORY_COLORS[blog.category] || CATEGORY_COLORS.World
                            }`}
                          >
                            {blog.category}
                          </span>

                          {blog.featured && (
                            <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-400">
                              <span className="inline-flex items-center gap-1">
                                <Sparkles size={12} />
                                Featured
                              </span>
                            </span>
                          )}
                        </div>

                        <h3 className="line-clamp-2 text-lg font-semibold leading-7 text-[var(--text-primary)]">
                          {blog.title}
                        </h3>

                        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-[var(--text-muted)]">
                          <span className="inline-flex items-center gap-1.5">
                            <Eye size={14} />
                            {blog.views?.toLocaleString() || 0} views
                          </span>

                          <span className="inline-flex items-center gap-1.5">
                            <CalendarDays size={14} />
                            {formatDistanceToNow(new Date(blog.createdAt), { addSuffix: true })}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 lg:opacity-0 lg:transition-opacity lg:group-hover:opacity-100">
                        <Link
                          href={`/blog/${blog._id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--bg-primary)] text-[var(--text-muted)] transition-colors hover:border-[var(--accent)]/30 hover:bg-[var(--accent)]/10 hover:text-[var(--accent)]"
                        >
                          <Eye size={16} />
                        </Link>

                        <Link
                          href={`/admin/edit/${blog._id}`}
                          className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--bg-primary)] text-[var(--text-muted)] transition-colors hover:border-blue-500/30 hover:bg-blue-500/10 hover:text-blue-400"
                        >
                          <Pencil size={16} />
                        </Link>

                        <button
                          onClick={() => setDeleteId(blog._id)}
                          className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--bg-primary)] text-[var(--text-muted)] transition-colors hover:border-red-500/30 hover:bg-red-500/10 hover:text-red-400"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {deleteId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
            onClick={() => !deleting && setDeleteId(null)}
          >
            <motion.div
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6 shadow-2xl"
            >
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-red-500/10">
                <AlertTriangle size={22} className="text-red-400" />
              </div>

              <h3 className="mb-2 text-xl font-bold text-[var(--text-primary)]">
                Delete Post?
              </h3>

              <p className="mb-6 text-sm leading-6 text-[var(--text-muted)]">
                This action cannot be undone. The selected post will be permanently removed from your platform.
              </p>

              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteId(null)}
                  disabled={deleting}
                  className="flex-1 rounded-xl border border-[var(--border)] bg-[var(--bg-primary)] py-3 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-secondary)] disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  onClick={() => handleDelete(deleteId)}
                  disabled={deleting}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-red-500 py-3 text-sm font-semibold text-white transition-colors hover:bg-red-600 disabled:opacity-50"
                >
                  {deleting && (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  )}
                  {deleting ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}