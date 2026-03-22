const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const [total, done, failed, pending, processing] = await Promise.all([
    prisma.aiNotes.count(),
    prisma.aiNotes.count({ where: { status: "DONE" } }),
    prisma.aiNotes.count({ where: { status: "FAILED" } }),
    prisma.aiNotes.count({ where: { status: "PENDING" } }),
    prisma.aiNotes.count({ where: { status: "PROCESSING" } }),
  ]);

  console.log(`\n📊 AI Generation Progress:`);
  console.log(`   DONE:       ${done}`);
  console.log(`   PROCESSING: ${processing}`);
  console.log(`   PENDING:    ${pending}`);
  console.log(`   FAILED:     ${failed}`);
  console.log(`   TOTAL:      ${total}\n`);

  if (done > 0) {
    const sample = await prisma.aiNotes.findFirst({
        where: { status: "DONE" },
        include: { problem: { select: { title: true } } }
    });
    console.log(`Sample [${sample.problem.title}]:`);
    console.log(JSON.stringify(sample.content, null, 2));
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
