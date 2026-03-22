require("dotenv").config();
const { GoogleGenerativeAI } = require("@google/generative-ai");

async function test() {
  try {
    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    const result = await model.generateContent("Hello!");
    console.log("Success:", result.response.text());
  } catch (err) {
    console.error("Test Failed:", err);
  }
}

test();
