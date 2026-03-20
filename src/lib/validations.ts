import { z } from "zod";

// All Zod schemas for API input validation — imported by route handlers
// before touching the database.

// ─── Enums ────────────────────────────────────────────────────────────────────
export const PlatformSchema = z.enum([
  "LEETCODE",
  "GFG",
  "CODEFORCES",
  "MANUAL",
]);
export const DifficultySchema = z.enum(["EASY", "MEDIUM", "HARD", "UNKNOWN"]);
export const LanguageSchema = z.enum([
  "PYTHON",
  "JAVA",
  "CPP",
  "JAVASCRIPT",
  "TYPESCRIPT",
  "GO",
  "RUST",
  "KOTLIN",
  "SWIFT",
  "CSHARP",
]);
export const RecallRatingSchema = z.enum(["AGAIN", "HARD", "GOOD", "EASY"]);

// ─── Problem Schemas ──────────────────────────────────────────────────────────
export const CreateProblemSchema = z.object({
  title: z.string().min(1).max(300),
  slug: z
    .string()
    .min(1)
    .max(300)
    .regex(/^[a-z0-9-]+$/, "Slug must be lowercase alphanumeric with hyphens"),
  platform: PlatformSchema,
  platformId: z.string().optional(),
  platformUrl: z.string().url().optional(),
  difficulty: DifficultySchema.optional().default("UNKNOWN"),
  tags: z.array(z.string().max(50)).max(20).optional().default([]),
  companies: z.array(z.string().max(100)).max(30).optional().default([]),
  isPremium: z.boolean().optional().default(false),
  solutionCode: z.string().min(1).max(65536),
  language: LanguageSchema,
  submittedAt: z.coerce.date().optional(),
  importedVia: z
    .enum(["cookie_import", "extension", "manual"])
    .optional()
    .default("manual"),
  importJobId: z.string().cuid().optional(),
});

export const UpdateProblemSchema = z.object({
  solutionCode: z.string().min(1).max(65536).optional(),
  language: LanguageSchema.optional(),
  tags: z.array(z.string().max(50)).max(20).optional(),
  difficulty: DifficultySchema.optional(),
  companies: z.array(z.string().max(100)).max(30).optional(),
});

// ─── Problem Query Params ─────────────────────────────────────────────────────
export const GetProblemsQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  platform: PlatformSchema.optional(),
  difficulty: DifficultySchema.optional(),
  tag: z.string().optional(),
  language: LanguageSchema.optional(),
  search: z.string().max(200).optional(),
  sort: z
    .enum(["createdAt", "title", "difficulty", "dueDate"])
    .optional()
    .default("createdAt"),
  order: z.enum(["asc", "desc"]).optional().default("desc"),
});

// ─── Import Schemas ───────────────────────────────────────────────────────────
export const LeetCodeImportSchema = z.object({
  sessionCookie: z
    .string()
    .min(20)
    .refine(
      (val) => val.includes("LEETCODE_SESSION"),
      "Cookie must include LEETCODE_SESSION token"
    ),
});

export const GfgImportSchema = z.object({
  sessionCookie: z.string().min(20),
});

// ─── Revision Schemas ─────────────────────────────────────────────────────────
export const RevisionQueueQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
  includeNew: z.coerce.boolean().optional().default(true),
});

export const SubmitReviewSchema = z.object({
  revisionCardId: z.string().cuid(),
  rating: RecallRatingSchema,
});

// ─── Auth Schemas ─────────────────────────────────────────────────────────────
export const SyncUserSchema = z.object({
  clerkUserId: z.string().min(1),
  email: z.string().email(),
  name: z.string().optional(),
  avatarUrl: z.string().url().optional(),
});

// ─── Extension Capture Schema ─────────────────────────────────────────────────
export const ExtensionCaptureSchema = CreateProblemSchema.extend({
  extensionVersion: z.string().optional(),
  captureSource: z
    .enum(["submission_intercept", "manual_trigger"])
    .optional()
    .default("submission_intercept"),
});

// ─── Analytics Schemas ────────────────────────────────────────────────────────
export const HeatmapQuerySchema = z.object({
  year: z.coerce
    .number()
    .int()
    .min(2020)
    .max(2030)
    .optional()
    .default(new Date().getFullYear()),
});

export const WeakTopicsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).optional().default(10),
});

// ─── Type exports ─────────────────────────────────────────────────────────────
export type CreateProblemInput = z.infer<typeof CreateProblemSchema>;
export type UpdateProblemInput = z.infer<typeof UpdateProblemSchema>;
export type GetProblemsQuery = z.infer<typeof GetProblemsQuerySchema>;
export type LeetCodeImportInput = z.infer<typeof LeetCodeImportSchema>;
export type SubmitReviewInput = z.infer<typeof SubmitReviewSchema>;
export type SyncUserInput = z.infer<typeof SyncUserSchema>;
export type ExtensionCaptureInput = z.infer<typeof ExtensionCaptureSchema>;
