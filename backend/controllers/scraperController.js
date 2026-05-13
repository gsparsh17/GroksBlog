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
// Helper function to categorize articles
// ======================
function categorizeArticle(title, summary, source) {
  const titleLower = (title || '').toLowerCase();
  const summaryLower = (summary || '').toLowerCase();
  const sourceLower = (source || '').toLowerCase();
  
  // AUTOMOBILE CATEGORY - Cars, Bikes, Mobile Phones, Gadgets
  const automobileKeywords = [
    // Car related
    'car', 'cars', 'auto', 'automobile', 'vehicle', 'suv', 'sedan', 'hatchback', 
    'ev', 'electric vehicle', 'hybrid', 'petrol', 'diesel', 'engine', 'transmission',
    'toyota', 'honda', 'hyundai', 'maruti', 'suzuki', 'tata', 'mahindra', 'kia',
    'hyundai', 'ford', 'bmw', 'mercedes', 'audi', 'volkswagen', 'renault', 'nissan',
    'lexus', 'jeep', 'mg', 'citroen', 'skoda', 'ferrari', 'lamborghini', 'porsche',
    
    // Bike related
    'bike', 'bikes', 'motorcycle', 'scooter', 'moped', 'two-wheeler', '2-wheeler',
    'hero', 'honda', 'bajaj', 'tvs', 'royal enfield', 'ktm', 'yamaha', 'suzuki',
    'ducati', 'triumph', 'harley', 'jawa', 'vespa', 'apache', 'pulsar', 'splendor',
    'activa', 'access', 'ntorq', 'rizta', 'ather', 'ola', 'electric scooter',
    
    // Mobile phones related
    'mobile', 'phone', 'smartphone', 'iphone', 'android', 'samsung', 'google pixel',
    'oneplus', 'xiaomi', 'mi', 'redmi', 'realme', 'oppo', 'vivo', 'motorola',
    'moto', 'nokia', 'lg', 'sony', 'asus', 'poco', 'iqoo', 'nothing phone',
    'foldable', 'flip phone', '5g', 'camera phone', 'gaming phone',
    
    // Gadgets related
    'gadget', 'gadgets', 'tech', 'device', 'wearable', 'smartwatch', 'watch',
    'fitness tracker', 'earbuds', 'headphones', 'speaker', 'tablet', 'ipad',
    'laptop', 'macbook', 'chromebook', 'accessory', 'charger', 'power bank',
    'smart home', 'smart device', 'iot', 'voice assistant', 'alexa', 'google home'
  ];
  
  // Check for automobile keywords
  for (const keyword of automobileKeywords) {
    if (titleLower.includes(keyword) || summaryLower.includes(keyword)) {
      return 'Automobile';
    }
  }
  
  // Check for auto websites
  if (sourceLower.includes('bikedekho') || sourceLower.includes('rushlane') || 
      sourceLower.includes('autocar') || sourceLower.includes('car') ||
      sourceLower.includes('bike')) {
    return 'Automobile';
  }
  
  // Check for tech websites with mobile/gadget content
  if ((sourceLower.includes('gadgets360') || sourceLower.includes('moneycontrol')) &&
      (titleLower.includes('mobile') || titleLower.includes('phone') || 
       titleLower.includes('gadget') || titleLower.includes('smartphone'))) {
    return 'Automobile';
  }
  
  // Other categories
  const categoryKeywords = {
    'Technology': ['tech', 'technology', 'software', 'app', 'digital', 'ai', 'coding', 'programming', 'it', 'computer'],
    'AI': ['ai', 'artificial intelligence', 'machine learning', 'chatgpt', 'openai', 'gemini', 'llm', 'deep learning'],
    'Politics': ['politics', 'election', 'government', 'minister', 'pm', 'congress', 'bjp', 'modi', 'rahul', 'nda', 'india alliance'],
    'Science': ['science', 'space', 'research', 'discovery', 'scientist', 'nasa', 'isro', 'rocket', 'mars', 'moon'],
    'Business': ['business', 'economy', 'market', 'stock', 'company', 'startup', 'finance', 'investment', 'share', 'sensex', 'nifty'],
    'Entertainment': ['movie', 'film', 'actor', 'actress', 'bollywood', 'hollywood', 'netflix', 'amazon prime', 'hotstar', 'series', 'ott'],
    'Health': ['health', 'hospital', 'covid', 'vaccine', 'disease', 'treatment', 'medical', 'doctor', 'fitness', 'wellness'],
    'Sports': ['sports', 'cricket', 'football', 'match', 'olympics', 'tournament', 'ipl', 'world cup', 'tennis', 'badminton']
  };
  
  for (const [cat, keywords] of Object.entries(categoryKeywords)) {
    for (const keyword of keywords) {
      if (titleLower.includes(keyword) || summaryLower.includes(keyword)) {
        return cat;
      }
    }
  }
  
  return 'World';
}

// ======================
// POST endpoint for Python scraper to send data
// ======================
router.post('/scraped/ingest', async (req, res) => {
  try {
    const { source, title, link, time, summary, image, author } = req.body;
    
    console.log('📥 Received article:', { source, title: title?.substring(0, 50), link });
    
    // Validate required fields
    if (!source) {
      return res.status(400).json({ message: 'Source is required' });
    }
    if (!title) {
      return res.status(400).json({ message: 'Title is required' });
    }
    if (!link) {
      return res.status(400).json({ message: 'Link is required' });
    }
    
    // Check if article already exists
    const existing = await ScrapedNews.findOne({ link });
    if (existing) {
      return res.status(200).json({ message: 'Article already exists', id: existing._id });
    }
    
    // Auto-categorize using the helper function
    const category = categorizeArticle(title, summary, source);
    
    console.log(`🏷️ Categorized as: ${category} (Source: ${source})`);
    
    const scrapedNews = new ScrapedNews({
      source: source,
      title: title,
      link: link,
      time: time || new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      summary: (summary || title).substring(0, 1000),
      category: category,
      image: image || '',
      author: author || 'News Desk'
    });
    
    await scrapedNews.save();
    
    console.log('✅ Article saved:', scrapedNews._id);
    
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
    
    const scrapedNews = await ScrapedNews.findById(req.params.id);
    if (!scrapedNews) {
      return res.status(404).json({ message: 'News not found' });
    }
    
    // Update fields if provided
    if (req.body.title) scrapedNews.title = req.body.title;
    if (req.body.content) scrapedNews.summary = req.body.content;
    if (req.body.excerpt) scrapedNews.summary = req.body.excerpt;
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
    
    const scrapedNews = await ScrapedNews.findById(req.params.id);
    if (!scrapedNews) {
      return res.status(404).json({ message: 'News not found' });
    }
    
    // Extract data from FormData
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
    console.log('  - Category:', category);
    
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
        
        // Use the categorizeArticle function
        const category = categorizeArticle(article.title, article.summary, article.source);
        
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