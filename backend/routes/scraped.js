const express = require('express');
const router = express.Router();
const ScrapedNews = require('../models/ScrapedNews');
const Blog = require('../models/Blog');
const authMiddleware = require('../middleware/auth');

// POST endpoint for your Python scraper to send data
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

// GET all scraped news (for admin panel)
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

// GET single scraped news
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

// UPDATED: Publish scraped news with custom content (AI enhanced)
router.put('/publish/:id', authMiddleware, async (req, res) => {
  try {
    const scrapedNews = await ScrapedNews.findById(req.params.id);
    if (!scrapedNews) {
      return res.status(404).json({ message: 'News not found' });
    }
    
    // Check if it's a FormData request with custom content
    let title = scrapedNews.title;
    let content = scrapedNews.summary || 'Full article: ' + scrapedNews.link;
    let excerpt = scrapedNews.summary?.substring(0, 200) || scrapedNews.title;
    let category = scrapedNews.category;
    let image = scrapedNews.image || '';
    
    // If custom data is provided in the request body (JSON)
    if (req.body.title) {
      title = req.body.title;
    }
    if (req.body.content) {
      content = req.body.content;
    }
    if (req.body.excerpt) {
      excerpt = req.body.excerpt;
    }
    if (req.body.category) {
      category = req.body.category;
    }
    if (req.body.image) {
      image = req.body.image;
    }
    
    // Create a new blog post from scraped data with custom content
    const blog = new Blog({
      title: title,
      content: content,
      excerpt: excerpt,
      category: category,
      author: 'Admin',
      sourceName: scrapedNews.source,
      sourceUrl: scrapedNews.link,
      image: image,
      views: 0,
      isScraped: true,
      originalScrapedId: scrapedNews._id
    });
    
    await blog.save();
    
    // Mark scraped news as published
    scrapedNews.isPublished = true;
    scrapedNews.publishedBlogId = blog._id;
    await scrapedNews.save();
    
    res.json({
      success: true,
      message: 'News published successfully',
      blog
    });
  } catch (error) {
    console.error('Error publishing news:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// DELETE scraped news
router.delete('/scraped/:id', authMiddleware, async (req, res) => {
  try {
    await ScrapedNews.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'News deleted successfully' });
  } catch (error) {
    console.error('Error deleting scraped news:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Bulk ingest endpoint for multiple articles
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