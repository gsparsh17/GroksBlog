const Blog = require('../models/Blog');
const cloudinary = require('../config/cloudinary');
const streamifier = require('streamifier');

const uploadToCloudinary = (fileBuffer, folder = 'blogs') => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: 'image',
        transformation: [
          { width: 1200, height: 630, crop: 'fill', quality: 'auto' },
          { fetch_format: 'auto' }
        ]
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );

    streamifier.createReadStream(fileBuffer).pipe(stream);
  });
};

const deleteFromCloudinary = async (publicId) => {
  if (!publicId) return;
  await cloudinary.uploader.destroy(publicId);
};

const normalizeTags = (tags) => {
  if (!tags) return [];
  const tagArray = Array.isArray(tags) ? tags : tags.split(',');
  return tagArray.map((t) => t.trim()).filter(Boolean);
};

// GET all blogs (public)
const getBlogs = async (req, res) => {
  try {
    const { category, search, featured, limit = 10, page = 1 } = req.query;
    const query = {};

    if (category && category !== 'All') query.category = category;
    if (featured === 'true') query.featured = true;

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { excerpt: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } },
      ];
    }

    const total = await Blog.countDocuments(query);
    const blogs = await Blog.find(query)
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit))
      .select('-content');

    res.json({
      success: true,
      blogs,
      pagination: {
        total,
        page: Number(page),
        pages: Math.ceil(total / Number(limit)),
        limit: Number(limit),
      },
    });
  } catch (error) {
    console.error('Get blogs error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// GET single blog (public)
const getBlog = async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);

    if (!blog) {
      return res.status(404).json({ message: 'Blog not found' });
    }

    await blog.incrementViews();

    res.json({ success: true, blog });
  } catch (error) {
    if (error.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Blog not found' });
    }

    console.error('Get blog error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// CREATE blog (admin only)
const createBlog = async (req, res) => {
  try {
    const { title, excerpt, content, category, featured, tags } = req.body;

    const blogData = {
      title,
      excerpt,
      content,
      category,
      featured: featured === 'true' || featured === true,
      tags: normalizeTags(tags),
    };

    if (req.file) {
      const uploaded = await uploadToCloudinary(req.file.buffer, 'blogs');
      blogData.image = uploaded.secure_url;
      blogData.imagePublicId = uploaded.public_id;
    }

    const blog = new Blog(blogData);
    await blog.save();

    res.status(201).json({ success: true, blog });
  } catch (error) {
    console.error('Create blog error:', error);
    
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map((e) => e.message);
      return res.status(400).json({ message: errors.join(', ') });
    }

    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// UPDATE blog (admin only)
const updateBlog = async (req, res) => {
  try {
    const { title, excerpt, content, category, featured, tags } = req.body;

    const blog = await Blog.findById(req.params.id);

    if (!blog) {
      return res.status(404).json({ message: 'Blog not found' });
    }

    blog.title = title;
    blog.excerpt = excerpt;
    blog.content = content;
    blog.category = category;
    blog.featured = featured === 'true' || featured === true;
    blog.tags = normalizeTags(tags);

    if (req.file) {
      // Delete old image if exists
      if (blog.imagePublicId) {
        await deleteFromCloudinary(blog.imagePublicId);
      }

      // Upload new image
      const uploaded = await uploadToCloudinary(req.file.buffer, 'blogs');
      blog.image = uploaded.secure_url;
      blog.imagePublicId = uploaded.public_id;
      console.log("FILE RECEIVED:", req.file);
    }

    await blog.save();

    res.json({ success: true, blog });
  } catch (error) {
    console.error('Update blog error:', error);
    
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map((e) => e.message);
      return res.status(400).json({ message: errors.join(', ') });
    }

    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// DELETE blog (admin only)
const deleteBlog = async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);

    if (!blog) {
      return res.status(404).json({ message: 'Blog not found' });
    }

    // Delete image from Cloudinary
    if (blog.imagePublicId) {
      await deleteFromCloudinary(blog.imagePublicId);
    }

    await blog.deleteOne();

    res.json({ success: true, message: 'Blog deleted successfully' });
  } catch (error) {
    console.error('Delete blog error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// GET blog stats (admin only)
const getStats = async (req, res) => {
  try {
    const total = await Blog.countDocuments();
    const featured = await Blog.countDocuments({ featured: true });

    const byCategory = await Blog.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    const totalViews = await Blog.aggregate([
      { $group: { _id: null, total: { $sum: '$views' } } },
    ]);

    const recent = await Blog.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select('title category createdAt views');

    res.json({
      success: true,
      stats: {
        total,
        featured,
        totalViews: totalViews[0]?.total || 0,
        byCategory,
        recent,
      },
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = {
  getBlogs,
  getBlog,
  createBlog,
  updateBlog,
  deleteBlog,
  getStats,
};