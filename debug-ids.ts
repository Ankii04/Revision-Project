import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function debugIds() {
  const users = await prisma.user.findMany();
  const problems = await prisma.problem.findMany({ take: 5 });
  const importJobs = await prisma.importJob.findMany({ take: 5 });

  console.log("📊 [DEBUG IDS]");
  console.log("Users in DB:", users.map(u => ({ id: u.id, email: u.email })));
  
  if (problems.length > 0) {
    console.log("Sample Problem UserIds:", [...new Set(problems.map(p => p.userId))]);
  } else {
    console.log("NO PROBLEMS FOUND IN DB AT ALL.");
  }

  if (importJobs.length > 0) {
    console.log("Sample ImportJob UserIds:", [...new Set(importJobs.map(j => j.userId))]);
  }
}

debugIds()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
