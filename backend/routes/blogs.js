const { enhanceContent } = require('../controllers/aiController');

const express = require("express");
const router = express.Router();
const multer = require("multer");

const authMiddleware = require("../middleware/auth");

const {
  getBlogs,
  getBlog,
  createBlog,
  updateBlog,
  deleteBlog,
  getStats,
} = require("../controllers/blogController");

// ================= MULTER CONFIG ================= //

// ✅ Use memory storage (Cloudinary upload later)
const storage = multer.memoryStorage();

// ✅ File filter
const fileFilter = (req, file, cb) => {
  if (!file) return cb(null, true);

  const allowedTypes = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
    "image/gif",
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Only image files are allowed"), false);
  }
};

// ✅ Multer instance
const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

// ✅ Custom wrapper for error handling
const uploadSingleImage = (req, res, next) => {
  const handler = upload.single("image");

  handler(req, res, function (err) {
    if (err instanceof multer.MulterError) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({
          success: false,
          message: "Image must be under 5MB",
        });
      }

      return res.status(400).json({
        success: false,
        message: err.message || "Upload error",
      });
    }

    if (err) {
      return res.status(400).json({
        success: false,
        message: err.message || "Only image files are allowed",
      });
    }

    next();
  });
};

// ================= ROUTES ================= //

// 🔓 Public Routes
router.get("/", getBlogs);

// 🔐 Protected Routes
router.get("/stats", authMiddleware, getStats);

// ================= MANUAL BLOG ROUTES ================= //

router.post(
  "/",
  authMiddleware,
  uploadSingleImage,
  createBlog
);

router.post('/ai-enhance', authMiddleware, enhanceContent);

router.put(
  "/:id",
  authMiddleware,
  uploadSingleImage,
  updateBlog
);

router.delete("/:id", authMiddleware, deleteBlog);

// ⚠️ KEEP THIS LAST (VERY IMPORTANT)
router.get("/:id", getBlog);

module.exports = router;