require("dotenv").config();

async function listModels() {
    const key = process.env.GOOGLE_GEMINI_API_KEY;
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`;
    try {
        const res = await fetch(url);
        const data = await res.json();
        console.log(JSON.stringify(data, null, 2));
    } catch (err) {
        console.error(err);
    }
}

listModels();
