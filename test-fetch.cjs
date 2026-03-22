require("dotenv").config();

async function testFetch() {
    const key = process.env.GOOGLE_GEMINI_API_KEY;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`;
    try {
        const res = await fetch(url, {
            method: 'POST',
            body: JSON.stringify({ contents: [{ parts: [{ text: "Hello" }] }] })
        });
        const data = await res.json();
        console.log("Status:", res.status);
        console.log("Data:", JSON.stringify(data, null, 2));
    } catch (err) {
        console.error(err);
    }
}

testFetch();
