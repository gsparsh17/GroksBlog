import axios from 'axios';
import Cookies from 'js-cookie';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
const CLOUDINARY_CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;

const api = axios.create({
  baseURL: `${API_URL}/api`
});

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = Cookies.get('admin_token');

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

// Redirect to login on 401/403
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 || error.response?.status === 403) {
      Cookies.remove('admin_token');

      if (
        typeof window !== 'undefined' &&
        window.location.pathname.startsWith('/admin')
      ) {
        window.location.href = '/admin/login';
      }
    }

    return Promise.reject(error);
  }
);

export const blogApi = {
  getAll: (params) => api.get('/blogs', { params }),
  getById: (id) => api.get(`/blogs/${id}`),

  create: (formData) =>
    api.post('/blogs', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  update: (id, formData) =>
    api.put(`/blogs/${id}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  delete: (id) => api.delete(`/blogs/${id}`),
  getStats: () => api.get('/blogs/stats'),

  // ✅ ADD THIS
  enhanceContent: (data) => api.post('/blogs/ai-enhance', data),

  getScraped: (page = 1, limit = 20, search = '') =>
    api.get('/scraped_blogs/scraped', { params: { page, limit, search } }),

  publishScraped: (id) => api.put(`/scraped_blogs/publish/${id}`),
  deleteScraped: (id) => api.delete(`/scraped_blogs/scraped/${id}`),
  getScrapedById: (id) => api.get(`/scraped_blogs/scraped/${id}`),

  publishScrapedWithData: (id, formData) =>
    api.put(`/scraped_blogs/publish/${id}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
};

export const authApi = {
  login: (username, password) => api.post('/admin/login', { username, password }),
  verify: () => api.get('/admin/verify'),
};

export const CATEGORIES = [
  'All',
  'Technology',
  'AI',
  'Sports',
  'Politics',
  'Science',
  'Business',
  'Entertainment',
  'Health',
  'World',
];

export const CATEGORY_COLORS = {
  Technology: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  AI: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  Sports: 'bg-green-500/10 text-green-400 border-green-500/20',
  Politics: 'bg-red-500/10 text-red-400 border-red-500/20',
  Science: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
  Business: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  Entertainment: 'bg-pink-500/10 text-pink-400 border-pink-500/20',
  Health: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  World: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
};

export const getImageUrl = (imagePath) => {
  if (!imagePath) return "";

  if (imagePath.startsWith("http")) {
    return imagePath;
  }

  if (imagePath.startsWith("/uploads/")) {
    return `${API_URL}${imagePath}`;
  }

  if (!CLOUDINARY_CLOUD_NAME) {
    console.error("Cloudinary cloud name missing");
    return "";
  }

  const normalizedId = String(imagePath).trim().replace(/^\/+/, "");

  return `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/image/upload/f_auto,q_auto/${normalizedId}`;
};