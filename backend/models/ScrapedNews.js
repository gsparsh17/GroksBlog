const mongoose = require('mongoose');

const scrapedNewsSchema = new mongoose.Schema({
  source: {
    type: String,
    required: true,
    enum: ['Hindustan Times', 'Indian Express']
  },
  title: {
    type: String,
    required: true
  },
  link: {
    type: String,
    required: true,
    unique: true
  },
  time: {
    type: String
  },
  summary: {
    type: String,
    default: ''
  },
  category: {
    type: String,
    default: 'World'
  },
  image: {
    type: String,
    default: ''
  },
  isPublished: {
    type: Boolean,
    default: false
  },
  publishedBlogId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Blog'
  },
  scrapedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Create index for better search performance
scrapedNewsSchema.index({ title: 'text', summary: 'text' });

module.exports = mongoose.model('ScrapedNews', scrapedNewsSchema);