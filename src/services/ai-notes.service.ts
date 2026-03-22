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
  problemDescription: string;
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
  return genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
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
  return `Analyze this solved DSA problem. Provide a study note to help me recall the logic later.

PROBLEM: ${params.title}
DIFFICULTY: ${params.difficulty}
TAGS: ${params.tags.join(", ")}
LANGUAGE: ${params.language}
SOLUTION CODE:
${params.solutionCode}

Return ONLY valid JSON with this exact structure:
{
  "problemDescription": "A 2-3 sentence summary of the problem goal and core constraints (reconstructed from title and code logic).",
  "keyInsight": "The single most critical 'aha' moment for an optimal solution.",
  "approaches": [
    { "name": "Brute Force", "description": "Naive approach summary.", "timeComplexity": "O(...)", "spaceComplexity": "O(...)" },
    { "name": "Optimal", "description": "The best optimized approach logic.", "timeComplexity": "O(...)", "spaceComplexity": "O(...)" }
  ]
}

No markdown code blocks. NO preamble. JSON only.`;
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
