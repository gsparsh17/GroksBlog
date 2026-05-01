'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { Clock, Eye, ArrowLeft, Twitter, Linkedin, Link2, BookOpen, Tag, ChevronRight } from 'lucide-react';
import DOMPurify from 'dompurify';
import Navbar from '../../../components/layout/Navbar';
import Footer from '../../../components/layout/Footer';
import BlogCard from '../../../components/blog/BlogCard';
import { BlogPageSkeleton } from '../../../components/ui/Skeletons';
import { blogApi, CATEGORY_COLORS, getImageUrl } from '../../../lib/api';
import toast from 'react-hot-toast';

export default function BlogDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [blog, setBlog] = useState(null);
  const [related, setRelated] = useState([]);
  const [loading, setLoading] = useState(true);
  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => {
    const fetchBlog = async () => {
      try {
        const res = await blogApi.getById(id);
        const fetchedBlog = res.data.blog;
        setBlog(fetchedBlog);

        const rel = await blogApi.getAll({ category: fetchedBlog.category, limit: 3 });
        setRelated(rel.data.blogs.filter(b => b._id !== id).slice(0, 3));
      } catch {
        router.push('/');
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchBlog();
  }, [id, router]);

  useEffect(() => {
    const onScroll = () => {
      const el = document.documentElement;
      const progress = (el.scrollTop / (el.scrollHeight - el.clientHeight)) * 100;
      setScrollProgress(progress);
    };
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleShare = (platform) => {
    const url = window.location.href;
    if (platform === 'copy') { 
      navigator.clipboard.writeText(url); 
      toast.success('Link copied!');
    }
    else if (platform === 'twitter') window.open(`https://twitter.com/intent/tweet?url=${url}&text=${blog?.title}`);
    else if (platform === 'linkedin') window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${url}`);
  };

  // Sanitize blog content for security
  const getSanitizedContent = (html) => {
    if (!html) return '';
    return DOMPurify.sanitize(html, {
      ALLOWED_TAGS: [
        'h1','h2','h3','h4','h5','h6','p','br','hr','blockquote','strong','em','u','s',
        'ul','ol','li','a','img','code','pre','table','thead','tbody','tr','th','td',
        'div','span'
      ],
      ALLOWED_ATTR: ['href','src','alt','title','target','rel','width','height']
    });
  };

  if (loading) return (<><Navbar /><BlogPageSkeleton /><Footer /></>);
  if (!blog) return null;

  const categoryColor = CATEGORY_COLORS[blog.category] || '';

  return (
    <>
      <Navbar />

      {/* Reading progress bar */}
      <motion.div
        className="fixed top-0 left-0 h-0.5 bg-[var(--accent)] z-50 origin-left"
        initial={{ scaleX: 0 }}
        animate={{ scaleX: scrollProgress / 100 }}
        transition={{ duration: 0.3 }}
      />

      <main>
        {/* Hero */}
        <motion.div 
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }} 
          className="relative h-[70vh] min-h-[480px] overflow-hidden"
        >
          <Image 
            src={getImageUrl(blog.image)} 
            alt={blog.title}
            fill 
            className="object-cover"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 90vw, 1200px"
            priority 
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg-primary)] via-black/40 to-black/20" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/30 to-transparent" />

          <div className="absolute top-6 left-6">
            <motion.button
              onClick={() => router.back()}
              className="flex items-center gap-2 glass text-white px-4 py-2 rounded-full text-sm font-medium hover:bg-white/20 transition-colors"
              whileHover={{ x: -2 }} 
              whileTap={{ scale: 0.97 }}
            >
              <ArrowLeft size={15} /> Back
            </motion.button>
          </div>

          <div className="absolute bottom-0 left-0 right-0 p-8 md:p-12">
            <div className="max-w-4xl mx-auto">
              <motion.div 
                initial={{ opacity: 0, y: 30 }} 
                animate={{ opacity: 1, y: 0 }} 
                transition={{ delay: 0.15 }} 
                className="flex items-center gap-3 mb-4"
              >
                <span className={`text-xs font-semibold px-3 py-1 rounded-full border backdrop-blur-sm ${categoryColor}`}>
                  {blog.category}
                </span>
                <span className="text-white/50 text-xs">
                  {format(new Date(blog.createdAt), 'MMMM d, yyyy')}
                </span>
              </motion.div>
              <motion.h1 
                initial={{ opacity: 0, y: 20 }} 
                animate={{ opacity: 1, y: 0 }} 
                transition={{ delay: 0.25 }}
                className="font-display font-black text-3xl md:text-5xl text-white leading-tight"
              >
                {blog.title}
              </motion.h1>
            </div>
          </div>
        </motion.div>

        {/* Body */}
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Meta bar */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ delay: 0.35 }}
            className="flex flex-wrap items-center justify-between gap-4 py-6 border-b border-[var(--border)]"
          >
            <div className="flex items-center gap-5 text-sm text-[var(--text-muted)]">
              <span className="flex items-center gap-1.5">
                <BookOpen size={15} className="text-[var(--accent)]" />
                {blog.readTime || 5} min read
              </span>
              <span className="flex items-center gap-1.5">
                <Eye size={15} className="text-[var(--accent)]" />
                {(blog.views || 0).toLocaleString()} views
              </span>
              <span className="flex items-center gap-1.5">
                <Clock size={15} className="text-[var(--accent)]" />
                {format(new Date(blog.createdAt), 'MMM d, yyyy')}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-[var(--text-muted)] mr-1">Share:</span>
              {[
                { icon: Twitter, key: 'twitter' },
                { icon: Linkedin, key: 'linkedin' },
                { icon: Link2, key: 'copy' },
              ].map(({ icon: Icon, key }) => (
                <motion.button 
                  key={key} 
                  onClick={() => handleShare(key)}
                  className="w-8 h-8 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border)] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--accent)] hover:border-[var(--accent)]/30 transition-all"
                  whileHover={{ scale: 1.1 }} 
                  whileTap={{ scale: 0.9 }}
                >
                  <Icon size={14} />
                </motion.button>
              ))}
            </div>
          </motion.div>

          {/* Excerpt */}
          <motion.p 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ delay: 0.4 }}
            className="text-xl text-[var(--text-secondary)] font-light leading-relaxed py-8 border-b border-[var(--border)] italic font-display"
          >
            {blog.excerpt}
          </motion.p>

          {/* Content - FIXED with sanitization + styling */}
          <motion.article 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            transition={{ delay: 0.5 }}
            className="prose prose-headings:font-display prose-headings:font-bold prose-h1:text-3xl prose-h1:mb-6 prose-h2:text-2xl prose-h2:mb-4 prose-p:leading-relaxed prose-strong:font-semibold prose-a:text-[var(--accent)] prose-a:no-underline hover:prose-a:underline prose-code:bg-[var(--bg-secondary)] prose-code:px-2 prose-code:rounded prose-pre:bg-[var(--bg-card)] prose-pre:p-4 prose-pre:rounded-xl prose-img:rounded-xl prose-img:shadow-md prose-table:w-full prose-table:mb-4 prose-th:bg-[var(--bg-secondary)] prose-td:border-t prose-td:border-[var(--border)] prose-blockquote:italic prose-blockquote:border-l-4 prose-blockquote:border-[var(--accent)] prose-blockquote:pl-4 prose-blockquote:mb-4 prose-blockquote:mt-4 prose-ul:my-4 prose-ol:my-4 py-10 max-w-none prose-headings:text-[var(--text-primary)] prose-p:text-[var(--text-secondary)]"
            dangerouslySetInnerHTML={{ __html: getSanitizedContent(blog.content) }}
          />

          {/* Tags */}
          {blog.tags && blog.tags.length > 0 && (
            <div className="flex items-center gap-3 flex-wrap py-6 border-t border-[var(--border)]">
              <Tag size={15} className="text-[var(--text-muted)]" />
              {blog.tags.map(tag => (
                <span 
                  key={tag} 
                  className="text-xs font-medium px-3 py-1 rounded-full bg-[var(--bg-secondary)] text-[var(--text-secondary)] border border-[var(--border)] hover:border-[var(--accent)]/30 hover:text-[var(--accent)] transition-colors cursor-default"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}

          {/* Author */}
          <div className="my-10 p-6 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border)] flex items-center gap-5">
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[var(--accent)] to-orange-600 flex items-center justify-center text-white font-bold text-xl shrink-0">
              NF
            </div>
            <div>
              <p className="font-semibold text-[var(--text-primary)]">NewsForge Editorial</p>
              <p className="text-sm text-[var(--text-muted)] mt-0.5">
                Covering technology, AI, and global affairs — curated for the curious mind.
              </p>
            </div>
          </div>
        </div>

        {/* Related */}
        {related.length > 0 && (
          <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 border-t border-[var(--border)]">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="w-1 h-6 bg-[var(--accent)] rounded-full" />
                <h2 className="font-display font-bold text-2xl text-[var(--text-primary)]">
                  Related Stories
                </h2>
              </div>
              <Link 
                href={`/?category=${blog.category}`} 
                className="flex items-center gap-1 text-sm text-[var(--accent)] hover:text-[var(--accent-hover)] transition-colors font-medium"
              >
                More in {blog.category} <ChevronRight size={16} />
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {related.map((b, i) => (
                <BlogCard key={b._id} blog={b} variant="default" index={i} />
              ))}
            </div>
          </section>
        )}
      </main>

      <Footer />
    </>
  );
}