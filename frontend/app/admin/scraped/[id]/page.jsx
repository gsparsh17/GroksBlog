'use client';

import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import {
  ArrowLeft,
  Calendar,
  CheckCircle,
  ExternalLink,
  Sparkles,
  Loader2,
  Edit3,
  X,
  Save,
  AlignLeft,
  Tag,
  Star,
  Upload,
  ImageIcon,
} from 'lucide-react';
import { format } from 'date-fns';
import { blogApi, CATEGORY_COLORS, CATEGORIES, getImageUrl } from '../../../../lib/api';
import toast from 'react-hot-toast';

const ReactQuill = dynamic(() => import('react-quill'), { ssr: false });
import 'react-quill/dist/quill.snow.css';
import AdminSidebar from '../../../../components/admin/AdminSidebar';

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
  'header', 'bold', 'italic', 'underline', 'strike', 'blockquote',
  'list', 'bullet', 'link', 'image', 'color', 'background', 'code-block'
];

const getPlainTextFromHtml = (html = '') => {
  if (typeof window !== 'undefined') {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return doc.body.textContent?.replace(/\s+/g, ' ').trim() || '';
  }
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
};

const isQuillEmpty = (html = '') => getPlainTextFromHtml(html).length === 0;

export default function EditScrapedPage() {
  const { id } = useParams();
  const router = useRouter();

  const [state, setState] = useState({
    blog: null,
    loading: true,
    publishing: false,
    publishingWithAI: false,
    saving: false,
    isEditing: false,
    aiLoading: false,
    showAIPanel: false,
    editedTitle: '',
    editedContent: '',
    editedExcerpt: '',
    editedCategory: 'Technology',
    editedTags: '',
    editedFeatured: false,
    imageFile: null,
    imagePreview: '',
    existingImage: '',
    removeImage: false,
    aiSuggestion: { title: '', content: '', excerpt: '', tags: [] }
  });

  const updateState = useCallback((updates) => {
    setState((prev) => ({ ...prev, ...updates }));
  }, []);

  const fileRef = useRef(null);

  const fetchBlog = useCallback(async () => {
    try {
      const res = await blogApi.getScrapedById(id);
      const blogData = res.data.blog || res.data;

      updateState({
        blog: blogData,
        loading: false,
        editedTitle: blogData.title || '',
        editedContent: blogData.summary || blogData.content || '',
        editedExcerpt: blogData.excerpt || blogData.summary?.substring(0, 160) || '',
        editedCategory: blogData.category || 'Technology',
        editedTags: Array.isArray(blogData.tags) ? blogData.tags.map(tag => tag.replace(/^#/, '')).join(', ') : '',
        editedFeatured: !!blogData.featured,
        existingImage: blogData.image || '',
        imagePreview: blogData.image ? getImageUrl(blogData.image) : '',
      });
    } catch (err) {
      console.error(err);
      toast.error('Failed to load article');
      updateState({ loading: false });
    }
  }, [id, updateState]);

  useEffect(() => {
    fetchBlog();
  }, [fetchBlog]);

  useEffect(() => {
    return () => {
      if (state.imagePreview && state.imagePreview.startsWith('blob:')) {
        URL.revokeObjectURL(state.imagePreview);
      }
    };
  }, [state.imagePreview]);

  const blog = state.blog;
  const { 
    loading, publishing, publishingWithAI, saving, isEditing, aiLoading, showAIPanel,
    editedTitle, editedContent, editedExcerpt, editedCategory, editedTags, editedFeatured,
    imageFile, imagePreview, existingImage, removeImage, aiSuggestion 
  } = state;

  const currentImage = imagePreview || (existingImage ? getImageUrl(existingImage) : '');

  const charStats = useMemo(() => {
    const plainText = getPlainTextFromHtml(editedContent);
    const words = plainText.split(/\s+/).filter(Boolean).length;
    return {
      title: editedTitle.length,
      content: plainText.length,
      words: words,
      readTime: Math.ceil(words / 200)
    };
  }, [editedTitle, editedContent]);

  const isFormValid = editedTitle.trim() && !isQuillEmpty(editedContent) && editedExcerpt.trim();

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be under 5MB');
      return;
    }
    if (imagePreview && imagePreview.startsWith('blob:')) {
      URL.revokeObjectURL(imagePreview);
    }
    updateState({
      imageFile: file,
      imagePreview: URL.createObjectURL(file),
      existingImage: '',
      removeImage: false
    });
  };

  const handleRemoveImage = () => {
    if (imagePreview && imagePreview.startsWith('blob:')) {
      URL.revokeObjectURL(imagePreview);
    }
    updateState({
      imageFile: null,
      imagePreview: '',
      existingImage: '',
      removeImage: true
    });
    if (fileRef.current) fileRef.current.value = '';
  };

  // USING BACKEND API FOR AI ENHANCEMENT
  const handleAIEnhance = useCallback(async () => {
    if (!editedTitle.trim() || isQuillEmpty(editedContent) || aiLoading) {
      toast.error('Please add title and content first');
      return;
    }

    updateState({ aiLoading: true, showAIPanel: true });

    try {
      const response = await blogApi.enhanceContent({
        title: editedTitle,
        excerpt: editedExcerpt,
        content: editedContent,
      });

      const aiData = response?.data?.data;

      if (!aiData || typeof aiData !== 'object') {
        toast.error('Invalid AI response');
        updateState({ showAIPanel: false });
        return;
      }

      const { title, excerpt, content, tags } = aiData;

      if (!content || isQuillEmpty(content)) {
        toast.error('AI did not return valid content.');
        updateState({ showAIPanel: false });
        return;
      }

      const normalizedTags = Array.isArray(tags)
        ? tags.map(tag => tag.replace(/^#/, '').trim()).filter(Boolean).join(', ')
        : editedTags;

      updateState({
        aiSuggestion: {
          title: title || editedTitle,
          excerpt: excerpt || editedExcerpt,
          content: content || editedContent,
          tags: normalizedTags
        }
      });

      toast.success('AI suggestions ready! ✨');
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.message || 'AI enhancement failed');
      updateState({ showAIPanel: false });
    } finally {
      updateState({ aiLoading: false });
    }
  }, [editedTitle, editedContent, editedExcerpt, editedTags, aiLoading, updateState]);

  const applyAISuggestions = useCallback(() => {
    updateState({
      editedTitle: aiSuggestion.title,
      editedContent: aiSuggestion.content,
      editedExcerpt: aiSuggestion.excerpt || editedExcerpt,
      editedTags: aiSuggestion.tags || editedTags,
      showAIPanel: false
    });
    toast.success('AI suggestions applied! You can now edit further or publish.');
  }, [aiSuggestion, editedExcerpt, editedTags, updateState]);

  // NEW: Direct publish with AI suggestions
  const handlePublishWithAI = useCallback(async () => {
    if (!aiSuggestion.title && !aiSuggestion.content) {
      toast.error('No AI suggestions to publish');
      return;
    }

    updateState({ publishingWithAI: true });

    try {
      const formData = new FormData();
      
      // Use AI suggested content or fallback to current
      const finalTitle = aiSuggestion.title || editedTitle;
      const finalContent = aiSuggestion.content || editedContent;
      const finalExcerpt = aiSuggestion.excerpt || editedExcerpt;
      const finalTags = aiSuggestion.tags || editedTags;
      
      const normalizedTags = finalTags
        .split(',')
        .map(tag => tag.trim())
        .filter(Boolean)
        .map(tag => tag.startsWith('#') ? tag : `#${tag}`);

      formData.append('title', finalTitle.trim());
      formData.append('content', finalContent);
      formData.append('excerpt', finalExcerpt.trim());
      formData.append('category', editedCategory);
      formData.append('tags', JSON.stringify(normalizedTags));
      formData.append('featured', String(editedFeatured));
      formData.append('removeImage', String(removeImage));
      formData.append('sourceName', blog?.source || '');
      formData.append('sourceUrl', blog?.link || '');

      if (imageFile) {
        formData.append('image', imageFile);
      } else if (existingImage) {
        // Keep existing image
        formData.append('existingImage', existingImage);
      }

      await blogApi.publishScrapedWithData(id, formData);
      toast.success('Article published with AI enhancements! ✨');
      router.push('/admin/dashboard');
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Publish failed');
    } finally {
      updateState({ publishingWithAI: false, showAIPanel: false });
    }
  }, [aiSuggestion, editedTitle, editedContent, editedExcerpt, editedTags, editedCategory, editedFeatured, imageFile, existingImage, removeImage, blog, id, router, updateState]);

  const handlePublish = useCallback(async () => {
    if (!isFormValid) {
      toast.error('Please fill in title, excerpt, and content');
      return;
    }

    updateState({ publishing: true });

    try {
      const formData = new FormData();
      
      const normalizedTags = editedTags
        .split(',')
        .map(tag => tag.trim())
        .filter(Boolean)
        .map(tag => tag.startsWith('#') ? tag : `#${tag}`);

      formData.append('title', editedTitle.trim());
      formData.append('content', editedContent);
      formData.append('excerpt', editedExcerpt.trim());
      formData.append('category', editedCategory);
      formData.append('tags', JSON.stringify(normalizedTags));
      formData.append('featured', String(editedFeatured));
      formData.append('removeImage', String(removeImage));
      formData.append('sourceName', blog?.source || '');
      formData.append('sourceUrl', blog?.link || '');

      if (imageFile) {
        formData.append('image', imageFile);
      }

      await blogApi.publishScrapedWithData(id, formData);
      toast.success('Article published successfully!');
      router.push('/admin/dashboard');
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Publish failed');
    } finally {
      updateState({ publishing: false });
    }
  }, [editedTitle, editedContent, editedExcerpt, editedCategory, editedTags, editedFeatured, imageFile, removeImage, blog, id, router, updateState, isFormValid]);

  const handleSaveDraft = useCallback(async () => {
    if (!editedTitle.trim() || !editedContent) {
      toast.error('Title and content required');
      return;
    }

    updateState({ saving: true });

    try {
      const formData = new FormData();
      const normalizedTags = editedTags
        .split(',')
        .map(tag => tag.trim())
        .filter(Boolean)
        .map(tag => tag.startsWith('#') ? tag : `#${tag}`);

      formData.append('title', editedTitle.trim());
      formData.append('content', editedContent);
      formData.append('excerpt', editedExcerpt.trim());
      formData.append('category', editedCategory);
      formData.append('tags', JSON.stringify(normalizedTags));
      formData.append('featured', String(editedFeatured));
      formData.append('removeImage', String(removeImage));

      if (imageFile) {
        formData.append('image', imageFile);
      }

      await blogApi.updateScraped(id, formData);
      toast.success('Draft saved!');
      updateState({ isEditing: false });
    } catch (err) {
      console.error(err);
      toast.error('Failed to save draft');
    } finally {
      updateState({ saving: false });
    }
  }, [editedTitle, editedContent, editedExcerpt, editedCategory, editedTags, editedFeatured, imageFile, removeImage, id, updateState]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="animate-spin mx-auto mb-4 h-10 w-10 text-[var(--accent)]" />
          <p>Loading article...</p>
        </div>
      </div>
    );
  }

  if (!blog) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center">
        <div className="text-center">Article not found</div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[var(--bg-primary)]">
      <AdminSidebar />
      <div className="flex-1 max-w-5xl mx-auto px-4 py-8">
        <Link
          href="/admin/scraped"
          className="inline-flex items-center gap-2 text-[var(--text-muted)] hover:text-[var(--text-primary)] mb-6 transition-colors"
        >
          <ArrowLeft size={20} />
          <span>Back to Scraped News</span>
        </Link>

        {/* AI Panel with Direct Publish Button */}
        {showAIPanel && aiSuggestion.title && (
          <div className="mb-6 bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/30 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Sparkles size={20} className="text-purple-400" />
                <h3 className="font-semibold text-[var(--text-primary)]">AI Suggested Improvements</h3>
              </div>
              <button onClick={() => updateState({ showAIPanel: false })}>
                <X size={16} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-purple-400 uppercase tracking-wider mb-2 block">
                  Suggested Title
                </label>
                <div className="bg-[var(--bg-primary)] p-3 rounded-lg border border-purple-500/20">
                  <p className="text-sm">{aiSuggestion.title}</p>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-purple-400 uppercase tracking-wider mb-2 block">
                  Suggested Excerpt
                </label>
                <div className="bg-[var(--bg-primary)] p-3 rounded-lg border border-purple-500/20">
                  <p className="text-sm">{aiSuggestion.excerpt}</p>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-purple-400 uppercase tracking-wider mb-2 block">
                  Suggested Tags
                </label>
                <div className="bg-[var(--bg-primary)] p-3 rounded-lg border border-purple-500/20">
                  <p className="text-sm">{aiSuggestion.tags || 'No tags suggested'}</p>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-purple-400 uppercase tracking-wider mb-2 block">
                  Suggested Content
                </label>
                <div className="bg-[var(--bg-primary)] p-3 rounded-lg border border-purple-500/20 max-h-48 overflow-y-auto">
                  <div className="text-sm prose prose-sm" dangerouslySetInnerHTML={{ __html: aiSuggestion.content }} />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={applyAISuggestions}
                  className="flex-1 px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-colors text-sm font-medium"
                >
                  Apply & Edit
                </button>
                
                {/* NEW: Direct Publish with AI Button */}
                <button
                  onClick={handlePublishWithAI}
                  disabled={publishingWithAI}
                  className="flex-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {publishingWithAI ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      <span>Publishing...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle size={14} />
                      <span>Publish with AI</span>
                    </>
                  )}
                </button>

                <button
                  onClick={() => updateState({ showAIPanel: false })}
                  className="flex-1 px-4 py-2 bg-[var(--bg-secondary)] hover:bg-[var(--bg-hover)] text-[var(--text-primary)] rounded-lg transition-colors text-sm font-medium"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border)] overflow-hidden">
          {/* Header - same as before */}
          <div className="p-6 border-b border-[var(--border)]">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-xs px-2 py-0.5 rounded-full border ${CATEGORY_COLORS[editedCategory] || CATEGORY_COLORS.World}`}>
                  {editedCategory}
                </span>
                <span className="text-xs bg-purple-500/10 text-purple-400 border border-purple-500/20 px-2 py-0.5 rounded-full">
                  {blog.source || 'Unknown Source'}
                </span>
                {blog.link && (
                  <a href={blog.link} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-400 hover:underline flex items-center gap-1">
                    <ExternalLink size={10} /> Original
                  </a>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => updateState({ isEditing: !isEditing })}
                  className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/20 border border-emerald-500/30 rounded-lg text-sm"
                >
                  <Edit3 size={14} />
                  <span>{isEditing ? 'Preview Mode' : 'Edit Mode'}</span>
                </button>

                <button
                  onClick={handleAIEnhance}
                  disabled={aiLoading}
                  className="flex items-center gap-2 px-3 py-1.5 bg-purple-500/20 border border-purple-500/30 rounded-lg text-sm disabled:opacity-50"
                >
                  {aiLoading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} className="text-purple-400" />}
                  <span>{aiLoading ? 'AI Thinking...' : 'Enhance with AI'}</span>
                </button>
              </div>
            </div>

            {/* Title */}
            <div className="mb-4">
              {isEditing ? (
                <input
                  type="text"
                  value={editedTitle}
                  onChange={(e) => updateState({ editedTitle: e.target.value })}
                  className="w-full text-2xl font-bold bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg px-4 py-2 focus:outline-none focus:border-[var(--accent)]"
                  placeholder="Enter title..."
                />
              ) : (
                <h1 className="text-2xl font-bold text-[var(--text-primary)]">{editedTitle}</h1>
              )}
            </div>

            {/* Metadata */}
            <div className="flex flex-wrap items-center justify-between gap-4 text-sm text-[var(--text-muted)]">
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-1">
                  <Calendar size={14} />
                  <span>{format(new Date(blog.scrapedAt || blog.createdAt), 'PPP')}</span>
                </div>
                {charStats.words > 0 && (
                  <span>{charStats.words} words · ~{charStats.readTime} min read</span>
                )}
              </div>
            </div>
          </div>

          {/* Cover Image */}
          <div className="p-6 border-b border-[var(--border)]">
            <label className="block text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-3">
              <ImageIcon size={12} className="inline mr-1" /> Cover Image
            </label>

            {currentImage ? (
              <div className="relative group rounded-xl overflow-hidden h-56">
                <Image
                  src={currentImage}
                  alt="Preview"
                  fill
                  className="object-cover"
                  unoptimized
                />
                {isEditing && (
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
                )}
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={!isEditing}
                className={`w-full h-44 border-2 border-dashed border-[var(--border)] rounded-2xl flex flex-col items-center justify-center gap-3 transition-all ${isEditing ? 'hover:border-[var(--accent)] hover:bg-[var(--accent)]/5 cursor-pointer' : 'cursor-not-allowed opacity-50'}`}
              >
                <div className="w-12 h-12 rounded-2xl bg-[var(--bg-secondary)] flex items-center justify-center">
                  <Upload size={20} className="text-[var(--text-muted)]" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-[var(--text-secondary)]">Click to upload image</p>
                  <p className="text-xs text-[var(--text-muted)] mt-0.5">PNG, JPG, WebP up to 5MB</p>
                </div>
              </button>
            )}

            <input ref={fileRef} type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
          </div>

          {/* Excerpt - same as before */}
          <div className="p-6 border-b border-[var(--border)]">
            <label className="block text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">
              <AlignLeft size={12} className="inline mr-1" /> Excerpt *
            </label>
            {isEditing ? (
              <>
                <textarea
                  value={editedExcerpt}
                  onChange={(e) => updateState({ editedExcerpt: e.target.value })}
                  placeholder="A brief summary that appears in blog cards..."
                  rows={3}
                  maxLength={500}
                  className="w-full px-4 py-3 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl text-[var(--text-primary)] text-sm outline-none focus:border-[var(--accent)] resize-none"
                />
                <p className="text-xs text-[var(--text-muted)] mt-1 text-right">{editedExcerpt.length}/500</p>
              </>
            ) : (
              <p className="text-[var(--text-secondary)] text-sm leading-relaxed">{editedExcerpt || 'No excerpt available'}</p>
            )}
          </div>

          {/* Content with Rich Text Editor - same as before */}
          <div className="p-6 border-b border-[var(--border)]">
            <div className="flex items-center justify-between mb-3">
              <label className="block text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                Article Content *
              </label>
              {isEditing && charStats.words > 0 && (
                <span className="text-xs text-[var(--text-muted)]">{charStats.words} words</span>
              )}
            </div>

            {isEditing ? (
              <div className="blog-editor rounded-xl overflow-hidden border border-[var(--border)] bg-[var(--bg-card)]">
                <ReactQuill
                  theme="snow"
                  value={editedContent}
                  onChange={(val) => updateState({ editedContent: val })}
                  modules={QUILL_MODULES}
                  formats={QUILL_FORMATS}
                  placeholder="Write your article content here..."
                />
              </div>
            ) : (
              <div className="prose prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: editedContent }} />
            )}
          </div>

          {/* Settings - same as before */}
          <div className="p-6 space-y-6">
            <div>
              <label className="block text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">
                Category *
              </label>
              {isEditing ? (
                <select
                  value={editedCategory}
                  onChange={(e) => updateState({ editedCategory: e.target.value })}
                  className="w-full px-4 py-3 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl text-[var(--text-primary)] text-sm outline-none focus:border-[var(--accent)] cursor-pointer"
                >
                  {CATEGORIES.filter(c => c !== 'All').map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              ) : (
                <span className={`text-sm px-2 py-1 rounded-full border ${CATEGORY_COLORS[editedCategory] || CATEGORY_COLORS.World}`}>
                  {editedCategory}
                </span>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">
                <Tag size={12} className="inline mr-1" /> Tags
              </label>
              {isEditing ? (
                <input
                  type="text"
                  value={editedTags}
                  onChange={(e) => updateState({ editedTags: e.target.value })}
                  placeholder="ai, technology, future (comma separated)"
                  className="w-full px-4 py-3 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl text-[var(--text-primary)] text-sm outline-none focus:border-[var(--accent)]"
                />
              ) : (
                <div className="flex flex-wrap gap-2">
                  {editedTags.split(',').map((tag, i) => tag.trim() && (
                    <span key={i} className="text-xs px-2 py-1 bg-[var(--bg-secondary)] rounded-full">
                      #{tag.trim()}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between p-4 bg-[var(--bg-secondary)] rounded-xl">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center">
                  <Star size={16} className="text-amber-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-[var(--text-primary)]">Featured Post</p>
                  <p className="text-xs text-[var(--text-muted)]">Pin to homepage hero section</p>
                </div>
              </div>

              {isEditing ? (
                <button
                  type="button"
                  onClick={() => updateState({ editedFeatured: !editedFeatured })}
                  className={`relative w-12 h-6 rounded-full transition-colors duration-200 ${editedFeatured ? 'bg-amber-400' : 'bg-[var(--border)]'}`}
                >
                  <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ${editedFeatured ? 'translate-x-6' : ''}`} />
                </button>
              ) : (
                <span className={`text-sm ${editedFeatured ? 'text-amber-400' : 'text-[var(--text-muted)]'}`}>
                  {editedFeatured ? 'Featured ✓' : 'Not featured'}
                </span>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="sticky bottom-0 z-50 p-6 bg-[var(--bg-card)] border-t border-[var(--border)] flex flex-wrap md:flex-nowrap gap-3">
            {isEditing ? (
              <>
                <button
                  onClick={handleSaveDraft}
                  disabled={saving}
                  className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl transition-all disabled:opacity-50"
                >
                  {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                  <span>{saving ? 'Saving...' : 'Save Draft'}</span>
                </button>

                <button
                  onClick={handlePublish}
                  disabled={publishing || !isFormValid}
                  className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-xl transition-all disabled:opacity-50"
                >
                  {publishing ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle size={18} />}
                  <span>{publishing ? 'Publishing...' : 'Publish to Website'}</span>
                </button>
              </>
            ) : (
              <button
                onClick={() => updateState({ isEditing: true })}
                className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl transition-all"
              >
                <Edit3 size={18} />
                <span>Edit Article</span>
              </button>
            )}
          </div>
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
        .prose {
          color: var(--text-secondary);
        }
        .prose h1, .prose h2, .prose h3 {
          color: var(--text-primary);
        }
        .prose a {
          color: var(--accent);
        }
      `}</style>
    </div>
  );
}