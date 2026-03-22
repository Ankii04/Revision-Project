const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const note = await prisma.aiNotes.findFirst({
    where: { status: "DONE" },
    select: { content: true, problem: { select: { title: true } } }
  });
  console.log("Problem:", note?.problem?.title);
  console.log("AI Content:", JSON.stringify(note?.content, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
