import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function backfillHeatmap() {
  const problems = await prisma.problem.findMany({
    where: {
      platform: "LEETCODE"
    }
  });

  console.log(`🚀 Backfilling heatmap for ${problems.length} problems...`);

  for (const problem of problems) {
    const solveDate = problem.submittedAt ? new Date(problem.submittedAt) : new Date(problem.createdAt);
    solveDate.setHours(0, 0, 0, 0);

    await prisma.dailyStats.upsert({
      where: {
        userId_date: {
          userId: problem.userId,
          date: solveDate,
        },
      },
      create: {
        userId: problem.userId,
        date: solveDate,
        problemsSolved: 1,
      },
      update: {
        problemsSolved: { increment: 1 },
      },
    });
  }

  console.log("✅ Backfill complete.");
}

backfillHeatmap()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
