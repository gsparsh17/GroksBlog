const mongoose = require('mongoose');
const slugify = require('slugify');

const blogSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },

    slug: {
      type: String,
      unique: true,
      lowercase: true,
    },

    excerpt: {
      type: String,
      required: [true, 'Excerpt is required'],
      maxlength: [500, 'Excerpt cannot exceed 500 characters'],
    },

    content: {
      type: String,
      required: [true, 'Content is required'],
    },

    category: {
      type: String,
      required: [true, 'Category is required'],
      enum: [
        'Technology',
        'AI',
        'Sports',
        'Politics',
        'Science',
        'Business',
        'Entertainment',
        'Health',
        'World',
      ],
      default: 'Technology',
    },

    image: {
      type: String,
      default: null,
    },

    imagePublicId: {
      type: String,
      default: null,
    },

    featured: {
      type: Boolean,
      default: false,
    },

    views: {
      type: Number,
      default: 0,
    },

    tags: [
      {
        type: String,
        trim: true,
      },
    ],

    readTime: {
      type: Number,
      default: 5,
    },

    // ================= SCRAPER FIELDS ================= //

    sourceType: {
      type: String,
      enum: ['manual', 'scraped'],
      default: 'manual',
    },

    status: {
      type: String,
      enum: ['draft', 'published'],
      default: function () {
        return this.sourceType === 'scraped' ? 'draft' : 'published';
      },
    },

    sourceName: {
      type: String, // e.g. "Hindustan Times"
      default: null,
    },

    sourceUrl: {
      type: String,
      index: true, // ✅ safer than unique
    },

    isEdited: {
      type: Boolean,
      default: false,
    },

    aiGenerated: {
      type: Boolean,
      default: false,
    },
  isScraped: {
    type: Boolean,
    default: false
  },
  originalScrapedId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ScrapedNews'
  },
  sourceName: {
    type: String
  },
  sourceUrl: {
    type: String
  }
}, { timestamps: true });


// ================= MIDDLEWARE ================= //

blogSchema.pre('save', function (next) {

  // 🔥 Generate slug
  if (this.isModified('title')) {
    this.slug = `${slugify(this.title, {
      lower: true,
      strict: true,
    })}-${Date.now()}`;
  }

  // 🔥 Calculate read time
  if (this.isModified('content')) {
    const plainText = this.content.replace(/<[^>]*>/g, ' ').trim();
    const wordCount = plainText.split(/\s+/).filter(Boolean).length;
    this.readTime = Math.max(1, Math.ceil(wordCount / 200));
  }

  // 🔥 Detect admin edits on scraped blogs
  if (
    this.sourceType === 'scraped' &&
    (this.isModified('title') ||
      this.isModified('content') ||
      this.isModified('excerpt'))
  ) {
    this.isEdited = true;
  }

  next();
});


// ================= METHODS ================= //

blogSchema.methods.incrementViews = async function () {
  this.views += 1;
  await this.save();
};


module.exports = mongoose.model('Blog', blogSchema);