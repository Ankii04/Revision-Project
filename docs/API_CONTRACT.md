# DSA Revision Platform — Complete API Contract

**Version:** 1.0  
**Base URL:** `https://your-domain.com/api`  
**Auth:** All protected routes require a valid Clerk session token in the `Authorization: Bearer <token>` header (handled automatically by Clerk's middleware). Routes marked 🔓 are public.

---

## Global Response Envelope

Every API route returns a consistent response shape:

**Success:**
```json
{
  "success": true,
  "data": { ... }
}
```

**Error:**
```json
{
  "success": false,
  "error": {
    "code": "PROBLEM_NOT_FOUND",
    "message": "No problem with that ID exists for this user."
  }
}
```

**Standard Error Codes:**

| Code | HTTP Status | Meaning |
|---|---|---|
| `UNAUTHORIZED` | 401 | No valid session token |
| `FORBIDDEN` | 403 | Token valid but resource belongs to another user |
| `NOT_FOUND` | 404 | Resource does not exist |
| `VALIDATION_ERROR` | 422 | Zod schema validation failed |
| `RATE_LIMITED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Unexpected server error |
| `AI_UNAVAILABLE` | 503 | Claude API unreachable |
| `IMPORT_IN_PROGRESS` | 409 | User already has an active import job |

---

## Module 1: Authentication / User

### `POST /api/auth/sync` 🔐
Sync the Clerk user into our own PostgreSQL `users` table. Called once after the very first Clerk login (via Clerk webhook or client-side after-auth hook). Creates the user row + streak record if they don't exist.

**Request Body:**
```json
{
  "clerkUserId": "user_2abc123",
  "email": "dev@example.com",
  "name": "Arjun Sharma",
  "avatarUrl": "https://img.clerk.com/..."
}
```

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "clz123abc",
      "email": "dev@example.com",
      "name": "Arjun Sharma",
      "createdAt": "2026-03-20T14:45:00.000Z",
      "isNew": true
    }
  }
}
```

---

### `GET /api/auth/me` 🔐
Returns the currently authenticated user's profile from our DB, including streak info.

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "clz123abc",
      "email": "dev@example.com",
      "name": "Arjun Sharma",
      "avatarUrl": "https://...",
      "streakRecord": {
        "currentStreak": 7,
        "longestStreak": 21,
        "lastActiveDate": "2026-03-19T00:00:00.000Z"
      },
      "createdAt": "2026-01-01T00:00:00.000Z"
    }
  }
}
```

---

## Module 2: Problems

### `GET /api/problems` 🔐
Returns paginated list of problems for the authenticated user. Supports filtering and sorting.

**Query Parameters:**

| Param | Type | Default | Description |
|---|---|---|---|
| `page` | number | 1 | Page number (1-indexed) |
| `limit` | number | 20 | Items per page (max 100) |
| `platform` | string | - | Filter by: `LEETCODE`, `GFG`, `MANUAL` |
| `difficulty` | string | - | Filter by: `EASY`, `MEDIUM`, `HARD` |
| `tag` | string | - | Filter by tag (e.g., `arrays`) |
| `language` | string | - | Filter by language (e.g., `PYTHON`) |
| `search` | string | - | Full-text search on title |
| `sort` | string | `createdAt` | Sort field: `createdAt`, `title`, `difficulty`, `dueDate` |
| `order` | string | `desc` | `asc` or `desc` |

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "problems": [
      {
        "id": "clz_problem_001",
        "title": "Two Sum",
        "slug": "two-sum",
        "platform": "LEETCODE",
        "platformId": "1",
        "platformUrl": "https://leetcode.com/problems/two-sum",
        "difficulty": "EASY",
        "tags": ["array", "hash-table"],
        "language": "PYTHON",
        "importedVia": "cookie_import",
        "submittedAt": "2026-01-15T10:30:00.000Z",
        "createdAt": "2026-03-01T00:00:00.000Z",
        "aiNotes": {
          "status": "DONE"
        },
        "revisionCard": {
          "dueDate": "2026-03-21T00:00:00.000Z",
          "interval": 3,
          "easeFactor": 2.5
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 234,
      "totalPages": 12,
      "hasNextPage": true,
      "hasPrevPage": false
    }
  }
}
```

---

### `POST /api/problems` 🔐
Manually create a new problem entry. Used for manual entry and direct API use (extension also uses this endpoint).

