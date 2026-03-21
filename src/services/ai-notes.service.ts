import { GoogleGenerativeAI } from "@google/generative-ai";
import { prisma } from "@/lib/prisma";
import type { AiNotes } from "@prisma/client";

// ─── Types ─────────────────────────────────────────────────────────────────

export interface ApproachNote {
  name: string;
  description: string;
  timeComplexity: string;
  spaceComplexity: string;
}

export interface AiNotesContent {
  keyInsight: string;
  approaches: ApproachNote[];
}

// ─── Client ────────────────────────────────────────────────────────────────

/** Lazily-initialized Gemini client */
function getGeminiModel() {
  const apiKey = process.env["GOOGLE_GEMINI_API_KEY"];
  if (!apiKey) {
    throw new Error("GOOGLE_GEMINI_API_KEY must be set in .env");
  }
  const genAI = new GoogleGenerativeAI(apiKey);
  return genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
}

// ─── Prompt Builder ────────────────────────────────────────────────────────

/**
 * Builds the structured prompt for Gemini to generate DSA problem notes.
 */
function buildPrompt(params: {
  title: string;
  difficulty: string;
  tags: string[];
  language: string;
  solutionCode: string;
}): string {
  return `You are an expert competitive programmer and CS educator analyzing a solved DSA problem.

Problem: ${params.title}
Difficulty: ${params.difficulty}
Topics: ${params.tags.join(", ")}
Language: ${params.language}

User's Solution:
\`\`\`${params.language.toLowerCase()}
${params.solutionCode}
\`\`\`

Generate comprehensive revision notes for this problem. You MUST provide exactly three approaches if possible: Brute Force, Better, and Optimal (Best). 

Return ONLY valid JSON with this exact structure:

{
  "keyInsight": "The single most important 'aha' moment that unlocks this problem. Be specific and concise (1-2 sentences).",
  "approaches": [
    {
      "name": "Brute Force",
      "description": "Explanation of the naive approach and why it's suboptimal",
      "timeComplexity": "O(...)",
      "spaceComplexity": "O(...)"
    },
    {
      "name": "Better",
      "description": "An intermediate optimization (e.g., using a Map or sorting) that isn't yet perfect",
      "timeComplexity": "O(...)",
      "spaceComplexity": "O(...)"
    },
    {
      "name": "Optimal (Best)",
      "description": "Detailed explanation of the absolute best approach (matching or improving the user's solution)",
      "timeComplexity": "O(...)",
      "spaceComplexity": "O(...)"
    }
  ]
}

Rules:
- If a "Better" approach isn't applicable, still provide 3 entries by breaking down the logic or using an alternative equivalent optimal strategy.
- Be specific about WHY each complexity is what it is.
- Return ONLY the JSON object. No markdown code blocks, no preamble, no tail.`;
}

// ─── Service ───────────────────────────────────────────────────────────────

/**
 * Returns the current AI notes for a problem.
 */
export async function getAiNotes(
  problemId: string,
  userId: string
): Promise<AiNotes | null> {
  const problem = await prisma.problem.findFirst({
    where: { id: problemId, userId },
  });
  if (!problem) return null;

  return prisma.aiNotes.findUnique({ where: { problemId } });
}

/**
 * Enqueues an AI notes generation job.
 */
export async function queueAiNotesGeneration(
  problemId: string,
  userId: string
): Promise<{ status: string; message: string; retryAfter?: Date }> {
  const problem = await prisma.problem.findFirst({
    where: { id: problemId, userId },
  });
  if (!problem) throw new Error("Problem not found.");

  const existing = await prisma.aiNotes.findUnique({ where: { problemId } });

  // Rate limit check
  if (existing && existing.regenerateCount >= 10) {
    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    if (existing.lastRegeneratedAt && existing.lastRegeneratedAt > dayAgo) {
        return { status: "rate_limited", message: "Daily limit reached" };
    }
  }

  await prisma.aiNotes.upsert({
    where: { problemId },
    create: { problemId, status: "PENDING" },
    update: {
      status: "PENDING",
      errorMessage: null,
      regenerateCount: { increment: 1 },
      lastRegeneratedAt: new Date(),
    },
  });

  return { status: "queued", message: "Generating notes with Gemini..." };
}

/**
 * The core AI generation function — called by the BullMQ worker.
 */
export async function generateAiNotes(problemId: string): Promise<void> {
  console.log(`🤖 [GEMINI START] Processing problem: ${problemId}`);
  // Use upsert so we can handle cases where the AI notes record doesn't exist yet
  await prisma.aiNotes.upsert({
    where: { problemId },
    create: { problemId, status: "PROCESSING" },
    update: { status: "PROCESSING" },
  });


  const problem = await prisma.problem.findUnique({ where: { id: problemId } });
  if (!problem) {
    console.error(`❌ [GEMINI ERROR] Problem ${problemId} not found.`);
    return;
  }

  const prompt = buildPrompt({
    title: problem.title,
    difficulty: problem.difficulty,
    tags: problem.tags,
    language: problem.language,
    solutionCode: problem.solutionCode,
  });

  try {
    const model = getGeminiModel();
    console.log(`📡 [GEMINI FETCH] Calling Google API for: ${problem.title}...`);
    const result = await model.generateContent(prompt);
    const responseText = result.response.text().trim();
    console.log(`✅ [GEMINI RESPONSE] Content received for: ${problem.title}`);

    // Clean potential markdown blocks if Gemini formats them anyway
    const jsonStr = responseText.replace(/^```json/, "").replace(/```$/, "").trim();
    const parsed: AiNotesContent = JSON.parse(jsonStr) as AiNotesContent;
    console.log(`🔍 [GEMINI PARSED] Successfully parsed JSON structure.`);

    await prisma.aiNotes.update({
      where: { problemId },
      data: {
        status: "DONE",
        content: parsed as any,
        promptUsed: prompt,
        modelVersion: "gemini-1.5-flash",
        errorMessage: null,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    await prisma.aiNotes.update({
      where: { problemId },
      data: { status: "FAILED", errorMessage: message },
    });
    throw error;
  }
}
