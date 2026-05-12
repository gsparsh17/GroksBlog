const express = require('express');
const router = express.Router();
const path = require('path');
const multer = require('multer');
const ScrapedNews = require('../models/ScrapedNews');
const Blog = require('../models/Blog');
const authMiddleware = require('../middleware/auth');

// ======================
// Configure multer for file uploads
// ======================
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, 'scraped-' + uniqueSuffix + ext);
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('Only image files are allowed (jpeg, jpg, png, webp)'));
  }
});

// ======================
// POST endpoint for Python scraper to send data
// ======================
router.post('/scraped/ingest', async (req, res) => {
  try {
    const { source, title, link, time, summary } = req.body;
    
    // Check if article already exists
    const existing = await ScrapedNews.findOne({ link });
    if (existing) {
      return res.status(200).json({ message: 'Article already exists', id: existing._id });
    }
    
    // Auto-categorize based on title/content
    let category = 'World';
    const titleLower = title.toLowerCase();
    const summaryLower = (summary || '').toLowerCase();
    
    const categoryKeywords = {
      'Technology': ['tech', 'technology', 'software', 'app', 'digital', 'ai', 'coding'],
      'AI': ['ai', 'artificial intelligence', 'machine learning', 'chatgpt', 'openai'],
      'Sports': ['sports', 'cricket', 'football', 'match', 'olympics', 'tournament'],
      'Politics': ['politics', 'election', 'government', 'minister', 'pm', 'congress', 'bjp'],
      'Science': ['science', 'space', 'research', 'discovery', 'scientist', 'nasa'],
      'Business': ['business', 'economy', 'market', 'stock', 'company', 'startup', 'finance'],
      'Entertainment': ['movie', 'film', 'actor', 'actress', 'bollywood', 'hollywood', 'netflix'],
      'Health': ['health', 'hospital', 'covid', 'vaccine', 'disease', 'treatment', 'medical']
    };
    
    for (const [cat, keywords] of Object.entries(categoryKeywords)) {
      if (keywords.some(keyword => titleLower.includes(keyword) || summaryLower.includes(keyword))) {
        category = cat;
        break;
      }
    }
    
    const scrapedNews = new ScrapedNews({
      source,
      title,
      link,
      time,
      summary,
      category
    });
    
    await scrapedNews.save();
    
    res.status(201).json({
      success: true,
      message: 'News scraped successfully',
      data: scrapedNews
    });
  } catch (error) {
    console.error('Error saving scraped news:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// ======================
// GET all scraped news (for admin panel)
// ======================
router.get('/scraped', authMiddleware, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const search = req.query.search || '';
    
    let query = { isPublished: false };
    
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { summary: { $regex: search, $options: 'i' } },
        { source: { $regex: search, $options: 'i' } },
        { category: { $regex: search, $options: 'i' } }
      ];
    }
    
    const skip = (page - 1) * limit;
    
    const scrapedNews = await ScrapedNews.find(query)
      .sort({ scrapedAt: -1 })
      .limit(limit)
      .skip(skip);
    
    const total = await ScrapedNews.countDocuments(query);
    
    res.json({
      success: true,
      blogs: scrapedNews,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error('Error fetching scraped news:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ======================
// GET single scraped news
// ======================
router.get('/scraped/:id', authMiddleware, async (req, res) => {
  try {
    const scrapedNews = await ScrapedNews.findById(req.params.id);
    if (!scrapedNews) {
      return res.status(404).json({ message: 'News not found' });
    }
    res.json({ success: true, blog: scrapedNews });
  } catch (error) {
    console.error('Error fetching scraped news:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ======================
// UPDATE scraped news draft (save without publishing)
// ======================
router.put('/scraped/:id', authMiddleware, upload.single('image'), async (req, res) => {
  try {
    console.log('📝 Updating scraped draft...');
    console.log('Request body:', req.body);
    console.log('Uploaded file:', req.file);
    
    const scrapedNews = await ScrapedNews.findById(req.params.id);
    if (!scrapedNews) {
      return res.status(404).json({ message: 'News not found' });
    }
    
    // Update fields if provided
    if (req.body.title) scrapedNews.title = req.body.title;
    if (req.body.content) scrapedNews.summary = req.body.content;
    if (req.body.excerpt) scrapedNews.excerpt = req.body.excerpt;
    if (req.body.category) scrapedNews.category = req.body.category;
    
    // Handle image
    if (req.file) {
      scrapedNews.image = `/uploads/${req.file.filename}`;
    } else if (req.body.removeImage === 'true') {
      scrapedNews.image = '';
    }
    
    await scrapedNews.save();
    
    res.json({
      success: true,
      message: 'Draft saved successfully',
      blog: scrapedNews
    });
  } catch (error) {
    console.error('Error saving draft:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// ======================
// PUBLISH scraped news with custom content (AI enhanced)
// ======================
router.put('/publish/:id', authMiddleware, upload.single('image'), async (req, res) => {
  try {
    console.log('📦 Publishing scraped news with content...');
    console.log('Request body fields:', req.body);
    console.log('Uploaded file:', req.file);
    
    const scrapedNews = await ScrapedNews.findById(req.params.id);
    if (!scrapedNews) {
      return res.status(404).json({ message: 'News not found' });
    }
    
    // Extract data from FormData (req.body contains the text fields)
    let title = req.body.title || scrapedNews.title;
    let content = req.body.content || scrapedNews.summary || 'Full article: ' + scrapedNews.link;
    let excerpt = req.body.excerpt || scrapedNews.summary?.substring(0, 200) || scrapedNews.title;
    let category = req.body.category || scrapedNews.category;
    let tags = [];
    let featured = false;
    let image = scrapedNews.image || '';
    
    // Parse tags if provided
    if (req.body.tags) {
      try {
        tags = typeof req.body.tags === 'string' ? JSON.parse(req.body.tags) : req.body.tags;
      } catch (e) {
        tags = [];
      }
    }
    
    // Parse featured flag
    if (req.body.featured) {
      featured = req.body.featured === 'true';
    }
    
    console.log('📝 Final content to publish:');
    console.log('  - Title:', title);
    console.log('  - Excerpt:', excerpt?.substring(0, 100) + '...');
    console.log('  - Category:', category);
    console.log('  - Tags:', tags);
    console.log('  - Featured:', featured);
    
    // Handle image upload
    if (req.file) {
      image = `/uploads/${req.file.filename}`;
      console.log('  - New image uploaded:', image);
    } else if (req.body.removeImage === 'true') {
      image = '';
      console.log('  - Image removed');
    } else if (req.body.existingImage) {
      image = req.body.existingImage;
      console.log('  - Keeping existing image:', image);
    }
    
    // Create a new blog post from scraped data with custom content
    const blog = new Blog({
      title: title,
      content: content,
      excerpt: excerpt,
      category: category,
      tags: tags,
      featured: featured,
      author: 'Admin',
      sourceName: scrapedNews.source,
      sourceUrl: scrapedNews.link,
      image: image,
      views: 0,
      isScraped: true,
      originalScrapedId: scrapedNews._id,
      sourceType: 'scraped',
      status: 'published'
    });
    
    await blog.save();
    
    // Mark scraped news as published
    scrapedNews.isPublished = true;
    scrapedNews.publishedBlogId = blog._id;
    await scrapedNews.save();
    
    console.log('✅ Article published successfully! ID:', blog._id);
    
    res.json({
      success: true,
      message: 'News published successfully with AI enhancements! ✨',
      blog
    });
  } catch (error) {
    console.error('Error publishing news:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// ======================
// DELETE scraped news
// ======================
router.delete('/scraped/:id', authMiddleware, async (req, res) => {
  try {
    await ScrapedNews.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'News deleted successfully' });
  } catch (error) {
    console.error('Error deleting scraped news:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ======================
// Bulk ingest endpoint for multiple articles
// ======================
router.post('/scraped/bulk-ingest', async (req, res) => {
  try {
    const { articles } = req.body;
    const results = {
      added: 0,
      existing: 0,
      errors: 0
    };
    
    for (const article of articles) {
      try {
        const existing = await ScrapedNews.findOne({ link: article.link });
        if (existing) {
          results.existing++;
          continue;
        }
        
        // Auto-categorize
        let category = 'World';
        const titleLower = article.title.toLowerCase();
        const summaryLower = (article.summary || '').toLowerCase();
        
        const categoryKeywords = {
          'Technology': ['tech', 'technology', 'software', 'app', 'digital', 'ai', 'coding'],
          'AI': ['ai', 'artificial intelligence', 'machine learning', 'chatgpt', 'openai'],
          'Sports': ['sports', 'cricket', 'football', 'match', 'olympics', 'tournament'],
          'Politics': ['politics', 'election', 'government', 'minister', 'pm', 'congress', 'bjp'],
          'Science': ['science', 'space', 'research', 'discovery', 'scientist', 'nasa'],
          'Business': ['business', 'economy', 'market', 'stock', 'company', 'startup', 'finance'],
          'Entertainment': ['movie', 'film', 'actor', 'actress', 'bollywood', 'hollywood', 'netflix'],
          'Health': ['health', 'hospital', 'covid', 'vaccine', 'disease', 'treatment', 'medical']
        };
        
        for (const [cat, keywords] of Object.entries(categoryKeywords)) {
          if (keywords.some(keyword => titleLower.includes(keyword) || summaryLower.includes(keyword))) {
            category = cat;
            break;
          }
        }
        
        const scrapedNews = new ScrapedNews({
          ...article,
          category
        });
        
        await scrapedNews.save();
        results.added++;
      } catch (err) {
        results.errors++;
        console.error('Error saving article:', err);
      }
    }
    
    res.json({
      success: true,
      message: `Added ${results.added} new articles, ${results.existing} already existed, ${results.errors} errors`,
      results
    });
  } catch (error) {
    console.error('Bulk ingest error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;