**Request Body:**
```json
{
  "title": "Two Sum",
  "slug": "two-sum",
  "platform": "LEETCODE",
  "platformId": "1",
  "platformUrl": "https://leetcode.com/problems/two-sum/",
  "difficulty": "EASY",
  "tags": ["array", "hash-table"],
  "solutionCode": "def twoSum(self, nums, target):\n    seen = {}\n    for i, n in enumerate(nums):\n        if target - n in seen:\n            return [seen[target-n], i]\n        seen[n] = i",
  "language": "PYTHON",
  "submittedAt": "2026-01-15T10:30:00.000Z",
  "importedVia": "manual"
}
```

**Zod Validation Rules:**
- `title`: string, min 1, max 300
- `platform`: enum Platform
- `solutionCode`: string, min 1, max 65536 (64KB)
- `language`: enum Language
- `difficulty`: optional enum Difficulty
- `tags`: optional array of strings, max 20 tags, each max 50 chars
- `platformId` + `platform`: combination must be unique per user

**Response `201`:**
```json
{
  "success": true,
  "data": {
    "problem": {
      "id": "clz_problem_001",
      "title": "Two Sum",
      "platform": "LEETCODE",
      "difficulty": "EASY",
      "language": "PYTHON",
      "createdAt": "2026-03-20T14:45:00.000Z"
    }
  }
}
```

---

### `GET /api/problems/:problemId` 🔐
Returns full detail of a single problem including solution code and AI notes.

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "problem": {
      "id": "clz_problem_001",
      "title": "Two Sum",
      "slug": "two-sum",
      "platform": "LEETCODE",
      "platformId": "1",
      "platformUrl": "https://leetcode.com/problems/two-sum/",
      "difficulty": "EASY",
      "tags": ["array", "hash-table"],
      "companies": ["Google", "Amazon"],
      "language": "PYTHON",
      "solutionCode": "def twoSum...",
      "submittedAt": "2026-01-15T10:30:00.000Z",
      "importedVia": "cookie_import",
      "createdAt": "2026-03-01T00:00:00.000Z",
      "aiNotes": {
        "id": "clz_notes_001",
        "status": "DONE",
        "content": {
          "keyInsight": "Use a hash map to store seen numbers and check for complement in O(1).",
          "approaches": [
            {
              "name": "Brute Force",
              "description": "Check every pair of numbers using two nested loops.",
              "timeComplexity": "O(n²)",
              "spaceComplexity": "O(1)",
              "code": "..."
            },
            {
              "name": "Hash Map (Optimal)",
              "description": "Single pass using a hash map to store and look up complements.",
              "timeComplexity": "O(n)",
              "spaceComplexity": "O(n)",
              "code": "..."
            }
          ]
        },
        "modelVersion": "claude-sonnet-4-20250514",
        "regenerateCount": 0,
        "lastRegeneratedAt": null
      },
      "revisionCard": {
        "id": "clz_card_001",
        "easeFactor": 2.5,
        "interval": 3,
        "repetition": 2,
        "dueDate": "2026-03-21T00:00:00.000Z",
        "totalReviews": 2,
        "againCount": 0,
        "hardCount": 1,
        "goodCount": 1,
        "easyCount": 0
      }
    }
  }
}
```

---

### `PATCH /api/problems/:problemId` 🔐
Update an existing problem. Only mutable fields can be updated. The `solutionCode` can be updated (e.g., if the user re-submitted with a better solution). Changing `solutionCode` auto-queues AI note regeneration.

**Request Body (all fields optional):**
```json
{
  "solutionCode": "def twoSum..._v2",
  "language": "PYTHON",
  "tags": ["array", "hash-table", "two-pointers"],
  "difficulty": "EASY"
}
```

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "problem": {
      "id": "clz_problem_001",
      "updatedAt": "2026-03-20T15:00:00.000Z"
    }
  }
}
```

---

