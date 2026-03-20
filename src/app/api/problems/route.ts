import { auth } from "@clerk/nextjs/server";
import { apiSuccess, apiError, withErrorHandler } from "@/lib/api-response";
import { getProblems, createProblem } from "@/services/problem.service";
import { GetProblemsQuerySchema, CreateProblemSchema } from "@/lib/validations";

/**
 * GET /api/problems
 * Returns paginated, filterable problems for the authenticated user.
 */
export const GET = withErrorHandler(async (req) => {
  const { userId } = await auth();

  if (!userId) {
    return apiError("UNAUTHORIZED", "Not authenticated", 401);
  }

  // Extract query parameters from URL
  const { searchParams } = new URL(req.url);
  const query = GetProblemsQuerySchema.parse({
    page: searchParams.get("page"),
    limit: searchParams.get("limit"),
    platform: searchParams.get("platform"),
    difficulty: searchParams.get("difficulty"),
    tag: searchParams.get("tag"),
    language: searchParams.get("language"),
    search: searchParams.get("search"),
    sort: searchParams.get("sort"),
    order: searchParams.get("order"),
  });

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

  return apiSuccess({ problem }, 201);
});
