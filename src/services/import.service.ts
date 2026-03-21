import { prisma } from "@/lib/prisma";
import type { Platform } from "@prisma/client";
import type { ImportJobStatus } from "@prisma/client";

// ─── Types ─────────────────────────────────────────────────────────────────

export interface LeetCodeSubmission {
  id: string;
  title: string;
  titleSlug: string;
  statusDisplay: string;
  lang: string;
  code: string;
  timestamp: number;
  url: string;
  difficulty: string;
  topicTags: Array<{ name: string; slug: string }>;
}

// Maps LeetCode language names to our Language enum
const LC_LANG_MAP: Record<string, string> = {
  python3: "PYTHON",
  python: "PYTHON",
  java: "JAVA",
  cpp: "CPP",
  javascript: "JAVASCRIPT",
  typescript: "TYPESCRIPT",
  golang: "GO",
  rust: "RUST",
  kotlin: "KOTLIN",
  swift: "SWIFT",
  csharp: "CSHARP",
};

// Maps LeetCode difficulty strings to our enum
const LC_DIFFICULTY_MAP: Record<string, string> = {
  Easy: "EASY",
  Medium: "MEDIUM",
  Hard: "HARD",
};

// ─── Import Job CRUD ────────────────────────────────────────────────────────

/** Creates a new import job record for tracking the bulk import progress */
export async function createImportJob(
  userId: string,
  platform: Platform,
  encryptedCookie: string
) {
  return prisma.importJob.create({
    data: { userId, platform, encryptedCookie, status: "QUEUED" },
  });
}

/** Returns all import jobs for a user, most recent first */
export async function getImportJobs(userId: string) {
  return prisma.importJob.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
}

/** Returns a single import job, verifying user ownership */
export async function getImportJob(jobId: string, userId: string) {
  return prisma.importJob.findFirst({ where: { id: jobId, userId } });
}

/** Checks if the user already has a QUEUED or RUNNING import job */
export async function hasActiveImportJob(
  userId: string,
  platform: Platform
): Promise<boolean> {
  const job = await prisma.importJob.findFirst({
    where: {
      userId,
      platform,
      status: { in: ["QUEUED", "RUNNING"] },
    },
  });
  return !!job;
}

/** Updates the import job status and progress counters */
export async function updateImportJob(
  jobId: string,
  data: {
    status?: ImportJobStatus;
    totalFound?: number;
    totalImported?: number;
    totalSkipped?: number;
    totalFailed?: number;
    errorMessage?: string;
    startedAt?: Date;
    completedAt?: Date;
  }
) {
  return prisma.importJob.update({ where: { id: jobId }, data });
}

// ─── LeetCode Fetcher ───────────────────────────────────────────────────────

/**
 * Fetches one page of accepted submissions from LeetCode's internal GraphQL API.
 * Uses the user's session cookie for auth (passed as a cookie header).
 * Returns the submissions and whether there are more pages.
 */
export async function fetchLeetCodeSubmissionsPage(
  sessionCookie: string,
  offset: number,
  limit = 100
): Promise<{ submissions: LeetCodeSubmission[]; hasNext: boolean }> {
  const GRAPHQL_URL = "https://leetcode.com/graphql/";

  const query = `
    query submissionList($offset: Int!, $limit: Int!, $lastKey: String, $questionSlug: String) {
      submissionList(offset: $offset, limit: $limit, lastKey: $lastKey, questionSlug: $questionSlug) {
        lastKey
        hasNext
        submissions {
          id
          title
          titleSlug
          statusDisplay
          lang
          timestamp
          url
        }
      }
    }
  `;

  // Automatically wrap raw session values if they don't have the LEETCODE_SESSION key
  const cookieHeader = sessionCookie.includes("LEETCODE_SESSION") 
    ? sessionCookie 
    : `LEETCODE_SESSION=${sessionCookie}; csrftoken=dummy`;

  const response = await fetch(GRAPHQL_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookieHeader,
      Referer: "https://leetcode.com",
      "x-csrftoken": extractCsrfToken(cookieHeader) || "dummy",
    },
    body: JSON.stringify({
      query,
      variables: { offset, limit },
    }),
  });



  if (!response.ok) {
    const errorBody = await response.text();
    console.error(`❌ LeetCode API Error (${response.status}):`, errorBody);
    throw new Error(`LeetCode API returned ${response.status}: ${errorBody}`);
  }

  const data = (await response.json()) as {
    data: {
      submissionList: {
        hasNext: boolean;
        submissions: Array<{
          id: string;
          title: string;
          titleSlug: string;
          statusDisplay: string;
          lang: string;
          timestamp: string;
          url: string;
        }>;
      };
    };
  };

  const submissionList = data?.data?.submissionList;
  if (!submissionList) {
    throw new Error("Unexpected LeetCode API response structure.");
  }

  return {
    hasNext: submissionList.hasNext,
    submissions: (submissionList.submissions || []).map((s) => ({
      ...s,
      timestamp: parseInt(s.timestamp),
      code: "", // code fetched separately
      difficulty: "UNKNOWN",
      topicTags: [],
    })),
  };

}

/**
 * Fetches the code and metadata for a specific submission by its ID.
 * LeetCode requires a separate API call to get the actual code.
 */
export async function fetchSubmissionDetail(
  submissionId: string,
  sessionCookie: string
): Promise<{ code: string; difficulty: string; tags: string[] }> {
  const GRAPHQL_URL = "https://leetcode.com/graphql/";

  const query = `
    query submissionDetails($submissionId: Int!) {
      submissionDetails(submissionId: $submissionId) {
        code
        question {
          difficulty
          topicTags { name slug }
        }
      }
    }
  `;

  // Normalize the cookie the same way fetchLeetCodeSubmissionsPage does
  const cookieHeader = sessionCookie.includes("LEETCODE_SESSION")
    ? sessionCookie
    : `LEETCODE_SESSION=${sessionCookie}; csrftoken=dummy`;

  const response = await fetch(GRAPHQL_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookieHeader,
      Referer: "https://leetcode.com",
      "x-csrftoken": extractCsrfToken(cookieHeader) || "dummy",
    },
    body: JSON.stringify({
      query,
      variables: { submissionId: parseInt(submissionId) },
    }),
  });

  if (!response.ok) {
    throw new Error(`LeetCode detail API returned ${response.status}`);
  }

  const data = (await response.json()) as {
    data: {
      submissionDetails: {
        code: string;
        question: {
          difficulty: string;
          topicTags: Array<{ name: string; slug: string }>;
        };
      };
    };
  };

  const details = data?.data?.submissionDetails;
  if (!details) {
    return { code: "", difficulty: "UNKNOWN", tags: [] };
  }

  return {
    code: details.code,
    difficulty: LC_DIFFICULTY_MAP[details.question.difficulty] ?? "UNKNOWN",
    tags: details.question.topicTags.map((t) => t.slug),
  };
}

/**
 * Maps a LeetCode language string to our Language enum value.
 * Falls back to PYTHON if unrecognized (most common).
 */
export function mapLeetCodeLanguage(lcLang: string): string {
  return LC_LANG_MAP[lcLang.toLowerCase()] ?? "PYTHON";
}

/** Extracts the CSRF token from a LeetCode session cookie string */
function extractCsrfToken(cookie: string): string {
  // Try finding it in the cookie string
  const match = /csrftoken=([^;]+)/.exec(cookie);
  if (match?.[1]) return match[1];
  
  // If not found, try common patterns or return a placeholder
  // Most modern LC installs require this.
  return "";
}

