'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import {
  ArrowLeft,
  Calendar,
  Globe,
  CheckCircle,
  ExternalLink,
  Sparkles,
  Loader2,
  Edit2,
  Edit3,
  X
} from 'lucide-react';
import { format } from 'date-fns';
import { blogApi, CATEGORY_COLORS, getImageUrl } from '../../../../lib/api';
import toast from 'react-hot-toast';
import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({
  apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY
});

export default function ScrapedDetailPage() {
  const { id } = useParams();
  const router = useRouter();

  const [state, setState] = useState({
    blog: null,
    loading: true,
    publishing: false,
    rewriting: false,
    isEditing: false,
    showAIPanel: false,
    editedTitle: '',
    editedContent: '',
    aiSuggestion: { title: '', content: '' }
  });

  const updateState = useCallback((updates) => {
    setState((prev) => ({ ...prev, ...updates }));
  }, []);

  const parseAIResponse = useCallback((response, fallbackBlog) => {
    const clean = response
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();

    try {
      const startIdx = clean.indexOf('{');
      const endIdx = clean.lastIndexOf('}') + 1;
      const jsonStr =
        startIdx !== -1 && endIdx > startIdx
          ? clean.substring(startIdx, endIdx)
          : clean;

      return JSON.parse(jsonStr);
    } catch {
      const titleMatch = response.match(/"title":\s*"([^"]+)"/);
      const contentMatch = response.match(/"content":\s*"([^"]+)"/);

      return {
        title: titleMatch?.[1] || fallbackBlog.title,
        content: contentMatch?.[1] || fallbackBlog.summary || ''
      };
    }
  }, []);

  const fetchBlog = useCallback(async () => {
    try {
      const res = await blogApi.getScrapedById(id);
      const blogData = res.data.blog || res.data;

      updateState({
        blog: blogData,
        loading: false,
        editedTitle: blogData.title || '',
        editedContent: blogData.summary || ''
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

  const blog = state.blog;
  const { loading, publishing, rewriting, isEditing, showAIPanel, editedTitle, editedContent, aiSuggestion } = state;

  const charStats = useMemo(() => {
    return {
      title: editedTitle.length,
      content: editedContent.length,
      words: Math.round(editedContent.length / 5)
    };
  }, [editedTitle, editedContent]);

  const isFormValid = editedTitle.trim() && editedContent.trim();

  const handleQuickEdit = useCallback(() => {
    updateState({ isEditing: true });
    toast.success('Edit mode activated!');
  }, [updateState]);

  const handleToggleEdit = useCallback(() => {
    updateState({ isEditing: !isEditing });
  }, [isEditing, updateState]);

  const handleAIRewrite = useCallback(async () => {
    if (!blog) return;

    updateState({ rewriting: true, showAIPanel: true });

    try {
      const prompt = `You are a professional news editor. Rewrite this news article to make it more engaging, professional, and SEO-friendly. Keep key facts but improve language and flow.

Title: ${blog.title}
Content: ${blog.summary || blog.title}

Return ONLY JSON: {"title":"improved title","content":"200-300 word summary"}`;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [{ parts: [{ text: prompt }] }],
        config: {
          temperature: 0.7,
          maxOutputTokens: 2048,
          responseMimeType: 'application/json'
        }
      });

      const parsed = parseAIResponse(response.text?.trim() || '', blog);

      updateState({
        aiSuggestion: {
          title: parsed.title || blog.title,
          content: parsed.content || blog.summary || ''
        }
      });

      toast.success('AI suggestions ready!');
    } catch (error) {
      console.error(error);
      toast.error(`AI rewrite failed: ${error.message}`);
      updateState({ showAIPanel: false });
    } finally {
      updateState({ rewriting: false });
    }
  }, [blog, parseAIResponse, updateState]);

  const applyAISuggestions = useCallback(() => {
    updateState({
      editedTitle: aiSuggestion.title,
      editedContent: aiSuggestion.content,
      showAIPanel: false
    });
    toast.success('AI suggestions applied!');
  }, [aiSuggestion, updateState]);

  const handlePublish = useCallback(async () => {
    if (!editedTitle.trim() || !editedContent.trim() || !blog) {
      toast.error('Title and content required');
      return;
    }

    updateState({ publishing: true });

    try {
      const formData = new FormData();
      formData.append('title', editedTitle);
      formData.append('content', editedContent);
      formData.append('excerpt', editedContent.substring(0, 200));
      formData.append('category', blog.category || '');
      formData.append('sourceName', blog.source || '');
      formData.append('sourceUrl', blog.link || '');

      if (blog.image) {
        formData.append('image', blog.image);
      }

      await blogApi.publishScrapedWithData(id, formData);
      toast.success('Article published successfully!');
      router.push('/admin/scraped');
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Publish failed');
    } finally {
      updateState({ publishing: false });
    }
  }, [editedTitle, editedContent, blog, id, router, updateState]);

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
    <div className="min-h-screen bg-[var(--bg-primary)]">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Link
          href="/admin/scraped"
          className="inline-flex items-center gap-2 text-[var(--text-muted)] hover:text-[var(--text-primary)] mb-6 transition-colors"
        >
          <ArrowLeft size={20} />
          <span>Back to Scraped News</span>
        </Link>

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
                  Suggested Content
                </label>
                <div className="bg-[var(--bg-primary)] p-3 rounded-lg border border-purple-500/20 max-h-48 overflow-y-auto">
                  <p className="text-sm whitespace-pre-wrap">{aiSuggestion.content}</p>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={applyAISuggestions}
                  className="flex-1 px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-colors text-sm font-medium"
                >
                  Apply Suggestions
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
          <div className="p-6 border-b border-[var(--border)]">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className={`text-xs px-2 py-0.5 rounded-full border ${CATEGORY_COLORS[blog.category] || CATEGORY_COLORS.World}`}>
                  {blog.category || 'Uncategorized'}
                </span>
                <span className="text-xs bg-purple-500/10 text-purple-400 border border-purple-500/20 px-2 py-0.5 rounded-full">
                  {blog.source || 'Unknown Source'}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleQuickEdit}
                  className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/20 border border-emerald-500/30 rounded-lg text-sm"
                >
                  <Edit3 size={14} />
                  <span>Quick Edit</span>
                </button>

                <button
                  onClick={handleAIRewrite}
                  disabled={rewriting}
                  className="flex items-center gap-2 px-3 py-1.5 bg-purple-500/20 border border-purple-500/30 rounded-lg text-sm"
                >
                  {rewriting ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} className="text-purple-400" />}
                  <span>{rewriting ? 'AI is thinking...' : 'Enhance with AI'}</span>
                </button>
              </div>
            </div>

            <div className="mb-4">
              {isEditing ? (
                <input
                  type="text"
                  value={editedTitle}
                  onChange={(e) => updateState({ editedTitle: e.target.value, showAIPanel: false })}
                  className="w-full text-2xl font-bold bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg px-4 py-2"
                />
              ) : (
                <h1 className="text-2xl font-bold text-[var(--text-primary)]">{editedTitle}</h1>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4 text-sm text-[var(--text-muted)]">
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-1">
                  <Calendar size={14} />
                  <span>{format(new Date(blog.scrapedAt || blog.createdAt), 'PPP')}</span>
                </div>

                {blog.time && (
                  <div className="flex items-center gap-1">
                    <Globe size={14} />
                    <span>Published: {blog.time}</span>
                  </div>
                )}

                {blog.link && (
                  <a
                    href={blog.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-[var(--accent)] hover:underline"
                  >
                    <ExternalLink size={14} />
                    <span>View Original</span>
                  </a>
                )}
              </div>

              <button
                onClick={handleToggleEdit}
                className="flex items-center gap-1 text-xs hover:text-[var(--accent)] transition-colors"
              >
                <Edit2 size={12} />
                <span>{isEditing ? 'Preview Mode' : 'Edit Mode'}</span>
              </button>
            </div>
          </div>

          {blog.image && (
            <div className="relative w-full h-96 bg-gray-800">
              <Image
                src={getImageUrl(blog.image)}
                alt={blog.title}
                fill
                className="object-cover"
              />
            </div>
          )}

          <div className="p-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">Content</h2>
              {isEditing && (
                <span className="text-xs text-amber-400 bg-amber-500/10 px-2 py-1 rounded">
                  Editing Mode
                </span>
              )}
            </div>

            {isEditing ? (
              <textarea
                value={editedContent}
                onChange={(e) => updateState({ editedContent: e.target.value, showAIPanel: false })}
                rows={12}
                className="w-full bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg px-4 py-3 resize-vertical"
              />
            ) : (
              <p className="text-[var(--text-secondary)] leading-relaxed whitespace-pre-wrap">
                {editedContent || 'No content available'}
              </p>
            )}
          </div>

          <div className="px-6 pb-3 text-xs text-[var(--text-muted)]">
            Title: {charStats.title} chars | Content: {charStats.content} chars (~{charStats.words} words)
          </div>

          <div className="sticky bottom-0 z-50 p-6 bg-slate-900 border-t border-gray-700 flex flex-wrap md:flex-nowrap gap-3">
            <button
              onClick={handlePublish}
              disabled={publishing || !isFormValid}
              className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-xl transition-all disabled:opacity-50"
            >
              {publishing ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle size={18} />}
              <span>{publishing ? 'Publishing...' : 'Publish to Website'}</span>
            </button>

            <button
              onClick={() => {
                updateState({ isEditing: true });
                toast.success('Edit mode activated!');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl transition-all border-2 border-blue-400"
            >
              <Edit3 size={18} />
              <span>Edit Now</span>
            </button>

            {blog.link && (
              <a
                href={blog.link}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-2 bg-gray-800 border border-gray-600 text-white font-semibold py-3 rounded-xl hover:bg-gray-700 transition-colors"
              >
                <ExternalLink size={18} />
                <span>Read Original</span>
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}