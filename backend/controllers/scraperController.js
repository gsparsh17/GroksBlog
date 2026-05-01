const Blog = require("../models/Blog");


// ================= CREATE SCRAPED BLOG ================= //
exports.createScrapedBlog = async (req, res) => {
  try {
    const {
      title,
      summary,
      content,
      sourceName,
      sourceUrl,
      image,
      category,
      time,
    } = req.body;

    // ❌ Validation
    if (!title || !sourceUrl) {
      return res.status(400).json({
        success: false,
        message: "Title and sourceUrl are required",
      });
    }

    // ❌ Prevent empty content
    if (!summary && !content) {
      return res.status(400).json({
        success: false,
        message: "Content or summary is required",
      });
    }

    // 🔒 Duplicate check
    const existing = await Blog.findOne({ sourceUrl });
    if (existing) {
      return res.status(200).json({
        success: true,
        message: "Already exists (skipped)",
      });
    }

    // 🧠 Safe category fallback
    const allowedCategories = [
      "Technology",
      "AI",
      "Sports",
      "Politics",
      "Science",
      "Business",
      "Entertainment",
      "Health",
      "World",
    ];

    const finalCategory = allowedCategories.includes(category)
      ? category
      : "World";

    // 🧠 Prepare excerpt
    const excerpt =
      summary ||
      (content ? content.replace(/<[^>]*>/g, "").slice(0, 150) : "No summary available");

    // 🧠 Create blog
    const blog = new Blog({
      title,
      excerpt,
      content: content || summary,
      category: finalCategory,

      sourceType: "scraped",
      status: "draft",

      sourceName: sourceName || "Unknown",
      sourceUrl,

      image: image || null,
    });

    await blog.save();

    res.status(201).json({
      success: true,
      message: "Scraped blog saved",
      blog,
    });

  } catch (error) {
    console.error("Create scraped blog error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to save scraped blog",
    });
  }
};



// ================= GET SCRAPED BLOGS ================= //
exports.getScrapedBlogs = async (req, res) => {
  try {
    const blogs = await Blog.find({
      sourceType: "scraped",
      status: "draft",
    })
      .sort({ createdAt: -1 })
      .select("-__v"); // cleaner response

    res.status(200).json({
      success: true,
      count: blogs.length,
      blogs,
    });

  } catch (error) {
    console.error("Get scraped blogs error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch scraped blogs",
    });
  }
};



// ================= PUBLISH SCRAPED BLOG ================= //
exports.publishScrapedBlog = async (req, res) => {
  try {
    const { id } = req.params;

    const blog = await Blog.findById(id);

    if (!blog) {
      return res.status(404).json({
        success: false,
        message: "Blog not found",
      });
    }

    // ❌ Only scraped blogs allowed
    if (blog.sourceType !== "scraped") {
      return res.status(400).json({
        success: false,
        message: "Not a scraped blog",
      });
    }

    // ❌ Already published check
    if (blog.status === "published") {
      return res.status(400).json({
        success: false,
        message: "Blog already published",
      });
    }

    // 🟢 Publish
    blog.status = "published";

    await blog.save();

    res.status(200).json({
      success: true,
      message: "Blog published successfully",
      blog,
    });

  } catch (error) {
    console.error("Publish blog error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to publish blog",
    });
  }
};