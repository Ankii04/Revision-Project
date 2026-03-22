require("dotenv").config();
const { generateAiNotes } = require("./src/services/ai-notes.service");

async function main() {
    const id = "69bec21502027ae36100f1fe"; // Defanging IP Address
    console.log("Generating for:", id);
    await generateAiNotes(id);
    console.log("Done!");
    process.exit(0);
}

main().catch(console.error);
