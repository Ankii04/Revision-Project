# DSA Revision Platform — System Architecture & ERD

**Version:** 1.0 | **Phase:** 1 — Design

---

## System Architecture Diagram

```mermaid
graph TB
    subgraph CLIENT["Client Layer"]
        BROWSER["Browser\n(Next.js 14 App)"]
        EXT["Chrome Extension\n(Plasmo + MV3)"]
    end

    subgraph EDGE["Edge / CDN"]
        VERCEL["Vercel Edge Network\n(CDN + Global Routing)"]
        CLERK_EDGE["Clerk Edge Middleware\n(Auth validation on every request)"]
    end

    subgraph APP["Application Layer (Vercel Serverless)"]
        NEXTJS["Next.js 14 App Router\n(SSR + API Routes)"]
        
        subgraph API_ROUTES["API Route Handlers"]
            AUTH_API["Auth Routes\n/api/auth/*"]
            PROB_API["Problem Routes\n/api/problems/*"]
            IMPORT_API["Import Routes\n/api/import/*"]
            AI_API["AI Notes Routes\n/api/ai-notes/*"]
            REV_API["Revision Routes\n/api/revision/*"]
            ANALYTICS_API["Analytics Routes\n/api/analytics/*"]
            EXT_API["Extension Route\n/api/extension/capture"]
            WEBHOOK_API["Webhook Routes\n/api/webhooks/*"]
        end

        subgraph SERVICE_LAYER["Service Layer (Business Logic)"]
            PROB_SVC["ProblemService"]
            IMPORT_SVC["ImportService"]
            AI_SVC["AiNotesService"]
            SM2_SVC["SM2Engine"]
            ANALYTICS_SVC["AnalyticsService"]
        end
    end

    subgraph QUEUE["Async Processing (Railway)"]
        BULLMQ["BullMQ Worker\n(Node.js process)"]
        subgraph QUEUES["Queues"]
            IMPORT_Q["import-queue\n(LeetCode/GFG scraping)"]
            AI_Q["ai-notes-queue\n(Claude API calls)"]
            STATS_Q["stats-queue\n(Daily aggregation)"]
        end
    end

    subgraph DATA["Data Layer"]
        PG["PostgreSQL 15\n(Railway)"]
        REDIS["Redis\n(Upstash)"]
        
        subgraph DB_TABLES["Core Tables"]
            T1["users"]
            T2["problems"]
            T3["ai_notes"]
            T4["revision_cards"]
            T5["revision_logs"]
            T6["import_jobs"]
            T7["daily_stats"]
            T8["streak_records"]
        end
    end

    subgraph EXTERNAL["External Services"]
        CLERK_SVC["Clerk\n(Auth & User Mgmt)"]
        CLAUDE["Anthropic Claude API\n(claude-sonnet-4-20250514)"]
        LC_API["LeetCode\nGraphQL API"]
        GFG_API["GeeksForGeeks\nInternal API"]
    end

    %% Client connections
    BROWSER -->|HTTPS| VERCEL
    EXT -->|HTTPS + Clerk JWT| VERCEL

    %% Vercel flow
    VERCEL --> CLERK_EDGE
    CLERK_EDGE --> NEXTJS

    %% API routes to service layer
    NEXTJS --> AUTH_API & PROB_API & IMPORT_API & AI_API & REV_API & ANALYTICS_API & EXT_API & WEBHOOK_API
    AUTH_API & PROB_API & EXT_API --> PROB_SVC
    IMPORT_API --> IMPORT_SVC
    AI_API --> AI_SVC
    REV_API --> SM2_SVC
    ANALYTICS_API --> ANALYTICS_SVC

    %% Service to DB
    PROB_SVC & IMPORT_SVC & AI_SVC & SM2_SVC & ANALYTICS_SVC -->|Prisma ORM| PG

    %% Queue publishing
    IMPORT_SVC -->|Enqueue job| REDIS
    AI_SVC -->|Enqueue job| REDIS
    SM2_SVC -->|Enqueue stats update| REDIS

    %% BullMQ reads from Redis
    REDIS --> IMPORT_Q & AI_Q & STATS_Q
    IMPORT_Q & AI_Q & STATS_Q --> BULLMQ

    %% Worker external calls
    BULLMQ -->|GraphQL fetch| LC_API
    BULLMQ -->|HTTP fetch| GFG_API
    BULLMQ -->|Claude API| CLAUDE

    %% Worker writes back to DB
    BULLMQ -->|Prisma| PG

    %% Cache
    PROB_SVC & ANALYTICS_SVC -->|Cache hit/miss| REDIS

    %% Clerk webhook
    CLERK_SVC -->|user.created webhook| WEBHOOK_API

    style CLIENT fill:#1e293b,color:#e2e8f0
    style EDGE fill:#0f172a,color:#e2e8f0
    style APP fill:#1e2d40,color:#e2e8f0
    style QUEUE fill:#1a2535,color:#e2e8f0
    style DATA fill:#172032,color:#e2e8f0
    style EXTERNAL fill:#1f1f1f,color:#e2e8f0
```

