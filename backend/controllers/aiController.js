const { GoogleGenAI } = require("@google/genai");

exports.enhanceContent = async (req, res) => {
  try {
    console.log("🔹 AI ROUTE HIT");

    const apiKey = process.env.GEMINI_API_KEY;

    console.log("🔹 KEY STATUS:", apiKey ? "FOUND" : "MISSING");

    if (!apiKey) {
      return res.status(500).json({
        success: false,
        message: "Gemini API key missing",
      });
    }

    const { title, excerpt = "", content } = req.body;

    if (!title || !content) {
      return res.status(400).json({
        success: false,
        message: "Title and content are required",
      });
    }

    // ✅ NEW SDK INIT
    const ai = new GoogleGenAI({
      apiKey,
    });

    const prompt = `
You are a professional editor for GroksBlog.

Rewrite the article professionally.

Requirements:
- Improve readability
- Improve SEO
- Keep facts accurate
- Human-like journalistic tone
- Add proper HTML formatting
- Use <p>, <h2>, <ul>, <li>, <strong>

Return ONLY valid JSON.

Format:
{
  "title": "",
  "excerpt": "",
  "content": "",
  "tags": [],
  "readTime": 0
}

ARTICLE:

Title:
${title}

Excerpt:
${excerpt}

Content:
${content}
`;

    console.log("🔹 Sending request to Gemini...");

    // ✅ NEW API FORMAT
    const result = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });

    const text = result.text;

    console.log("🔹 RAW AI RESPONSE:\n", text);

    const cleanText = text
      .replace(/```json/gi, "")
      .replace(/```/g, "")
      .trim();

    let parsed;

    try {
      parsed = JSON.parse(cleanText);
    } catch (err) {
      console.error("❌ JSON PARSE ERROR:", err);

      return res.status(500).json({
        success: false,
        message: "Invalid JSON returned from AI",
        raw: cleanText,
      });
    }

    // Safety fallback
    parsed.tags = Array.isArray(parsed.tags)
      ? parsed.tags
      : [];

    parsed.readTime =
      Number(parsed.readTime) > 0
        ? Number(parsed.readTime)
        : Math.max(
            1,
            Math.ceil(
              parsed.content.replace(/<[^>]*>/g, "").split(" ").length / 200
            )
          );

    console.log("✅ AI SUCCESS");

    return res.json({
      success: true,
      data: parsed,
    });

  } catch (error) {
    console.error("🔥 GEMINI FULL ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "AI enhancement failed",
      error: error.message,
    });
  }
};