'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import {
  Eye,
  TrendingUp,
  FileText,
  Search,
  Zap,
  Trash2,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  CheckCircle
} from 'lucide-react';

import AdminSidebar from '../../../components/admin/AdminSidebar';
import { CATEGORY_COLORS, getImageUrl, blogApi } from '../../../lib/api';
import toast from 'react-hot-toast';

export default function ScrapedPage() {
  const [blogs, setBlogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [deleting, setDeleting] = useState(null);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [itemsPerPage] = useState(20);

  // FETCH SCRAPED DATA FROM BACKEND
  useEffect(() => {
    fetchScrapedBlogs();
  }, [currentPage, search]);

  const fetchScrapedBlogs = async () => {
    try {
      setLoading(true);
      const res = await blogApi.getScraped(currentPage, itemsPerPage, search);
      console.log('Fetched scraped blogs:', res.data);
      
      const blogsData = res.data.blogs || res.data || [];
      setBlogs(blogsData);
      setTotalPages(res.data.totalPages || 1);
      setTotalItems(res.data.total || blogsData.length);
    } catch (err) {
      console.error('Error fetching scraped blogs:', err);
      toast.error('Failed to fetch scraped articles');
    } finally {
      setLoading(false);
    }
  };

  // Handle search submit
  const handleSearch = (e) => {
    e.preventDefault();
    setSearch(searchInput);
    setCurrentPage(1);
  };

  // Clear search
  const clearSearch = () => {
    setSearchInput('');
    setSearch('');
    setCurrentPage(1);
  };

  // DELETE FUNCTION - Only delete, no publish here
  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this article?')) return;
    
    try {
      setDeleting(id);
      await blogApi.deleteScraped(id);
      toast.success('Article deleted successfully');
      fetchScrapedBlogs();
    } catch (err) {
      console.error('Error deleting:', err);
      toast.error('Failed to delete article');
    } finally {
      setDeleting(null);
    }
  };

  // Refresh function
  const handleRefresh = async () => {
    setCurrentPage(1);
    setSearch('');
    setSearchInput('');
    await fetchScrapedBlogs();
    toast.success('Refreshed!');
  };

  // Pagination handlers
  const goToPage = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const goToFirstPage = () => goToPage(1);
  const goToLastPage = () => goToPage(totalPages);
  const goToNextPage = () => goToPage(currentPage + 1);
  const goToPreviousPage = () => goToPage(currentPage - 1);

  // Generate page numbers for pagination
  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;
    let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let end = Math.min(totalPages, start + maxVisible - 1);
    
    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1);
    }
    
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  };

  return (
    <div className="flex min-h-screen bg-[var(--bg-primary)]">
      <AdminSidebar />

      <div className="flex-1 overflow-auto">

        {/* Header */}
        <div className="sticky top-0 z-30 bg-[var(--bg-primary)]/80 backdrop-blur-sm border-b border-[var(--border)] px-6 py-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="font-display font-bold text-2xl text-[var(--text-primary)]">
                Scraped News
              </h1>
              <p className="text-sm text-[var(--text-muted)]">
                Review scraped articles from Hindustan Times & Indian Express
              </p>
            </div>
            
            <button
              onClick={handleRefresh}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg hover:bg-[var(--bg-hover)] transition-colors"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
              <span className="text-sm">Refresh</span>
            </button>
          </div>
        </div>

        <div className="p-6 space-y-8">

          {/* Info Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-[var(--bg-card)] p-5 rounded-2xl border border-[var(--border)]">
              <div className="flex items-center gap-2 mb-2">
                <FileText size={18} className="text-blue-400" />
                <span className="text-sm text-[var(--text-muted)]">Total Scraped</span>
              </div>
              <div className="text-2xl font-bold">{totalItems}</div>
            </div>

            <div className="bg-[var(--bg-card)] p-5 rounded-2xl border border-[var(--border)]">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp size={18} className="text-green-400" />
                <span className="text-sm text-[var(--text-muted)]">Pending Review</span>
              </div>
              <div className="text-2xl font-bold">{totalItems}</div>
            </div>

            <div className="bg-[var(--bg-card)] p-5 rounded-2xl border border-[var(--border)]">
              <div className="flex items-center gap-2 mb-2">
                <Zap size={18} className="text-purple-400" />
                <span className="text-sm text-[var(--text-muted)]">Auto Source</span>
              </div>
              <div className="text-sm font-semibold">HT + Indian Express</div>
            </div>

            <div className="bg-[var(--bg-card)] p-5 rounded-2xl border border-[var(--border)]">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle size={18} className="text-emerald-400" />
                <span className="text-sm text-[var(--text-muted)]">Auto-Categorized</span>
              </div>
              <div className="text-sm">AI Powered</div>
            </div>
          </div>

          {/* Table */}
          <div className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border)] overflow-hidden">

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-5 border-b border-[var(--border)] gap-3">
              <div className="flex items-center gap-2">
                <TrendingUp size={17} className="text-[var(--accent)]" />
                <h2 className="font-semibold text-[var(--text-primary)]">Scraped Articles</h2>
                <span className="text-xs bg-[var(--bg-secondary)] px-2 py-0.5 rounded-full">
                  {totalItems} total
                </span>
              </div>

              <form onSubmit={handleSearch} className="relative w-full sm:w-80">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                <input
                  type="text"
                  placeholder="Search by title, category, source..."
                  value={searchInput}
                  onChange={e => setSearchInput(e.target.value)}
                  className="w-full pl-9 pr-20 py-2 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:border-[var(--accent)]"
                />
                {searchInput && (
                  <button
                    type="button"
                    onClick={clearSearch}
                    className="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-0.5 text-xs bg-[var(--bg-primary)] rounded hover:bg-[var(--bg-hover)]"
                  >
                    Clear
                  </button>
                )}
                <button type="submit" className="hidden">Search</button>
              </form>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-16">
                <div className="text-center">
                  <RefreshCw size={40} className="animate-spin mx-auto mb-4 text-[var(--accent)]" />
                  <p className="text-[var(--text-muted)]">Loading scraped articles...</p>
                </div>
              </div>
            ) : blogs.length === 0 ? (
              <div className="text-center py-16">
                <FileText size={40} className="mx-auto opacity-40 mb-3" />
                <p className="text-[var(--text-muted)] mb-2">No scraped articles found</p>
                <p className="text-xs text-[var(--text-muted)]">
                  {search ? 'Try a different search term' : 'Make sure your Python scraper is running and sending data to the backend'}
                </p>
              </div>
            ) : (
              <>
                <div className="divide-y divide-[var(--border)]">
                  {blogs.map((blog, i) => (
                    <motion.div
                      key={blog._id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.03 }}
                      className="flex items-start gap-4 p-4 hover:bg-[var(--bg-secondary)] group"
                    >
                      {/* Image */}
                      <div className="relative w-16 h-16 rounded-xl overflow-hidden shrink-0 bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center">
                        {blog.image ? (
                          <Image 
                            src={getImageUrl(blog.image)} 
                            fill 
                            alt="" 
                            className="object-cover"
                            onError={(e) => {
                              e.target.style.display = 'none';
                              e.target.parentElement.innerHTML = '<div class="text-xs text-center p-2">No Image</div>';
                            }}
                          />
                        ) : (
                          <div className="text-xs text-center text-[var(--text-muted)] p-2">
                            No Image
                          </div>
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <span className={`text-xs px-2 py-0.5 rounded-full border ${CATEGORY_COLORS[blog.category] || CATEGORY_COLORS.World}`}>
                            {blog.category || 'Uncategorized'}
                          </span>
                          
                          <span className="text-xs bg-purple-500/10 text-purple-400 border border-purple-500/20 px-2 py-0.5 rounded-full">
                            {blog.source || 'Unknown Source'}
                          </span>
                        </div>

                        <h3 className="text-sm font-semibold text-[var(--text-primary)] line-clamp-2 mb-1">
                          {blog.title}
                        </h3>

                        {blog.summary && (
                          <p className="text-xs text-[var(--text-muted)] line-clamp-2 mb-1">
                            {blog.summary}
                          </p>
                        )}

                        <div className="flex items-center gap-3 text-xs text-[var(--text-muted)]">
                          <span>🕒 {blog.time || formatDistanceToNow(new Date(blog.scrapedAt || blog.createdAt), { addSuffix: true })}</span>
                          {blog.link && (
                            <a 
                              href={blog.link} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="hover:text-[var(--accent)] transition-colors"
                            >
                              🔗 Original
                            </a>
                          )}
                        </div>
                      </div>

                      {/* Actions - Only View and Delete */}
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
                        {/* View/Preview Button */}
                        <Link href={`/admin/edit/${blog._id}?from=scraped`}>
                          <button 
                            className="p-2 rounded-lg hover:bg-[var(--accent)]/10 transition-colors"
                            title="View Details"
                          >
                            <Eye size={16} />
                          </button>
                        </Link>

                        {/* Delete Button */}
                        <button
                          onClick={() => handleDelete(blog._id)}
                          disabled={deleting === blog._id}
                          className="p-2 rounded-lg hover:bg-red-500/10 text-red-400 transition-colors disabled:opacity-50"
                          title="Delete Article"
                        >
                          {deleting === blog._id ? (
                            <RefreshCw size={16} className="animate-spin" />
                          ) : (
                            <Trash2 size={16} />
                          )}
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between px-6 py-4 border-t border-[var(--border)] bg-[var(--bg-secondary)]">
                    <div className="text-sm text-[var(--text-muted)]">
                      Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, totalItems)} of {totalItems} articles
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <button
                        onClick={goToFirstPage}
                        disabled={currentPage === 1}
                        className="p-2 rounded-lg hover:bg-[var(--bg-primary)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        <ChevronsLeft size={16} />
                      </button>
                      
                      <button
                        onClick={goToPreviousPage}
                        disabled={currentPage === 1}
                        className="p-2 rounded-lg hover:bg-[var(--bg-primary)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        <ChevronLeft size={16} />
                      </button>
                      
                      <div className="flex items-center gap-1">
                        {getPageNumbers().map(page => (
                          <button
                            key={page}
                            onClick={() => goToPage(page)}
                            className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                              currentPage === page
                                ? 'bg-[var(--accent)] text-white'
                                : 'hover:bg-[var(--bg-primary)] text-[var(--text-muted)]'
                            }`}
                          >
                            {page}
                          </button>
                        ))}
                      </div>
                      
                      <button
                        onClick={goToNextPage}
                        disabled={currentPage === totalPages}
                        className="p-2 rounded-lg hover:bg-[var(--bg-primary)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        <ChevronRight size={16} />
                      </button>
                      
                      <button
                        onClick={goToLastPage}
                        disabled={currentPage === totalPages}
                        className="p-2 rounded-lg hover:bg-[var(--bg-primary)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        <ChevronsRight size={16} />
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}