'use client';

import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Clock, Eye, ArrowUpRight } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { CATEGORY_COLORS } from '../../lib/api';

export default function BlogCard({ blog, variant = 'default', index = 0 }) {
  const imageUrl = blog.image || '';
  const timeAgo = formatDistanceToNow(new Date(blog.createdAt), { addSuffix: true });
  const categoryColor = CATEGORY_COLORS[blog.category] || 'bg-gray-500/10 text-gray-400 border-gray-500/20';

  if (variant === 'featured') {
    return (
      <motion.article
        initial={{ opacity: 0, y: 28 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, delay: index * 0.08 }}
        whileHover={{ y: -6 }}
        className="group relative h-[520px] overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--bg-card)] shadow-sm transition-all duration-300 hover:shadow-xl"
      >
        <Link href={`/blog/${blog._id}`} className="block h-full">
          <div className="absolute inset-0">
            <Image
              src={imageUrl}
              alt={blog.title}
              fill
              className="object-cover transition-transform duration-700 group-hover:scale-105"
              priority
              unoptimized
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/45 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-br from-black/10 via-transparent to-black/20" />
          </div>

          {blog.featured && (
            <div className="absolute left-4 top-4 z-10">
              <span className="inline-flex items-center rounded-full bg-[var(--accent)] px-3 py-1 text-xs font-semibold uppercase tracking-wider text-white shadow-sm">
                ★ Featured
              </span>
            </div>
          )}

          <div className="absolute bottom-0 left-0 right-0 z-10 p-6 md:p-7">
            <div className="mb-3 flex items-center gap-2">
              <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${categoryColor}`}>
                {blog.category}
              </span>
            </div>

            <h2 className="mb-3 max-w-2xl text-2xl font-bold leading-tight text-white transition-colors duration-300 group-hover:text-[var(--accent)] md:text-3xl">
              {blog.title}
            </h2>

            <p className="mb-5 max-w-2xl text-sm leading-relaxed text-white/72 line-clamp-2">
              {blog.excerpt}
            </p>

            <div className="flex items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-4 text-xs text-white/55">
                <span className="flex items-center gap-1.5">
                  <Clock size={12} />
                  {blog.readTime || 5} min read
                </span>
                <span className="flex items-center gap-1.5">
                  <Eye size={12} />
                  {(blog.views || 0).toLocaleString()}
                </span>
                <span>{timeAgo}</span>
              </div>

              <motion.div
                className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/10 backdrop-blur-sm transition-all duration-300 group-hover:border-transparent group-hover:bg-[var(--accent)]"
                whileHover={{ scale: 1.08 }}
              >
                <ArrowUpRight size={16} className="text-white" />
              </motion.div>
            </div>
          </div>
        </Link>
      </motion.article>
    );
  }

  if (variant === 'horizontal') {
    return (
      <motion.article
        initial={{ opacity: 0, x: -18 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.4, delay: index * 0.06 }}
        className="group rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-3 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg"
      >
        <Link href={`/blog/${blog._id}`} className="flex w-full gap-4">
          <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl">
            <Image
              src={imageUrl}
              alt={blog.title}
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-110"
              unoptimized
            />
          </div>

          <div className="min-w-0 flex-1">
            <span className={`mb-2 inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold ${categoryColor}`}>
              {blog.category}
            </span>

            <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-[var(--text-primary)] transition-colors group-hover:text-[var(--accent)]">
              {blog.title}
            </h3>

            <div className="mt-2 flex items-center gap-2 text-xs text-[var(--text-muted)]">
              <Clock size={11} />
              <span>{blog.readTime || 5} min</span>
              <span>·</span>
              <span>{timeAgo}</span>
            </div>
          </div>
        </Link>
      </motion.article>
    );
  }

  if (variant === 'compact') {
    return (
      <motion.article
        initial={{ opacity: 0, y: 18 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.4, delay: index * 0.05 }}
        className="group"
      >
        <Link href={`/blog/${blog._id}`} className="block">
          <div className="relative mb-3 h-44 overflow-hidden rounded-2xl">
            <Image
              src={imageUrl}
              alt={blog.title}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-105"
              unoptimized
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/35 to-transparent" />
            <span className={`absolute left-3 top-3 inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold backdrop-blur-sm ${categoryColor}`}>
              {blog.category}
            </span>
          </div>

          <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-[var(--text-primary)] transition-colors group-hover:text-[var(--accent)]">
            {blog.title}
          </h3>

          <div className="mt-1.5 flex items-center gap-2 text-xs text-[var(--text-muted)]">
            <Clock size={11} />
            <span>{blog.readTime || 5} min</span>
            <span>·</span>
            <span>{timeAgo}</span>
          </div>
        </Link>
      </motion.article>
    );
  }

  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ duration: 0.5, delay: index * 0.06 }}
      whileHover={{ y: -4 }}
      className="group overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--bg-card)] shadow-sm transition-all duration-300 hover:border-[var(--accent)]/25 hover:shadow-xl"
    >
      <Link href={`/blog/${blog._id}`} className="block">
        <div className="relative h-52 overflow-hidden">
          <Image
            src={imageUrl}
            alt={blog.title}
            fill
            className="object-cover transition-transform duration-700 group-hover:scale-105"
            unoptimized
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/22 to-transparent" />

          {blog.featured && (
            <div className="absolute right-3 top-3">
              <span className="inline-flex rounded-full bg-[var(--accent)] px-2.5 py-1 text-xs font-bold text-white shadow-sm">
                ★
              </span>
            </div>
          )}
        </div>

        <div className="p-5">
          <div className="mb-3 flex items-center justify-between gap-3">
            <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${categoryColor}`}>
              {blog.category}
            </span>
            <span className="text-xs text-[var(--text-muted)]">{timeAgo}</span>
          </div>

          <h3 className="mb-2 line-clamp-2 text-lg font-bold leading-snug text-[var(--text-primary)] transition-colors duration-200 group-hover:text-[var(--accent)]">
            {blog.title}
          </h3>

          <p className="mb-4 line-clamp-2 text-sm leading-relaxed text-[var(--text-muted)]">
            {blog.excerpt}
          </p>

          <div className="flex items-center justify-between border-t border-[var(--border)] pt-3">
            <div className="flex items-center gap-3 text-xs text-[var(--text-muted)]">
              <span className="flex items-center gap-1.5">
                <Clock size={12} />
                {blog.readTime || 5} min
              </span>
              <span className="flex items-center gap-1.5">
                <Eye size={12} />
                {(blog.views || 0).toLocaleString()}
              </span>
            </div>

            <span className="flex items-center gap-1 text-xs font-semibold text-[var(--accent)] opacity-0 transition-opacity group-hover:opacity-100">
              Read more
              <ArrowUpRight size={13} />
            </span>
          </div>
        </div>
      </Link>
    </motion.article>
  );
}