### `DELETE /api/problems/:problemId` 🔐
Permanently deletes a problem and all associated data (AI notes, revision card, revision logs).

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "deletedId": "clz_problem_001"
  }
}
```

---

## Module 3: Import Jobs

### `POST /api/import/leetcode` 🔐
Kicks off a bulk LeetCode import using the user's session cookie. Queues a BullMQ job and returns the job ID immediately (async processing). Returns 409 if the user already has a running import job.

**Request Body:**
```json
{
  "sessionCookie": "LEETCODE_SESSION=abc123...; csrftoken=xyz789"
}
```

**Zod Validation:**
- `sessionCookie`: string, min 20 chars, must contain `LEETCODE_SESSION`

**Response `202` (Accepted):**
```json
{
  "success": true,
  "data": {
    "importJob": {
      "id": "clz_job_001",
      "platform": "LEETCODE",
      "status": "QUEUED",
      "createdAt": "2026-03-20T14:45:00.000Z"
    },
    "message": "Import started. You will see problems appearing in your dashboard as they are processed."
  }
}
```

---

### `POST /api/import/gfg` 🔐
Same pattern as LeetCode import but for GeeksForGeeks.

**Request Body:**
```json
{
  "sessionCookie": "gfg_rf_token=abc123..."
}
```

**Response `202`:** Same shape as LeetCode import response.

---

### `GET /api/import/jobs` 🔐
Returns the list of all import jobs for the authenticated user (most recent first).

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "jobs": [
      {
        "id": "clz_job_001",
        "platform": "LEETCODE",
        "status": "RUNNING",
        "totalFound": 234,
        "totalImported": 127,
        "totalSkipped": 0,
        "totalFailed": 2,
        "createdAt": "2026-03-20T14:45:00.000Z",
        "startedAt": "2026-03-20T14:45:05.000Z",
        "completedAt": null
      }
    ]
  }
}
```

---

### `GET /api/import/jobs/:jobId` 🔐
Returns real-time status of a specific import job. Frontend polls this every 3s during active import.

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "job": {
      "id": "clz_job_001",
      "platform": "LEETCODE",
      "status": "COMPLETED",
      "totalFound": 234,
      "totalImported": 230,
      "totalSkipped": 4,
      "totalFailed": 0,
      "errorMessage": null,
      "startedAt": "2026-03-20T14:45:05.000Z",
      "completedAt": "2026-03-20T14:52:10.000Z"
    }
  }
}
```

---

## Module 4: AI Notes

### `POST /api/ai-notes/:problemId/generate` 🔐
Enqueues an AI notes generation job for the given problem. Returns immediately; generation happens async via BullMQ. Called automatically when a problem is first imported. User can also call it manually to trigger regeneration.

**Rate Limit:** Max 3 regenerations per problem per 24 hours.

**Request Body:** _(empty — no body required)_

**Response `202`:**
```json
{
  "success": true,
  "data": {
    "aiNotes": {
      "id": "clz_notes_001",
      "status": "PENDING",
      "message": "Notes are being generated. This typically takes 15–30 seconds."
    }
  }
}
```

**Error `429` (Rate Limited):**
```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMITED",
    "message": "You can only regenerate notes 3 times per day for this problem.",
    "retryAfter": "2026-03-21T00:00:00.000Z"
  }
}
```

---

### `GET /api/ai-notes/:problemId` 🔐
Returns the current AI notes for a problem. If status is PENDING or PROCESSING, the content will be null; the frontend should poll until status is DONE.

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "aiNotes": {
      "id": "clz_notes_001",
      "status": "DONE",
      "content": {
        "keyInsight": "...",
        "approaches": [...]
      },
      "modelVersion": "claude-sonnet-4-20250514",
      "regenerateCount": 0,
      "createdAt": "2026-03-20T14:45:30.000Z",
      "updatedAt": "2026-03-20T14:46:00.000Z"
    }
  }
}
```

---

## Module 5: Revision / Spaced Repetition

### `GET /api/revision/queue` 🔐
Returns today's revision queue — all revision cards due on or before today, with full problem detail needed for the flashcard UI.

**Query Parameters:**

