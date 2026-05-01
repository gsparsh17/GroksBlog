'use client';

import 'react-quill/dist/quill.snow.css';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { motion } from 'framer-motion';
import {
  Upload,
  X,
  Save,
  Eye,
  ArrowLeft,
  Star,
  Tag,
  Image as ImageIcon,
  AlignLeft,
  Type,
  Layers,
  Sparkles,
} from 'lucide-react';
import dynamic from 'next/dynamic';
import AdminSidebar from '../admin/AdminSidebar';
import { blogApi, CATEGORIES } from '../../lib/api';
import toast from 'react-hot-toast';

const ReactQuill = dynamic(() => import('react-quill'), {
  ssr: false,
  loading: () => <div className="skeleton h-64 w-full rounded-xl" />,
});

const QUILL_MODULES = {
  toolbar: [
    [{ header: [1, 2, 3, false] }],
    ['bold', 'italic', 'underline', 'strike', 'blockquote'],
    [{ list: 'ordered' }, { list: 'bullet' }],
    ['link', 'image'],
    [{ color: [] }, { background: [] }],
    ['code-block'],
    ['clean'],
  ],
};

const QUILL_FORMATS = [
  'header',
  'bold',
  'italic',
  'underline',
  'strike',
  'blockquote',
  'list',
  'bullet',
  'link',
  'image',
  'color',
  'background',
  'code-block',
];

const getPlainTextFromHtml = (html = '') => {
  if (typeof window !== 'undefined') {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return (doc.body.textContent || '').replace(/\s+/g, ' ').trim();
  }

  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
};

const isQuillEmpty = (html = '') => getPlainTextFromHtml(html).length === 0;

