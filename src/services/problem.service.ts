import type {
  Difficulty,
  Language,
  Platform,
  Prisma,
  Problem,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { CreateProblemInput, UpdateProblemInput, GetProblemsQuery } from "@/lib/validations";

// ─── Types ─────────────────────────────────────────────────────────────────

export type ProblemWithRelations = Prisma.ProblemGetPayload<{
  include: {
    aiNotes: { select: { id: true; status: true } };
    revisionCard: {
      select: { id: true; dueDate: true; interval: true; easeFactor: true };
    };
  };
}>;

export type ProblemFull = Prisma.ProblemGetPayload<{
  include: {
    aiNotes: true;
    revisionCard: true;
  };
}>;

export interface PaginatedProblems {
  problems: ProblemWithRelations[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

// ─── Service ───────────────────────────────────────────────────────────────

/**
 * Returns a paginated list of problems for the given user, applying all
 * filters (difficulty, platform, tag, search, sort) from the query params.
 */
export async function getProblems(
  userId: string,
  query: GetProblemsQuery
): Promise<PaginatedProblems> {
  const { page, limit, platform, difficulty, tag, language, search, sort, order } =
    query;

  const skip = (page - 1) * limit;

  // Build where clause dynamically based on provided filters
  const where: Prisma.ProblemWhereInput = {
    userId,
    ...(platform ? { platform: platform as Platform } : {}),
    ...(difficulty ? { difficulty: difficulty as Difficulty } : {}),
    ...(language ? { language: language as Language } : {}),
    ...(tag ? { tags: { has: tag } } : {}),
    ...(search
      ? { title: { contains: search, mode: "insensitive" } }
      : {}),
  };

  // Run count and data fetch in parallel for performance
  const [total, problems] = await Promise.all([
    prisma.problem.count({ where }),
    prisma.problem.findMany({
      where,
      skip,
      take: limit,
      orderBy: sort === "dueDate"
        ? { revisionCard: { dueDate: order } }
        : { [sort]: order },
      include: {
        aiNotes: { select: { id: true, status: true } },
        revisionCard: {
          select: { id: true, dueDate: true, interval: true, easeFactor: true },
        },
      },
    }),
  ]);

  const totalPages = Math.ceil(total / limit);

  return {
    problems,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    },
  };
}

/**
 * Returns a single problem by ID, verifying it belongs to the requesting user.
 * Returns null if not found or not owned by user.
 */
export async function getProblemById(
  problemId: string,
  userId: string
): Promise<ProblemFull | null> {
  return prisma.problem.findFirst({
    where: { id: problemId, userId },
    include: { aiNotes: true, revisionCard: true },
  });
}

/**
 * Creates a new problem. Also creates an associated RevisionCard with dueDate=today
 * and an AiNotes record in PENDING state (the worker picks it up).
 * Uses a transaction so all three are created atomically.
 */
export async function createProblem(
  userId: string,
  input: CreateProblemInput
): Promise<Problem> {
  return prisma.$transaction(async (tx) => {
    const problem = await tx.problem.create({
      data: {
        userId,
        title: input.title,
        slug: input.slug,
        platform: input.platform as Platform,
        platformId: input.platformId,
        platformUrl: input.platformUrl,
        description: input.description,
        difficulty: (input.difficulty ?? "UNKNOWN") as Difficulty,
        tags: input.tags ?? [],
        companies: input.companies ?? [],
        isPremium: input.isPremium ?? false,
        solutionCode: input.solutionCode,
        language: input.language as Language,
        submittedAt: input.submittedAt,
        importedVia: input.importedVia ?? "manual",
        importJobId: input.importJobId,
      },
    });

    // Create revision card with dueDate = now (card is immediately due for first review)
    await tx.revisionCard.create({
      data: {
        userId,
        problemId: problem.id,
        dueDate: new Date(),
      },
    });

    // Create a pending AI notes record — the worker will pick this up
    await tx.aiNotes.create({
      data: {
        problemId: problem.id,
        status: "PENDING",
      },
    });

    // 4. Update DailyStats for the heatmap
    const solveDate = input.submittedAt ? new Date(input.submittedAt) : new Date();
    solveDate.setHours(0, 0, 0, 0); // Normalize to midnight for daily aggregation

    await tx.dailyStats.upsert({
      where: {
        userId_date: {
          userId,
          date: solveDate,
        },
      },
      create: {
        userId,
        date: solveDate,
        problemsSolved: 1,
      },
      update: {
        problemsSolved: { increment: 1 },
      },
    });

    return problem;
  });
}

/**
 * Updates mutable fields on a problem.
 * If solutionCode is updated, resets AI notes to PENDING so they get regenerated.
 */
export async function updateProblem(
  problemId: string,
  userId: string,
  input: UpdateProblemInput
): Promise<Problem | null> {
  const existing = await prisma.problem.findFirst({
    where: { id: problemId, userId },
  });
  if (!existing) return null;

  const solutionChanged = input.solutionCode && input.solutionCode !== existing.solutionCode;

  return prisma.$transaction(async (tx) => {
    const updated = await tx.problem.update({
      where: { id: problemId },
      data: {
        ...(input.solutionCode ? { solutionCode: input.solutionCode } : {}),
        ...(input.language ? { language: input.language as Language } : {}),
        ...(input.tags ? { tags: input.tags } : {}),
        ...(input.difficulty ? { difficulty: input.difficulty as Difficulty } : {}),
        ...(input.companies ? { companies: input.companies } : {}),
      },
    });

    // If the solution changed, reset AI notes so they'll be regenerated
    if (solutionChanged) {
      await tx.aiNotes.upsert({
        where: { problemId },
        create: { problemId, status: "PENDING" },
        update: { status: "PENDING", content: undefined, errorMessage: null },
      });
    }

    return updated;
  });
}

/**
 * Deletes a problem and all cascade-related data (AI notes, revision card, revision logs).
 * Cascade is handled by the Prisma schema's onDelete: Cascade.
 */
export async function deleteProblem(
  problemId: string,
  userId: string
): Promise<boolean> {
  const existing = await prisma.problem.findFirst({
    where: { id: problemId, userId },
  });
  if (!existing) return false;

  await prisma.problem.delete({ where: { id: problemId } });
  return true;
}

/**
 * Checks if a problem already exists for this user+platform+platformId combination.
 * Used for duplicate detection during import.
 */
export async function findExistingProblem(
  userId: string,
  platform: string,
  platformId: string
): Promise<Problem | null> {
  return prisma.problem.findFirst({
    where: { userId, platform: platform as Platform, platformId },
  });
}
