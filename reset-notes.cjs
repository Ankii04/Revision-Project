const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const result = await prisma.aiNotes.updateMany({
    where: { status: "FAILED" },
    data: { status: "PENDING", errorMessage: null },
  });
  console.log("✅ Reset", result.count, "failed AI notes to PENDING.");
  console.log("   The worker will now re-generate them with Gemini.");
}

main()
  .catch((e) => {
    console.error("Error:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
