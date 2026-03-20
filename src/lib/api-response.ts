import { NextResponse } from "next/server";
import { ZodError } from "zod";

// Typed error codes that map exactly to our API contract
export type ApiErrorCode =
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "VALIDATION_ERROR"
  | "RATE_LIMITED"
  | "INTERNAL_ERROR"
  | "AI_UNAVAILABLE"
  | "IMPORT_IN_PROGRESS"
  | "DUPLICATE_PROBLEM";

interface ApiErrorResponse {
  success: false;
  error: {
    code: ApiErrorCode;
    message: string;
    details?: unknown;
  };
}

interface ApiSuccessResponse<T> {
  success: true;
  data: T;
}

/** Creates a successful JSON response with the standard envelope */
export function apiSuccess<T>(data: T, status = 200): NextResponse {
  const body: ApiSuccessResponse<T> = { success: true, data };
  return NextResponse.json(body, { status });
}

/** Creates an error JSON response with the standard envelope */
export function apiError(
  code: ApiErrorCode,
  message: string,
  status: number,
  details?: unknown
): NextResponse {
  const body: ApiErrorResponse = {
    success: false,
    error: { code, message, ...(details ? { details } : {}) },
  };
  return NextResponse.json(body, { status });
}

/**
 * Wraps an API route handler with a try/catch that returns structured errors.
 * Automatically handles Zod validation errors and unknown errors uniformly.
 */
export function withErrorHandler(
  handler: (req: Request, ctx: { params: Promise<Record<string, string>> }) => Promise<NextResponse>
) {
  return async (
    req: Request,
    ctx: { params: Promise<Record<string, string>> }
  ): Promise<NextResponse> => {
    try {
      return await handler(req, ctx);
    } catch (error) {
      if (error instanceof ZodError) {
        return apiError(
          "VALIDATION_ERROR",
          "Request validation failed.",
          422,
          error.flatten().fieldErrors
        );
      }

      console.error("[API Error]", error);

      return apiError("INTERNAL_ERROR", "An unexpected error occurred.", 500);
    }
  };
}