| Param | Type | Default | Description |
|---|---|---|---|
| `limit` | number | 50 | Max cards to return (to prevent overwhelming the user) |
| `includeNew` | boolean | true | Whether to include cards never reviewed (due immediately) |

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "queue": [
      {
        "revisionCard": {
          "id": "clz_card_001",
          "dueDate": "2026-03-20T00:00:00.000Z",
          "interval": 1,
          "repetition": 0,
          "easeFactor": 2.5,
          "totalReviews": 0
        },
        "problem": {
          "id": "clz_problem_001",
          "title": "Two Sum",
          "difficulty": "EASY",
          "tags": ["array", "hash-table"],
          "platform": "LEETCODE",
          "platformUrl": "https://leetcode.com/problems/two-sum/",
          "language": "PYTHON",
          "solutionCode": "def twoSum..."
        },
        "aiNotes": {
          "status": "DONE",
          "content": { "keyInsight": "..." }
        }
      }
    ],
    "meta": {
      "totalDue": 8,
      "newCards": 3,
      "reviewCards": 5
    }
  }
}
```

---

### `POST /api/revision/review` 🔐
Submit a review rating for a revision card. The server runs the SM-2 algorithm and updates the card's scheduling, then writes an immutable revision log entry, and updates daily stats.

**Request Body:**
```json
{
  "revisionCardId": "clz_card_001",
  "rating": "GOOD"
}
```

**Zod Validation:**
- `revisionCardId`: string (cuid)
- `rating`: enum `AGAIN | HARD | GOOD | EASY`

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "updatedCard": {
      "id": "clz_card_001",
      "easeFactor": 2.5,
      "interval": 3,
      "repetition": 1,
      "dueDate": "2026-03-23T00:00:00.000Z"
    },
    "logEntry": {
      "id": "clz_log_001",
      "rating": "GOOD",
      "reviewedAt": "2026-03-20T15:00:00.000Z"
    },
    "streakUpdated": true,
    "currentStreak": 8
  }
}
```

---

### `GET /api/revision/history/:problemId` 🔐
Returns the complete revision history for a specific problem (all review log entries).

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "history": [
      {
        "id": "clz_log_001",
        "rating": "AGAIN",
        "easeFactorBefore": 2.5,
        "easeFactorAfter": 1.7,
        "intervalBefore": 1,
        "intervalAfter": 1,
        "nextDueDate": "2026-03-21T00:00:00.000Z",
        "reviewedAt": "2026-03-20T10:00:00.000Z"
      },
      {
        "id": "clz_log_002",
        "rating": "GOOD",
        "easeFactorBefore": 1.7,
        "easeFactorAfter": 1.9,
        "intervalBefore": 1,
        "intervalAfter": 2,
        "nextDueDate": "2026-03-23T00:00:00.000Z",
        "reviewedAt": "2026-03-21T09:00:00.000Z"
      }
    ]
  }
}
```

---

## Module 6: Analytics

### `GET /api/analytics/overview` 🔐
Returns high-level statistics for the user's dashboard overview cards (totals, streak, etc.).

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "overview": {
      "totalProblems": 234,
      "problemsByDifficulty": {
        "EASY": 89,
        "MEDIUM": 120,
        "HARD": 25,
        "UNKNOWN": 0
      },
      "problemsByPlatform": {
        "LEETCODE": 200,
        "GFG": 30,
        "MANUAL": 4
      },
      "aiNotesGenerated": 198,
      "totalReviews": 512,
      "currentStreak": 7,
      "longestStreak": 21,
      "totalUniqueTags": 18,
      "cardsWithDueToday": 8
    }
  }
}
```

---

### `GET /api/analytics/heatmap` 🔐
Returns daily activity data for the GitHub-style heatmap visualization. Returns 365 days of data.

**Query Parameters:**

| Param | Type | Default | Description |
|---|---|---|---|
| `year` | number | current year | Year to fetch data for |

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "heatmap": [
      {
        "date": "2026-01-01",
        "problemsSolved": 3,
        "problemsRevised": 5,
        "totalActivity": 8
      },
      {
        "date": "2026-01-02",
        "problemsSolved": 0,
        "problemsRevised": 7,
        "totalActivity": 7
      }
    ],
    "maxActivity": 15
  }
}
```

---

### `GET /api/analytics/weak-topics` 🔐
Returns the user's weakest topics ranked by average recall quality. "Weak" = highest proportion of AGAIN ratings.

**Query Parameters:**

| Param | Type | Default | Description |
|---|---|---|---|
| `limit` | number | 10 | How many weak topics to return |

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "weakTopics": [
      {
        "tag": "dynamic-programming",
        "totalProblems": 24,
        "avgEaseFactor": 1.6,
        "againRatio": 0.58,
        "goodOrEasyRatio": 0.22,
        "rank": 1
      },
      {
        "tag": "graphs",
        "totalProblems": 18,
        "avgEaseFactor": 1.9,
        "againRatio": 0.44,
        "goodOrEasyRatio": 0.33,
        "rank": 2
      }
    ]
  }
}
```

---

