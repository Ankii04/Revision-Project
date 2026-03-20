import Anthropic from "@anthropic-ai/sdk";
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

/** Lazily-initialized Anthropic client */
function getAnthropicClient(): Anthropic {
  const apiKey = process.env["ANTHROPIC_API_KEY"];
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY must be set in .env.local");
  }
  return new Anthropic({ apiKey });
}

// ─── Prompt Builder ────────────────────────────────────────────────────────

/**
 * Builds the structured prompt that Claude uses to generate DSA problem notes.
 * The prompt asks Claude for JSON output to enable reliable parsing.
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

Generate comprehensive revision notes for this problem. Return ONLY valid JSON with this exact structure:

{
  "keyInsight": "The single most important 'aha' moment that unlocks this problem. Be specific and concise (1-2 sentences).",
  "approaches": [
    {
      "name": "Brute Force",
      "description": "Detailed explanation of the naive approach and why it works but is suboptimal",
      "timeComplexity": "O(...)",
      "spaceComplexity": "O(...)"
    },
    {
      "name": "Optimal",
      "description": "Explanation of the optimal approach (matching the user's solution), why it works, and the key data structure/pattern used",
      "timeComplexity": "O(...)",
      "spaceComplexity": "O(...)"
    }
  ]
}

Rules:
- Include a "Better Approach" entry between Brute Force and Optimal if an intermediate optimization exists
- The Optimal approach should match or explain the user's actual solution
- Keep descriptions clear enough that the user will understand them 6 months from now
- Be specific about WHY each complexity is what it is
- Return ONLY the JSON object, no markdown fences, no extra text`;
}

// ─── Service ───────────────────────────────────────────────────────────────

/**
 * Returns the current AI notes for a problem.
 * If no notes record exists, returns null.
 */
export async function getAiNotes(
  problemId: string,
  userId: string
): Promise<AiNotes | null> {
  // Verify the problem belongs to the user
  const problem = await prisma.problem.findFirst({
    where: { id: problemId, userId },
  });
  if (!problem) return null;

  return prisma.aiNotes.findUnique({ where: { problemId } });
}

/**
 * Enqueues an AI notes generation job for a problem.
 * Creates an AiNotes record in PENDING state if one doesn't exist.
 * Rate-limits to 3 regenerations per problem per day.
 */
export async function queueAiNotesGeneration(
  problemId: string,
  userId: string
): Promise<{ status: string; message: string; retryAfter?: Date }> {
  const problem = await prisma.problem.findFirst({
    where: { id: problemId, userId },
  });
  if (!problem) {
    throw new Error("Problem not found.");
  }

  const existing = await prisma.aiNotes.findUnique({ where: { problemId } });

  // Rate limit check for regeneration (3x per day)
  if (existing && existing.regenerateCount > 0) {
    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    if (
      existing.lastRegeneratedAt &&
      existing.lastRegeneratedAt > dayAgo &&
      existing.regenerateCount >= 3
    ) {
      const retryAfter = new Date(existing.lastRegeneratedAt.getTime() + 24 * 60 * 60 * 1000);
      return { status: "rate_limited", message: "Rate limit reached", retryAfter };
    }
  }

  // Upsert the AI notes record to PENDING state
  await prisma.aiNotes.upsert({
    where: { problemId },
    create: { problemId, status: "PENDING" },
    update: {
      status: "PENDING",
      content: undefined,
      errorMessage: null,
      regenerateCount: { increment: existing ? 1 : 0 },
      lastRegeneratedAt: existing ? new Date() : undefined,
    },
  });

  return {
    status: "queued",
    message: "Notes are being generated. This typically takes 15–30 seconds.",
  };
}

/**
 * The core AI generation function — called by the BullMQ worker.
 * Calls Claude, parses the response, and saves to the database.
 * This is NOT called directly from an API route — only from the worker.
 */
export async function generateAiNotes(problemId: string): Promise<void> {
  // Mark as processing to prevent duplicate worker pickup
  await prisma.aiNotes.update({
    where: { problemId },
    data: { status: "PROCESSING" },
  });

  const problem = await prisma.problem.findUnique({ where: { id: problemId } });
  if (!problem) {
    await prisma.aiNotes.update({
      where: { problemId },
      data: { status: "FAILED", errorMessage: "Problem not found during generation." },
    });
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
    const client = getAnthropicClient();
    const MODEL = "claude-sonnet-4-20250514";

    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 2048,
      messages: [{ role: "user", content: prompt }],
    });

    // Extract text content from Claude's response
    const textBlock = response.content.find((block) => block.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      throw new Error("Claude returned no text content.");
    }

    // Parse and validate the JSON response
    const parsed: AiNotesContent = JSON.parse(textBlock.text) as AiNotesContent;

    if (!parsed.keyInsight || !Array.isArray(parsed.approaches)) {
      throw new Error("Claude response did not match expected JSON structure.");
    }

    await prisma.aiNotes.update({
      where: { problemId },
      data: {
        status: "DONE",
        content: parsed,
        promptUsed: prompt,
        modelVersion: MODEL,
        errorMessage: null,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    await prisma.aiNotes.update({
      where: { problemId },
      data: { status: "FAILED", errorMessage: message },
    });
    throw error; // Re-throw so BullMQ can retry
  }
}
