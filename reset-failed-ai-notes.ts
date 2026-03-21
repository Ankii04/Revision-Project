/**
 * reset-failed-ai-notes.ts
 * 
 * Resets all FAILED AI notes back to PENDING so the BullMQ worker
 * can re-queue and re-generate them using Gemini.
 * 
 * Run with: npx tsx -r dotenv/config reset-failed-ai-notes.ts
 */
import { PrismaClient } from "@prisma/client";
import * as dotenv from "dotenv";
dotenv.config();

const prisma = new PrismaClient();

async function main() {
  console.log("🔍 Finding all FAILED AI notes...");

  const failedNotes = await prisma.aiNotes.findMany({
    where: { status: "FAILED" },
    include: { problem: { select: { id: true, title: true } } },
  });

  console.log(`📋 Found ${failedNotes.length} failed records.\n`);

  if (failedNotes.length === 0) {
    console.log("✅ Nothing to reset.");
    return;
  }

  for (const note of failedNotes) {
    console.log(`  🔄 Resetting: "${note.problem.title}" (problemId: ${note.problemId})`);
  }

  // Reset all FAILED records to PENDING + clear the error message
  const result = await prisma.aiNotes.updateMany({
    where: { status: "FAILED" },
    data: {
      status: "PENDING",
      errorMessage: null,
      content: undefined,
    },
  });

  console.log(`\n✅ Reset ${result.count} records to PENDING.`);
  console.log("🚀 The BullMQ worker will now pick them up and re-generate using Gemini.");
  console.log("   Make sure 'npm run worker:dev' is running!\n");

  // Now re-enqueue each problem
  const { aiNotesQueue } = await import("./src/lib/queues.js");

  for (const note of failedNotes) {
    await aiNotesQueue.add(
      "ai-note-job",
      { problemId: note.problemId },
      { jobId: `reset-${note.problemId}-${Date.now()}` }
    );
    console.log(`  📤 Queued job for: "${note.problem.title}"`);
  }

  console.log(`\n✨ Done! ${failedNotes.length} jobs re-queued.\n`);
}

main()
  .catch((e) => {
    console.error("❌ Error:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
