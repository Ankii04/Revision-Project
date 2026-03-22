import { auth } from "@clerk/nextjs/server";
import { apiSuccess, apiError, withErrorHandler } from "@/lib/api-response";
import { getProblems, createProblem } from "@/services/problem.service";
import { GetProblemsQuerySchema, CreateProblemSchema } from "@/lib/validations";
import { enqueueAiNoteJob } from "@/lib/queues";
import { NextResponse } from "next/server";

export async function OPTIONS(req: Request) {
  const origin = req.headers.get("origin") || "*";
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Allow-Credentials": "true",
    },
  });
}

/**
 * GET /api/problems
 * Returns paginated, filterable problems for the authenticated user.
 */
export const GET = withErrorHandler(async (req) => {
  const { userId } = await auth();

  if (!userId) {
    return apiError("UNAUTHORIZED", "Not authenticated", 401);
  }

  // Extract query parameters from URL into a clean object (ignoring nulls)
  const { searchParams } = new URL(req.url);
  const params = Object.fromEntries(searchParams.entries());
  const query = GetProblemsQuerySchema.parse(params);

  const data = await getProblems(userId, query);

  return apiSuccess(data);
});

/**
 * POST /api/problems
 * Manually create a new problem entry.
 */
export const POST = withErrorHandler(async (req) => {
  const { userId } = await auth();

  if (!userId) {
    return apiError("UNAUTHORIZED", "Not authenticated", 401);
  }

  const json = await req.json();
  const input = CreateProblemSchema.parse(json);

  const problem = await createProblem(userId, input);

  // Queue AI notes generation
  await enqueueAiNoteJob(problem.id);

  return apiSuccess({ problem }, 201);
});
