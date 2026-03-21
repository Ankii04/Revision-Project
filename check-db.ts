import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function checkDb() {
  const userId = "user_3BG75YyE4Ut9bjEagQEwEYkiwTw";
  const problemCount = await prisma.problem.count({ where: { userId } });
  const revisionLogCount = await prisma.revisionLog.count({ where: { userId } });
  const heatmapCount = await prisma.dailyStats.count({ where: { userId } });
  const user = await prisma.user.findUnique({ where: { id: userId } });
  
  console.log("📊 [DATABASE STATUS]");
  console.log(`User found: ${user ? "YES (" + user.email + ")" : "NO"}`);
  console.log(`Total Problems: ${problemCount}`);
  console.log(`Total Revision Logs: ${revisionLogCount}`);
  console.log(`Total Heatmap (DailyStats) entries: ${heatmapCount}`);
  
  if (problemCount > 0) {
     const lastProblem = await prisma.problem.findFirst({
        where: { userId },
        orderBy: { createdAt: 'desc' }
     });
     console.log(`Last Problem: ${lastProblem?.title} (${lastProblem?.slug})`);
  }
}

checkDb()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
