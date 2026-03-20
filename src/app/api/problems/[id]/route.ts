import { auth } from "@clerk/nextjs/server";
import { apiSuccess, apiError, withErrorHandler } from "@/lib/api-response";
import {
  getProblemById,
  updateProblem,
  deleteProblem,
} from "@/services/problem.service";
import { UpdateProblemSchema } from "@/lib/validations";

/**
 * GET /api/problems/[id]
 * Returns full detail of a single problem including solution code and AI notes.
 */
export const GET = withErrorHandler(async (_req, { params }) => {
  const { userId } = await auth();
  const { id } = await params;

  if (!userId) {
    return apiError("UNAUTHORIZED", "Not authenticated", 401);
  }

  const problem = await getProblemById(id, userId);

  if (!problem) {
    return apiError("NOT_FOUND", "Problem not found", 404);
  }

  return apiSuccess({ problem });
});

/**
 * PATCH /api/problems/[id]
 * Update an existing problem.
 */
export const PATCH = withErrorHandler(async (req, { params }) => {
  const { userId } = await auth();
  const { id } = await params;

  if (!userId) {
    return apiError("UNAUTHORIZED", "Not authenticated", 401);
  }

  const json = await req.json();
  const input = UpdateProblemSchema.parse(json);

  const updatedProblem = await updateProblem(id, userId, input);

  if (!updatedProblem) {
    return apiError("NOT_FOUND", "Problem not found", 404);
  }

  return apiSuccess({ problem: updatedProblem });
});

/**
 * DELETE /api/problems/[id]
 * Permanently deletes a problem and all associated data.
 */
export const DELETE = withErrorHandler(async (_req, { params }) => {
  const { userId } = await auth();
  const { id } = await params;

  if (!userId) {
    return apiError("UNAUTHORIZED", "Not authenticated", 401);
  }

  const result = await deleteProblem(id, userId);

  if (!result) {
    return apiError("NOT_FOUND", "Problem not found", 404);
  }

  return apiSuccess({ deletedId: id });
});
