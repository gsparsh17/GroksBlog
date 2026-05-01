const { GoogleGenerativeAI } = require("@google/generative-ai");

// ❌ DO NOT initialize here

exports.enhanceContent = async (req, res) => {
  try {
    console.log("🔹 AI ROUTE HIT");

    // ✅ ALWAYS read env inside function
    const apiKey = process.env.GEMINI_API_KEY;

    console.log("🔹 KEY STATUS:", apiKey ? "FOUND" : "MISSING");

    if (!apiKey) {
      return res.status(500).json({
        message: "Gemini API key not found in environment",
      });
    }

    const { title, excerpt, content } = req.body;

    if (!title || !content) {
      return res.status(400).json({
        message: "Title and content are required",
      });
    }

    // ✅ Initialize here (FIXED)
    const genAI = new GoogleGenerativeAI(apiKey);

    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
    });

    const prompt = `
You are a professional news editor.

Rewrite the following article:
- Improve readability
- Make it engaging and human-like
- Improve SEO
- Keep facts intact
- Add headings and structure

Return ONLY JSON:
{
  "title": "",
  "excerpt": "",
  "content": ""
}

Title: ${title}
Excerpt: ${excerpt}
Content: ${content}
`;

    console.log("🔹 Sending request to Gemini...");

    const result = await model.generateContent(prompt);
    const text = result.response.text();

    console.log("🔹 RAW AI RESPONSE:\n", text);

    // ✅ CLEAN markdown
    let cleanText = text
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();

    let parsed;

    try {
      parsed = JSON.parse(cleanText);
    } catch (err) {
      console.error("❌ JSON PARSE ERROR:", err);
      return res.status(500).json({
        message: "AI returned invalid JSON",
        raw: cleanText,
      });
    }

    console.log("✅ AI SUCCESS");

    res.json(parsed);

  } catch (error) {
    console.error("🔥 GEMINI FULL ERROR:", error);

    res.status(500).json({
      message: "AI enhancement failed",
      error: error.message,
    });
  }
};