export default function BlogForm({ blogId }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fileRef = useRef(null);
  const isEdit = !!blogId;
  const isFromScraped = searchParams.get('from') === 'scraped';

  const [form, setForm] = useState({
    title: '',
    excerpt: '',
    content: '',
    category: 'Technology',
    tags: '',
    featured: false,
  });

  const [originalForm, setOriginalForm] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [existingImage, setExistingImage] = useState('');
  const [removeImage, setRemoveImage] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(isEdit);
  const [activeTab, setActiveTab] = useState('content');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiEnhanced, setAiEnhanced] = useState(false);

  useEffect(() => {
    if (!isEdit) return;

    const fetchBlog = async () => {
      try {
        const res = isFromScraped
          ? await blogApi.getScrapedById(blogId)
          : await blogApi.getById(blogId);

        const b = res.data.blog || res.data;

        setForm({
          title: b.title || '',
          excerpt: b.excerpt || b.summary || '',
          content: b.content || b.summary || '', // ✅ FIX HERE
          category: b.category || 'Technology',
          tags: Array.isArray(b.tags) ? b.tags.join(', ') : '',
          featured: !!b.featured,
        });
        setExistingImage(b.image || '');
        setRemoveImage(false);
      } catch {
        toast.error('Failed to load post');
        router.push('/admin/dashboard');
      } finally {
        setLoading(false);
      }
    };

    fetchBlog();
  }, [blogId, isEdit, router, isFromScraped]);

  useEffect(() => {
    return () => {
      if (imagePreview) URL.revokeObjectURL(imagePreview);
    };
  }, [imagePreview]);

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be under 5MB');
      return;
    }

    if (imagePreview) URL.revokeObjectURL(imagePreview);

    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setExistingImage('');
    setRemoveImage(false);
  };

  const handleRemoveImage = () => {
    if (imagePreview) URL.revokeObjectURL(imagePreview);

    setImageFile(null);
    setImagePreview('');
    setExistingImage('');
    setRemoveImage(true);

    if (fileRef.current) {
      fileRef.current.value = '';
    }
  };

  const handleAiEnhance = async () => {
    if (!form.title.trim() || isQuillEmpty(form.content) || aiLoading) {
      return;
    }
    console.log("KEY:", process.env.GEMINI_API_KEY);
    setOriginalForm(form);
    setAiLoading(true);

    try {
      const response = await blogApi.enhanceContent({
        title: form.title,
        excerpt: form.excerpt,
        content: form.content,
      });

      const data = response?.data;

      if (!data || typeof data !== 'object' || Array.isArray(data)) {
        toast.error('Invalid AI response. Please try again.');
        return;
      }

      const { title, excerpt, content } = data;

      if (!content || isQuillEmpty(content)) {
        toast.error('AI did not return valid content.');
        return;
      }

      setForm((prev) => ({
        ...prev,
        title: title || prev.title,
        excerpt: excerpt || prev.excerpt,
        content: content || prev.content,
      }));

      setAiEnhanced(true);
      toast.success('AI enhancement complete');
    } catch {
      toast.error('AI enhancement failed. Please try again.');
    } finally {
      setAiLoading(false);
    }
  };

  const handleUndoAiChanges = () => {
    if (!originalForm) return;

    setForm(originalForm);
    setAiEnhanced(false);
    setOriginalForm(null);
    toast.success('AI changes reverted');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.title.trim()) {
      toast.error('Title is required');
      return;
    }

    if (!form.excerpt.trim()) {
      toast.error('Excerpt is required');
      return;
    }

    if (isQuillEmpty(form.content)) {
      toast.error('Content is required');
      return;
    }

    setSaving(true);

    try {
      const fd = new FormData();

      const normalizedTags = form.tags
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean);

      fd.append('title', form.title.trim());
      fd.append('excerpt', form.excerpt.trim());
      fd.append('content', form.content);
      fd.append('category', form.category);
      fd.append('tags', JSON.stringify(normalizedTags));
      fd.append('featured', String(form.featured));
      fd.append('removeImage', String(removeImage));

      if (imageFile) {
        fd.append('image', imageFile);
      }

      if (isEdit) {
        await blogApi.update(blogId, fd);
        toast.success('Post updated!');
      } else {
        await blogApi.create(fd);
        toast.success('Post published!');
      }

      router.push('/admin/dashboard');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const currentImage = imagePreview || existingImage || '';
  const plainTextContent = getPlainTextFromHtml(form.content);
  const wordCount = plainTextContent
    ? plainTextContent.split(/\s+/).filter(Boolean).length
    : 0;
  const isAiButtonDisabled =
    !form.title.trim() || isQuillEmpty(form.content) || aiLoading;

  if (loading) {
    return (
      <div className="flex min-h-screen bg-[var(--bg-primary)]">
        <AdminSidebar />
        <div className="flex-1 p-8 space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="skeleton h-14 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[var(--bg-primary)]">
      <AdminSidebar />

      <div className="flex-1 overflow-auto">
        <div className="sticky top-0 z-30 bg-[var(--bg-primary)]/90 backdrop-blur-sm border-b border-[var(--border)] px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => router.back()}
                className="p-2 rounded-xl text-[var(--text-muted)] hover:bg-[var(--bg-secondary)] transition-colors"
              >
                <ArrowLeft size={18} />
              </button>

              <div>
                <h1 className="font-display font-bold text-xl text-[var(--text-primary)]">
                  {isEdit ? 'Edit Post' : 'New Post'}
                </h1>
                <p className="text-xs text-[var(--text-muted)]">
                  {wordCount > 0
                    ? `${wordCount} words · ~${Math.ceil(wordCount / 200)} min read`
                    : 'Start writing...'}
                </p>
              </div>
            </div>

            <motion.button
              type="submit"
              form="blog-form"
              disabled={saving}
              className="flex items-center gap-2 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white font-semibold px-5 py-2.5 rounded-xl text-sm transition-colors disabled:opacity-60"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
            >
              {saving ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Save size={15} />
              )}
              {saving ? 'Saving...' : isEdit ? 'Update Post' : 'Publish'}
            </motion.button>
          </div>

          <div className="flex items-center gap-1 mt-4">
            {['content', 'settings'].map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${activeTab === tab
                    ? 'bg-[var(--accent)]/10 text-[var(--accent)]'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                  }`}
              >
                {tab === 'content' ? (
                  <>
                    <Type size={14} /> Content
                  </>
                ) : (
                  <>
                    <Layers size={14} /> Settings
                  </>
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="max-w-4xl mx-auto p-6">
          <form id="blog-form" onSubmit={handleSubmit}>
            {activeTab === 'content' && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">
                    <Type size={12} className="inline mr-1" /> Title *
                  </label>
                  <input
                    type="text"
                    value={form.title}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, title: e.target.value }))
                    }
                    placeholder="Enter a compelling headline..."
                    className="w-full px-4 py-3.5 bg-[var(--bg-card)] border border-[var(--border)] rounded-xl text-[var(--text-primary)] placeholder-[var(--text-muted)] text-lg font-display font-bold outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/15 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">
                    <AlignLeft size={12} className="inline mr-1" /> Excerpt *
                  </label>
                  <textarea
                    value={form.excerpt}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, excerpt: e.target.value }))
                    }
                    placeholder="A brief summary that appears in blog cards..."
                    rows={3}
                    maxLength={500}
                    className="w-full px-4 py-3 bg-[var(--bg-card)] border border-[var(--border)] rounded-xl text-[var(--text-primary)] placeholder-[var(--text-muted)] text-sm outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/15 transition-all resize-none"
                  />
                  <p className="text-xs text-[var(--text-muted)] mt-1 text-right">
                    {form.excerpt.length}/500
                  </p>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                      Article Content *
                    </label>

                    <div className="flex items-center gap-2">
                      {aiEnhanced && originalForm && (
                        <motion.button
                          type="button"
                          onClick={handleUndoAiChanges}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] transition-all"
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          <X size={12} />
                          Undo AI Changes
                        </motion.button>
                      )}

                      <motion.button
                        type="button"
                        onClick={handleAiEnhance}
                        disabled={isAiButtonDisabled}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${isAiButtonDisabled
                            ? 'text-[var(--text-muted)] cursor-not-allowed'
                            : 'text-[var(--accent)] hover:bg-[var(--accent)]/10 hover:text-[var(--accent)]/90'
                          }`}
                        whileHover={isAiButtonDisabled ? {} : { scale: 1.05 }}
                        whileTap={isAiButtonDisabled ? {} : { scale: 0.95 }}
                      >
                        {aiLoading ? (
                          <div className="w-3 h-3 border-2 border-[var(--accent)]/30 border-t-[var(--accent)] rounded-full animate-spin" />
                        ) : (
                          <Sparkles size={12} />
                        )}
                        {aiLoading ? 'Enhancing...' : 'Enhance with AI'}
                      </motion.button>
                    </div>
                  </div>

                  {aiEnhanced && (
                    <div className="mb-3 p-2 bg-green-500/10 border border-green-500/20 rounded-lg flex items-center gap-2">
                      <Sparkles size={14} className="text-green-500 flex-shrink-0" />
                      <span className="text-xs text-green-600 font-medium">
                        Content enhanced with AI ✨
                      </span>
                    </div>
                  )}

                  <div className="blog-editor rounded-xl overflow-hidden border border-[var(--border)] bg-[var(--bg-card)] focus-within:border-[var(--accent)] focus-within:ring-2 focus-within:ring-[var(--accent)]/15 transition-all">
                    <ReactQuill
                      theme="snow"
                      value={form.content}
                      onChange={(val) =>
                        setForm((prev) => ({ ...prev, content: val }))
                      }
                      modules={QUILL_MODULES}
                      formats={QUILL_FORMATS}
                      placeholder="Write your story here..."
                    />
                  </div>

                  <p className="text-xs text-[var(--text-muted)] mt-2 flex items-center gap-1">
                    <Sparkles size={12} className="opacity-70" />
                    AI will improve readability, SEO, and structure
                  </p>
                </div>
              </motion.div>
            )}

            {activeTab === 'settings' && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">
                    <ImageIcon size={12} className="inline mr-1" /> Cover Image
                  </label>

                  {currentImage ? (
                    <div className="relative group rounded-2xl overflow-hidden h-56">
                      <Image
                        src={currentImage}
                        alt="Preview"
                        fill
                        className="object-cover"
                        unoptimized
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                        <button
                          type="button"
                          onClick={() => fileRef.current?.click()}
                          className="bg-white text-black px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-100 transition-colors"
                        >
                          Change
                        </button>
                        <button
                          type="button"
                          onClick={handleRemoveImage}
                          className="bg-red-500 text-white p-2 rounded-lg hover:bg-red-600 transition-colors"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => fileRef.current?.click()}
                      className="w-full h-44 border-2 border-dashed border-[var(--border)] rounded-2xl flex flex-col items-center justify-center gap-3 hover:border-[var(--accent)] hover:bg-[var(--accent)]/5 transition-all group"
                    >
                      <div className="w-12 h-12 rounded-2xl bg-[var(--bg-secondary)] flex items-center justify-center group-hover:bg-[var(--accent)]/10 transition-colors">
                        <Upload
                          size={20}
                          className="text-[var(--text-muted)] group-hover:text-[var(--accent)]"
                        />
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-medium text-[var(--text-secondary)]">
                          Click to upload image
                        </p>
                        <p className="text-xs text-[var(--text-muted)] mt-0.5">
                          PNG, JPG, WebP up to 5MB
                        </p>
                      </div>
                    </button>
                  )}

                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">
                    Category *
                  </label>
                  <select
                    value={form.category}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, category: e.target.value }))
                    }
                    className="w-full px-4 py-3 bg-[var(--bg-card)] border border-[var(--border)] rounded-xl text-[var(--text-primary)] text-sm outline-none focus:border-[var(--accent)] transition-colors appearance-none cursor-pointer"
                  >
                    {CATEGORIES.filter((c) => c !== 'All').map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">
                    <Tag size={12} className="inline mr-1" /> Tags
                  </label>
                  <input
                    type="text"
                    value={form.tags}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, tags: e.target.value }))
                    }
                    placeholder="ai, technology, future (comma separated)"
                    className="w-full px-4 py-3 bg-[var(--bg-card)] border border-[var(--border)] rounded-xl text-[var(--text-primary)] placeholder-[var(--text-muted)] text-sm outline-none focus:border-[var(--accent)] transition-colors"
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-[var(--bg-card)] border border-[var(--border)] rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center">
                      <Star size={16} className="text-amber-400" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-[var(--text-primary)]">
                        Featured Post
                      </p>
                      <p className="text-xs text-[var(--text-muted)]">
                        Pin to homepage hero section
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setForm((prev) => ({ ...prev, featured: !prev.featured }))
                    }
                    className={`relative w-12 h-6 rounded-full transition-colors duration-200 ${form.featured ? 'bg-amber-400' : 'bg-[var(--border)]'
                      }`}
                  >
                    <motion.div
                      className="absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow"
                      animate={{ x: form.featured ? 24 : 0 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                    />
                  </button>
                </div>

                {form.title && (
                  <div className="p-4 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl">
                    <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-3">
                      <Eye size={11} className="inline mr-1" /> Preview
                    </p>

                    <div className="flex items-start gap-3">
                      {currentImage && (
                        <div className="relative w-16 h-16 rounded-lg overflow-hidden shrink-0">
                          <Image
                            src={currentImage}
                            alt="preview"
                            fill
                            className="object-cover"
                            unoptimized
                          />
                        </div>
                      )}

                      <div>
                        <span className="text-xs text-[var(--accent)] font-semibold">
                          {form.category}
                        </span>
                        <p className="text-sm font-bold text-[var(--text-primary)] mt-0.5 line-clamp-2">
                          {form.title}
                        </p>
                        {form.excerpt && (
                          <p className="text-xs text-[var(--text-muted)] mt-1 line-clamp-2">
                            {form.excerpt}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </form>
        </div>
      </div>

      <style jsx global>{`
        .blog-editor .ql-toolbar {
          border: none;
          border-bottom: 1px solid var(--border);
          background: var(--bg-card);
          padding: 12px;
        }

        .blog-editor .ql-container {
          border: none;
          min-height: 360px;
          font-family: inherit;
        }

        .blog-editor .ql-editor {
          min-height: 360px;
          padding: 16px;
          color: var(--text-primary);
          font-size: 15px;
          line-height: 1.75;
        }

        .blog-editor .ql-editor.ql-blank::before {
          color: var(--text-muted);
          font-style: normal;
          left: 16px;
          right: 16px;
        }

        .blog-editor .ql-snow .ql-stroke {
          stroke: var(--text-primary);
        }

        .blog-editor .ql-snow .ql-fill {
          fill: var(--text-primary);
        }

        .blog-editor .ql-snow .ql-picker {
          color: var(--text-primary);
        }

        .blog-editor .ql-snow .ql-picker-options {
          background: var(--bg-card);
          border: 1px solid var(--border);
        }

        .blog-editor .ql-snow .ql-tooltip {
          z-index: 20;
        }
      `}</style>
    </div>
  );
}