---

## Entity Relationship Diagram (ERD)

```mermaid
erDiagram
    users {
        string id PK "cuid()"
        string email UK
        string name
        string avatarUrl
        datetime createdAt
        datetime updatedAt
    }

    problems {
        string id PK "cuid()"
        string userId FK
        string title
        string slug
        enum platform "LEETCODE|GFG|CODEFORCES|MANUAL"
        string platformId
        string platformUrl
        enum difficulty "EASY|MEDIUM|HARD|UNKNOWN"
        string[] tags
        string[] companies
        boolean isPremium
        string solutionCode
        enum language "PYTHON|JAVA|CPP|..."
        datetime submittedAt
        string importedVia
        string importJobId FK
        datetime createdAt
        datetime updatedAt
    }

    ai_notes {
        string id PK "cuid()"
        string problemId FK "UNIQUE"
        enum status "PENDING|PROCESSING|DONE|FAILED"
        json content
        string promptUsed
        string modelVersion
        int regenerateCount
        datetime lastRegeneratedAt
        string errorMessage
        datetime createdAt
        datetime updatedAt
    }

    revision_cards {
        string id PK "cuid()"
        string userId FK
        string problemId FK "UNIQUE"
        float easeFactor "default 2.5"
        int interval "default 1 (days)"
        int repetition "default 0"
        datetime dueDate
        datetime lastReviewedAt
        int totalReviews
        int againCount
        int hardCount
        int goodCount
        int easyCount
        datetime createdAt
        datetime updatedAt
    }

    revision_logs {
        string id PK "cuid()"
        string userId FK
        string problemId FK
        enum rating "AGAIN|HARD|GOOD|EASY"
        float easeFactorBefore
        int intervalBefore
        float easeFactorAfter
        int intervalAfter
        datetime nextDueDate
        datetime reviewedAt
    }

    import_jobs {
        string id PK "cuid()"
        string userId FK
        enum platform "LEETCODE|GFG"
        enum status "QUEUED|RUNNING|COMPLETED|FAILED"
        string encryptedCookie
        int totalFound
        int totalImported
        int totalSkipped
        int totalFailed
        string errorMessage
        datetime startedAt
        datetime completedAt
        datetime createdAt
        datetime updatedAt
    }

    daily_stats {
        string id PK "cuid()"
        string userId FK
        date date "DATE type, no time"
        int problemsSolved
        int problemsRevised
        int againCount
        int hardCount
        int goodCount
        int easyCount
        datetime createdAt
        datetime updatedAt
    }

    streak_records {
        string id PK "cuid()"
        string userId FK "UNIQUE"
        int currentStreak
        int longestStreak
        datetime lastActiveDate
        datetime createdAt
        datetime updatedAt
    }

    %% Relationships
    users ||--o{ problems : "has many"
    users ||--o{ import_jobs : "has many"
    users ||--o{ revision_cards : "has many"
    users ||--o{ revision_logs : "has many"
    users ||--o{ daily_stats : "has many"
    users ||--|| streak_records : "has one"

    problems ||--|| ai_notes : "has one (optional)"
    problems ||--|| revision_cards : "has one (optional)"
    problems ||--o{ revision_logs : "has many"
    problems }o--|| import_jobs : "created by (optional)"
```

---

## Data Flow Diagrams

### Flow 1: LeetCode Cookie Import

```mermaid
sequenceDiagram
    participant U as User (Browser)
    participant API as Next.js API
    participant DB as PostgreSQL
    participant Q as Redis/BullMQ
    participant W as BullMQ Worker
    participant LC as LeetCode API
    participant AI as AI Queue

    U->>API: POST /api/import/leetcode {sessionCookie}
    API->>API: Validate with Zod
    API->>DB: Create ImportJob (status=QUEUED)
    API->>DB: Encrypt & store session cookie
    API->>Q: Enqueue job to import-queue
    API-->>U: 202 Accepted {jobId}

    Note over U: Frontend polls GET /api/import/jobs/:id every 3s

    Q->>W: Pick up import job
    W->>DB: Update ImportJob (status=RUNNING)
    
    loop For each page of submissions
        W->>LC: GraphQL: fetch accepted submissions
        LC-->>W: List of accepted problems + code
        
        loop For each problem
            W->>DB: Upsert Problem record
            W->>DB: Create RevisionCard (dueDate=today)
            W->>AI: Enqueue ai-notes-queue job
            W->>DB: Update ImportJob.totalImported++
        end
    end

    W->>DB: Update ImportJob (status=COMPLETED)
    W->>DB: Delete encrypted cookie from ImportJob
    U->>API: GET /api/import/jobs/:id
    API-->>U: {status: "COMPLETED", totalImported: 234}
```