### `GET /api/analytics/topic-breakdown` 🔐
Returns problem count broken down by tag for the bar/donut chart on the analytics page.

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "topics": [
      { "tag": "array", "count": 56 },
      { "tag": "dynamic-programming", "count": 24 },
      { "tag": "trees", "count": 22 },
      { "tag": "graphs", "count": 18 },
      { "tag": "two-pointers", "count": 15 }
    ]
  }
}
```

---

## Module 7: Extension Webhook

### `POST /api/extension/capture` 🔐
Endpoint called by the Chrome extension when a successful submission is detected. The extension sends the auto-captured problem data. This route runs the same logic as `POST /api/problems` but with additional duplicate detection and extension-specific fields.

**Auth Note:** The extension sends the Clerk JWT in the Authorization header, same as the web app.

**Request Body:**
```json
{
  "title": "Binary Search",
  "platform": "LEETCODE",
  "platformId": "704",
  "platformUrl": "https://leetcode.com/problems/binary-search/",
  "difficulty": "EASY",
  "tags": ["array", "binary-search"],
  "solutionCode": "def search(self, nums, target):\n    l, r = 0, len(nums)-1\n    while l <= r:\n        mid = (l+r)//2\n        if nums[mid] == target: return mid\n        elif nums[mid] < target: l = mid+1\n        else: r = mid-1\n    return -1",
  "language": "PYTHON",
  "submittedAt": "2026-03-20T15:30:00.000Z",
  "extensionVersion": "1.0.0",
  "captureSource": "submission_intercept"
}
```

**Response `201` (new problem created):**
```json
{
  "success": true,
  "data": {
    "action": "created",
    "problem": {
      "id": "clz_problem_099",
      "title": "Binary Search",
      "platform": "LEETCODE"
    }
  }
}
```

**Response `200` (problem already exists — duplicate):**
```json
{
  "success": true,
  "data": {
    "action": "updated",
    "problem": {
      "id": "clz_problem_050",
      "title": "Binary Search",
      "platform": "LEETCODE"
    },
    "message": "Problem already exists. Solution code has been updated with the latest submission."
  }
}
```

---

## Module 8: Webhooks (Internal)

### `POST /api/webhooks/clerk` 🔓
Receives Clerk webhook events (user.created, user.updated, user.deleted). Used to keep our `users` table in sync with Clerk without relying on the client-side sync call.

**Headers Required:**
- `svix-id`: Clerk webhook signature ID
- `svix-timestamp`: Webhook timestamp
- `svix-signature`: HMAC signature for verification

**Request Body:** Clerk webhook payload (varies by event type)

**Response `200`:**
```json
{ "success": true }
```

---

## Endpoint Summary Table

| # | Method | Path | Auth | Description |
|---|---|---|---|---|
| 1 | POST | `/api/auth/sync` | 🔐 | Sync Clerk user to our DB |
| 2 | GET | `/api/auth/me` | 🔐 | Get current user profile |
| 3 | GET | `/api/problems` | 🔐 | List problems (paginated, filterable) |
| 4 | POST | `/api/problems` | 🔐 | Create problem manually |
| 5 | GET | `/api/problems/:id` | 🔐 | Get problem details + notes |
| 6 | PATCH | `/api/problems/:id` | 🔐 | Update problem |
| 7 | DELETE | `/api/problems/:id` | 🔐 | Delete problem |
| 8 | POST | `/api/import/leetcode` | 🔐 | Start LeetCode bulk import |
| 9 | POST | `/api/import/gfg` | 🔐 | Start GFG bulk import |
| 10 | GET | `/api/import/jobs` | 🔐 | List import jobs |
| 11 | GET | `/api/import/jobs/:id` | 🔐 | Get import job status |
| 12 | POST | `/api/ai-notes/:id/generate` | 🔐 | Queue AI note generation |
| 13 | GET | `/api/ai-notes/:id` | 🔐 | Get AI notes for problem |
| 14 | GET | `/api/revision/queue` | 🔐 | Get today's revision queue |
| 15 | POST | `/api/revision/review` | 🔐 | Submit review rating (SM-2) |
| 16 | GET | `/api/revision/history/:id` | 🔐 | Get revision history for problem |
| 17 | GET | `/api/analytics/overview` | 🔐 | Dashboard overview stats |
| 18 | GET | `/api/analytics/heatmap` | 🔐 | Heatmap activity data |
| 19 | GET | `/api/analytics/weak-topics` | 🔐 | Weakest topics by recall |
| 20 | GET | `/api/analytics/topic-breakdown` | 🔐 | Problem count by tag |
| 21 | POST | `/api/extension/capture` | 🔐 | Extension submission capture |
| 22 | POST | `/api/webhooks/clerk` | 🔓 | Clerk webhook receiver |

---

*End of API Contract v1.0*
