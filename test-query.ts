import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function testQuery() {
  const userId = "user_3BG75YyE4Ut9bjEagQEwEYkiwTw";
  const problems = await prisma.problem.findMany({
    where: { userId },
    take: 10
  });

  console.log(`🔍 Querying for ${userId}: Found ${problems.length} problems.`);
  if (problems.length > 0) {
      console.log(`Problem IDs:`, problems.map(p => p.id));
      console.log(`First problem belongs to: ${problems[0].userId}`);
  }
}

testQuery()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
