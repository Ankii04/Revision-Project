const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const problems = await prisma.problem.findMany({
    where: { title: { contains: "Defanging" } },
    include: { aiNotes: true }
  });

  console.log(`Found ${problems.length} problems matching 'Defanging':`);
  problems.forEach(p => {
    console.log(`\n--- Problem: ${p.title} ---`);
    console.log(`ID: ${p.id}`);
    console.log(`Description (len): ${p.description?.length ?? 0}`);
    console.log(`AI Status: ${p.aiNotes?.status ?? "NONE"}`);
    console.log(`AI Error: ${p.aiNotes?.errorMessage ?? "NONE"}`);
    console.log(`AI Content Exists: ${!!p.aiNotes?.content}`);
    if (p.aiNotes?.content) {
        console.log(`Desc in AI: ${!!p.aiNotes.content.problemDescription}`);
    }
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