---

### Flow 2: AI Notes Generation

```mermaid
sequenceDiagram
    participant W as BullMQ Worker
    participant DB as PostgreSQL
    participant CLAUDE as Anthropic API

    W->>DB: Fetch AiNotes (status=PENDING)
    W->>DB: Update status=PROCESSING
    W->>DB: Fetch Problem {title, solutionCode, tags, difficulty}
    
    W->>W: Build structured prompt with problem details
    
    W->>CLAUDE: POST /v1/messages (claude-sonnet-4-20250514)
    Note over W,CLAUDE: Prompt includes: problem title, user's code, difficulty, tags.\nAsk for: keyInsight, bruteForce, betterApproach, optimal, complexities.
    
    CLAUDE-->>W: Structured JSON response
    
    W->>W: Parse and validate Claude response
    W->>DB: Update AiNotes {status=DONE, content=parsed JSON}
    
    Note over W: If Claude fails after 3 retries:
    W->>DB: Update AiNotes {status=FAILED, errorMessage}
```

---

### Flow 3: SM-2 Spaced Repetition Review

```mermaid
sequenceDiagram
    participant U as User (Revision Mode)
    participant API as Next.js API
    participant SM2 as SM2Engine Service
    participant DB as PostgreSQL

    U->>API: GET /api/revision/queue
    API->>DB: SELECT revision_cards WHERE dueDate <= TODAY AND userId = me
    DB-->>API: List of due cards with problem data
    API-->>U: Today's queue (8 cards)

    loop For each card in queue
        U->>U: View problem title + tags (hidden code/notes)
        U->>U: Click "Show Solution"
        U->>U: Read their own code + AI notes
        U->>U: Rate recall: AGAIN / HARD / GOOD / EASY
        
        U->>API: POST /api/revision/review {revisionCardId, rating}
        API->>DB: Fetch RevisionCard
        API->>SM2: calculateNewSchedule(card, rating)
        
        Note over SM2: SM-2 Algorithm:\n- Convert rating to quality (0,3,4,5)\n- If quality < 3: reset interval=1, repetition=0\n- Else: interval = prev * easeFactor\n- EF = EF + (0.1 - (5-q)*(0.08 + (5-q)*0.02))\n- Clamp EF to min 1.3
        
        SM2-->>API: {newInterval, newEaseFactor, newDueDate}
        API->>DB: Update RevisionCard
        API->>DB: INSERT RevisionLog (immutable)
        API->>DB: Upsert DailyStats (problemsRevised++)
        API->>DB: Upsert StreakRecord (update currentStreak)
        API-->>U: {updatedCard, currentStreak}
    end
```

---

## Database Indexing Strategy

| Table | Index | Type | Purpose |
|---|---|---|---|
| `users` | `email` | B-tree UNIQUE | Login lookup |
| `problems` | `(userId, createdAt DESC)` | B-tree Composite | Main problem listing |
| `problems` | `(userId, difficulty)` | B-tree Composite | Difficulty filter |
| `problems` | `(userId, platform)` | B-tree Composite | Platform filter |
| `problems` | `(userId, platformId, platform)` | B-tree UNIQUE | Duplicate detection |
| `problems` | `tags` | GIN | Array tag search (raw SQL) |
| `ai_notes` | `status` | B-tree | Worker job pickup (PENDING) |
| `revision_cards` | `(userId, dueDate)` | B-tree Composite | Daily queue (most critical) |
| `revision_logs` | `(userId, reviewedAt DESC)` | B-tree Composite | History, analytics |
| `revision_logs` | `(userId, problemId)` | B-tree Composite | Per-problem history |
| `import_jobs` | `(userId, createdAt DESC)` | B-tree Composite | Job list per user |
| `import_jobs` | `status` | B-tree | Worker job pickup |
| `daily_stats` | `(userId, date DESC)` | B-tree Composite | Heatmap query |
| `daily_stats` | `(userId, date)` | B-tree UNIQUE | Upsert guard |

---

## Environment Variables Reference

```env
# Database
DATABASE_URL=postgresql://user:pass@host:5432/dsarevision

# Redis (Upstash)
UPSTASH_REDIS_REST_URL=https://...upstash.io
UPSTASH_REDIS_REST_TOKEN=AX...

# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...
CLERK_SECRET_KEY=sk_live_...
CLERK_WEBHOOK_SECRET=whsec_...

# Anthropic Claude
ANTHROPIC_API_KEY=sk-ant-...

# App
NEXT_PUBLIC_APP_URL=https://your-domain.com
ENCRYPTION_SECRET=32-char-random-string-for-cookie-encryption

# Extension (set during extension build)
NEXT_PUBLIC_API_BASE_URL=https://your-domain.com/api
```

---

*End of Architecture Document v1.0*
