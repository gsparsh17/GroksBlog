'use client';

import { useState, useEffect, useCallback, Suspense, useMemo } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { TrendingUp, Clock, ArrowRight, Flame, Zap } from 'lucide-react';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import BlogCard from '../components/blog/BlogCard';
import CategoryTabs from '../components/blog/CategoryTabs';
import { CardSkeleton } from '../components/ui/Skeletons';
import { blogApi, getImageUrl } from '../lib/api';
import { formatDistanceToNow } from 'date-fns';

const LOCAL_FALLBACK_IMAGE = '/images/fallback-blog.jpg';

function SafeHeroImage({ blog }) {
  const primarySrc = useMemo(() => getImageUrl(blog?.image) || LOCAL_FALLBACK_IMAGE, [blog?.image]);
  const [imgSrc, setImgSrc] = useState(primarySrc);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setImgSrc(primarySrc);
    setFailed(false);
  }, [primarySrc]);

  return (
    <Image
      src={failed ? LOCAL_FALLBACK_IMAGE : imgSrc}
      alt={blog?.title || 'Featured story'}
      fill
      priority
      className="object-cover"
      sizes="100vw"
      onError={() => {
        if (!failed) {
          setImgSrc(LOCAL_FALLBACK_IMAGE);
          setFailed(true);
        }
      }}
    />
  );
}

function SafeThumbImage({ blog }) {
  const primarySrc = useMemo(() => getImageUrl(blog?.image) || LOCAL_FALLBACK_IMAGE, [blog?.image]);
  const [imgSrc, setImgSrc] = useState(primarySrc);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setImgSrc(primarySrc);
    setFailed(false);
  }, [primarySrc]);

  return (
    <Image
      src={failed ? LOCAL_FALLBACK_IMAGE : imgSrc}
      alt={blog?.title || 'Story image'}
      fill
      className="object-cover transition-transform duration-500 group-hover:scale-105"
      sizes="(max-width: 640px) 112px, 144px"
      onError={() => {
        if (!failed) {
          setImgSrc(LOCAL_FALLBACK_IMAGE);
          setFailed(true);
        }
      }}
    />
  );
}

function HomeContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const shouldReduceMotion = useReducedMotion();

  const category = searchParams.get('category') || 'All';
  const search = searchParams.get('search') || '';

  const [blogs, setBlogs] = useState([]);
  const [featured, setFeatured] = useState(null);
  const [trending, setTrending] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const fadeUp = shouldReduceMotion
    ? {}
    : {
        initial: { opacity: 0, y: 18 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: 10 },
      };

  const fadeOnly = shouldReduceMotion
    ? {}
    : {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
      };

  const buildQueryString = useCallback(
    (updates) => {
      const params = new URLSearchParams(searchParams.toString());

      Object.entries(updates).forEach(([key, value]) => {
        if (!value || !String(value).trim() || value === 'All') {
          params.delete(key);
        } else {
          params.set(key, String(value));
        }
      });

      return params.toString();
    },
    [searchParams]
  );

  const fetchBlogs = useCallback(
    async (cat, pg, reset = false) => {
      if (pg === 1) setLoading(true);
      else setLoadingMore(true);

      try {
        const params = { page: pg, limit: 9 };

        if (cat !== 'All') params.category = cat;
        if (search.trim()) params.search = search.trim();

        const res = await blogApi.getAll(params);
        const newBlogs = res?.data?.blogs || [];
        const totalPages = res?.data?.pagination?.pages || 1;

        if (reset || pg === 1) {
          setBlogs(newBlogs);

          if (pg === 1 && cat === 'All' && !search.trim()) {
            const featuredBlog = newBlogs.find((b) => b.featured) || newBlogs[0] || null;
            setFeatured(featuredBlog);
          } else {
            setFeatured(null);
          }
        } else {
          setBlogs((prev) => [...prev, ...newBlogs]);
        }

        setHasMore(pg < totalPages);
      } catch (err) {
        console.error('Failed to fetch blogs:', err);
        if (pg === 1) {
          setBlogs([]);
          setFeatured(null);
        }
        setHasMore(false);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [search]
  );

  const fetchTrending = useCallback(async () => {
    try {
      const res = await blogApi.getAll({ limit: 4 });
      setTrending((res?.data?.blogs || []).slice(0, 4));
    } catch (err) {
      console.error('Failed to fetch trending blogs:', err);
      setTrending([]);
    }
  }, []);

  useEffect(() => {
    setPage(1);
    fetchBlogs(category, 1, true);
  }, [category, search, fetchBlogs]);

  useEffect(() => {
    fetchTrending();
  }, [fetchTrending]);

  const handleCategoryChange = (cat) => {
    const qs = buildQueryString({
      category: cat === 'All' ? null : cat,
      page: null,
    });

    router.push(`${pathname}${qs ? `?${qs}` : ''}`, { scroll: false });
  };

  const handleLoadMore = async () => {
    const nextPage = page + 1;
    setPage(nextPage);
    await fetchBlogs(category, nextPage, false);
  };

  const displayBlogs =
    featured && category === 'All' && !search.trim()
      ? blogs.filter((b) => b._id !== featured._id)
      : blogs;

  const supportingStories =
    featured && category === 'All' && !search.trim()
      ? blogs.filter((b) => b._id !== featured._id).slice(0, 2)
      : [];

  return (
    <>
      <Navbar />

      <main className="min-h-screen bg-[var(--bg-primary)]">
        <AnimatePresence mode="wait">
          {!loading && featured ? (
            <motion.section
              key="hero"
              {...fadeOnly}
              transition={{ duration: shouldReduceMotion ? 0 : 0.35 }}
              className="relative overflow-hidden border-b border-[var(--border)] bg-[var(--bg-primary)]"
            >
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-10">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-stretch">
                  <motion.article
                    {...fadeUp}
                    transition={{ duration: shouldReduceMotion ? 0 : 0.45 }}
                    className="lg:col-span-8 group"
                  >
                    <Link href={`/blog/${featured._id}`} className="block">
                      <div className="relative min-h-[420px] sm:min-h-[480px] lg:min-h-[540px] overflow-hidden rounded-[28px] bg-[var(--bg-secondary)] border border-white/10">
                        <SafeHeroImage blog={featured} />

                        <div className="absolute inset-0 bg-gradient-to-r from-black/82 via-black/56 to-black/22" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/72 via-black/20 to-transparent" />

                        <div className="absolute inset-x-0 bottom-0 p-5 sm:p-7 lg:p-8">
                          <div className="flex flex-wrap items-center gap-2 mb-4">
                            <span className="inline-flex items-center gap-1.5 bg-[var(--accent)] text-white text-[11px] font-bold px-3 py-1.5 rounded-full uppercase tracking-[0.18em]">
                              <Flame size={12} />
                              Featured
                            </span>

                            <span className="inline-flex items-center rounded-full border border-white/20 bg-white/10 backdrop-blur-sm px-3 py-1.5 text-[11px] font-medium uppercase tracking-[0.14em] text-white/90">
                              {featured.category}
                            </span>
                          </div>

                          <h1 className="font-display font-black text-3xl sm:text-4xl lg:text-5xl text-white leading-[1.05] max-w-4xl mb-4">
                            {featured.title}
                          </h1>

                          <p className="text-white/78 text-sm sm:text-base lg:text-lg leading-relaxed line-clamp-3 max-w-2xl mb-6">
                            {featured.excerpt}
                          </p>

                          <div className="flex flex-wrap items-center gap-4 sm:gap-5">
                            <span className="inline-flex items-center gap-2 rounded-full bg-white text-[var(--text-primary)] px-5 py-3 text-sm font-semibold transition-transform duration-200 group-hover:translate-x-1">
                              Read Full Story
                              <ArrowRight size={16} />
                            </span>

                            <div className="flex flex-wrap items-center gap-3 text-white/65 text-sm">
                              <span className="inline-flex items-center gap-1.5">
                                <Clock size={14} />
                                {featured.readTime || 5} min read
                              </span>
                              <span className="hidden sm:inline">·</span>
                              <span>
                                {formatDistanceToNow(new Date(featured.createdAt), { addSuffix: true })}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </Link>
                  </motion.article>

                  <motion.aside
                    {...fadeUp}
                    transition={{
                      duration: shouldReduceMotion ? 0 : 0.45,
                      delay: shouldReduceMotion ? 0 : 0.05,
                    }}
                    className="lg:col-span-4 flex flex-col gap-4"
                  >
                    <div className="flex items-center gap-3 px-1">
                      <div className="flex items-center gap-2 rounded-full border border-[var(--accent)]/20 bg-[var(--accent)]/10 px-3 py-1.5">
                        <Zap size={14} className="text-[var(--accent)]" />
                        <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--accent)]">
                          Top picks
                        </span>
                      </div>
                      <div className="h-px flex-1 bg-[var(--border)]" />
                    </div>

                    {supportingStories.length > 0 ? (
                      supportingStories.map((blog, index) => (
                        <Link
                          key={blog._id}
                          href={`/blog/${blog._id}`}
                          className="group block rounded-[24px] border border-[var(--border)] bg-[var(--bg-card)] p-3 sm:p-4 hover:border-[var(--accent)]/30 hover:bg-[var(--bg-secondary)] transition-all duration-300"
                        >
                          <div className="flex gap-4">
                            <div className="relative h-24 w-28 sm:h-28 sm:w-36 shrink-0 overflow-hidden rounded-2xl bg-[var(--bg-secondary)]">
                              <SafeThumbImage blog={blog} />
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--accent)]">
                                  {String(index + 1).padStart(2, '0')}
                                </span>
                                <span className="h-1 w-1 rounded-full bg-[var(--text-muted)]" />
                                <span className="text-[11px] uppercase tracking-[0.14em] text-[var(--text-muted)]">
                                  {blog.category}
                                </span>
                              </div>

                              <h2 className="line-clamp-2 text-[15px] sm:text-base font-semibold leading-snug text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors">
                                {blog.title}
                              </h2>

                              <p className="mt-2 line-clamp-2 text-sm text-[var(--text-muted)]">
                                {blog.excerpt}
                              </p>

                              <div className="mt-3 flex items-center gap-2 text-xs text-[var(--text-muted)]">
                                <Clock size={12} />
                                <span>
                                  {formatDistanceToNow(new Date(blog.createdAt), { addSuffix: true })}
                                </span>
                              </div>
                            </div>
                          </div>
                        </Link>
                      ))
                    ) : (
                      <div className="grid gap-4">
                        {Array.from({ length: 2 }).map((_, i) => (
                          <div
                            key={i}
                            className="rounded-[24px] border border-[var(--border)] bg-[var(--bg-card)] p-4"
                          >
                            <CardSkeleton />
                          </div>
                        ))}
                      </div>
                    )}
                  </motion.aside>
                </div>
              </div>
            </motion.section>
          ) : loading ? (
            <motion.div
              key="hero-skeleton"
              {...fadeOnly}
              className="border-b border-[var(--border)]"
            >
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-10">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
                  <div className="lg:col-span-8 skeleton rounded-[28px] min-h-[420px] sm:min-h-[480px] lg:min-h-[540px]" />
                  <div className="lg:col-span-4 grid gap-4">
                    <div className="skeleton rounded-[24px] min-h-[150px]" />
                    <div className="skeleton rounded-[24px] min-h-[150px]" />
                  </div>
                </div>
              </div>
            </motion.div>
          ) : (
            <div key="hero-empty" className="h-8" />
          )}
        </AnimatePresence>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {trending.length > 0 && (
            <motion.section
              {...fadeUp}
              transition={{
                duration: shouldReduceMotion ? 0 : 0.35,
                delay: shouldReduceMotion ? 0 : 0.08,
              }}
              className="py-8 sm:py-10"
            >
              <div className="mb-5 flex items-center gap-3">
                <div className="inline-flex items-center gap-2 rounded-full border border-[var(--accent)]/20 bg-[var(--accent)]/10 px-3 py-1.5">
                  <TrendingUp size={14} className="text-[var(--accent)]" />
                  <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--accent)]">
                    Trending now
                  </span>
                </div>
                <div className="h-px flex-1 bg-[var(--border)]" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                {trending.map((blog, i) => (
                  <Link
                    key={blog._id}
                    href={`/blog/${blog._id}`}
                    className="group rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] px-4 py-4 hover:border-[var(--accent)]/30 hover:bg-[var(--bg-secondary)] transition-all duration-300"
                  >
                    <div className="flex items-start gap-4">
                      <div className="text-lg font-black leading-none text-[var(--accent)]/70">
                        {String(i + 1).padStart(2, '0')}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="mb-2 flex items-center gap-2">
                          <span className="text-[11px] uppercase tracking-[0.14em] text-[var(--text-muted)]">
                            {blog.category}
                          </span>
                        </div>

                        <h3 className="line-clamp-3 text-sm sm:text-[15px] font-semibold leading-snug text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors">
                          {blog.title}
                        </h3>

                        <div className="mt-3 flex items-center gap-2 text-xs text-[var(--text-muted)]">
                          <Clock size={12} />
                          <span>
                            {formatDistanceToNow(new Date(blog.createdAt), { addSuffix: true })}
                          </span>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </motion.section>
          )}

          <section className="pb-20 pt-2">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="inline-flex items-center gap-2 rounded-full border border-[var(--accent)]/20 bg-[var(--accent)]/10 px-3 py-1.5">
                  <Zap size={14} className="text-[var(--accent)] fill-[var(--accent)]" />
                  <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--accent)]">
                    Latest
                  </span>
                </div>

                <h2 className="font-display font-bold text-2xl sm:text-3xl text-[var(--text-primary)]">
                  {category === 'All' ? 'News' : `${category} News`}
                </h2>
              </div>

              <p className="text-sm text-[var(--text-muted)]">
                Fresh stories, analysis, and updates across categories.
              </p>
            </div>

            <div className="mb-8">
              <CategoryTabs active={category} onChange={handleCategoryChange} />
            </div>

            <AnimatePresence mode="wait">
              {loading ? (
                <motion.div
                  key="grid-skeleton"
                  {...fadeOnly}
                  className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                >
                  {Array.from({ length: 6 }).map((_, i) => (
                    <CardSkeleton key={i} />
                  ))}
                </motion.div>
              ) : displayBlogs.length === 0 ? (
                <motion.div
                  key="empty"
                  {...fadeOnly}
                  className="rounded-[28px] border border-dashed border-[var(--border)] bg-[var(--bg-card)] text-center py-20 px-6"
                >
                  <div className="mb-4 text-5xl">📭</div>
                  <h3 className="font-display text-2xl text-[var(--text-primary)] mb-2">
                    No stories found
                  </h3>
                  <p className="text-[var(--text-muted)]">
                    Try a different category or search term
                  </p>
                </motion.div>
              ) : (
                <motion.div
                  key={`grid-${category}-${search}`}
                  {...fadeOnly}
                  className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                >
                  {displayBlogs.map((blog, i) => (
                    <BlogCard
                      key={blog._id}
                      blog={blog}
                      variant={i < 2 ? 'feature' : 'default'}
                      index={i}
                    />
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            {hasMore && !loading && displayBlogs.length > 0 && (
              <div className="mt-12 text-center">
                <motion.button
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  className="inline-flex items-center gap-2 rounded-full border-2 border-[var(--accent)] px-8 py-3 text-[var(--accent)] font-semibold hover:bg-[var(--accent)] hover:text-white transition-all duration-200 disabled:opacity-50"
                  whileHover={shouldReduceMotion ? {} : { scale: 1.02 }}
                  whileTap={shouldReduceMotion ? {} : { scale: 0.97 }}
                >
                  {loadingMore ? (
                    <>
                      <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      Loading...
                    </>
                  ) : (
                    <>
                      Load More Stories
                      <ArrowRight size={16} />
                    </>
                  )}
                </motion.button>
              </div>
            )}
          </section>
        </div>
      </main>

      <Footer />
    </>
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={<div className="skeleton h-screen" />}>
      <HomeContent />
    </Suspense>
  );
}