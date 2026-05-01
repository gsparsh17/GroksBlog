require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');

const authRoutes = require('./routes/auth');
const blogRoutes = require('./routes/blogs');
const scrapedRoutes = require('./routes/scraped');

const app = express();

// ======================
// Ensure uploads folder exists
// ======================
const uploadPath = path.join(__dirname, 'uploads');

if (!fs.existsSync(uploadPath)) {
  fs.mkdirSync(uploadPath, { recursive: true });
  console.log('📁 uploads folder created');
}

// ======================
// CORS Config
// ======================
const allowedOrigins = process.env.FRONTEND_URLS
  ? process.env.FRONTEND_URLS.split(',').map((origin) => origin.trim())
  : [
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      'https://news-forge-gamma.vercel.app',
      'https://www.groksblog.com'
    ];

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    return callback(new Error(`CORS blocked for origin: ${origin}`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/uploads', express.static(uploadPath));

app.use('/api/admin', authRoutes);
app.use('/api/blogs', blogRoutes);
app.use('/api/scraped_blogs', scrapedRoutes);

app.get('/api/health', (req, res) => {
  res.json({
    status: 'NewsForge API running',
    timestamp: new Date(),
    allowedOrigins,
  });
});

mongoose
  .connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/newsforge')
  .then(() => console.log('✅ MongoDB connected'))
  .catch((err) => console.error('❌ MongoDB error:', err));

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 NewsForge API running on port ${PORT}`);
  console.log('✅ Allowed CORS origins:', allowedOrigins);
});