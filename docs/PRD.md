# DSA Revision Platform — Product Requirements Document (PRD)

**Version:** 1.0  
**Date:** 2026-03-20  
**Author:** Technical Co-Founder  
**Status:** Approved for Development

---

## 1. Problem Statement

Developers who practice DSA problems on platforms like LeetCode, GeeksForGeeks (GFG), and Codeforces face a critical retention problem: they solve hundreds of problems but cannot recall the key insight or approach when they encounter a similar problem in an interview weeks later.

The root causes are:
- **No centralized archive** — solutions are scattered across multiple platforms with no unified view.
- **No structured revisit system** — most developers re-solve problems randomly, not based on memory science.
- **No AI-powered understanding** — platforms show solutions but don't explain *why* an approach is optimal or break down the progression from brute force → optimal.
- **Passive learning** — reading editorials doesn't build muscle memory the way active recall does.

This platform solves all four problems in one place.

---

## 2. Target Users

### Primary User: "The Placement-Ready Developer"
- Age: 20–28
- CS undergrad or self-taught developer actively preparing for SDE roles
- Has solved 100–500 problems across LeetCode/GFG
- Preparing for Google, Amazon, Microsoft, or mid-tier product company interviews
- Pain: "I solved this problem 3 months ago and completely forgot how to do it"

### Secondary User: "The Continuous Learner"
- Working SDE with 1–5 YOE
- Keeps skills sharp for job switches
- Needs a low-friction daily revision habit (5–10 min/day)
- Pain: "I don't have time to re-solve problems from scratch every day"

### Tertiary User: "The Bootcamp Graduate"
- Recently completed a DSA bootcamp or course
- Has beginner-to-intermediate problem exposure
- Needs structure and guidance to understand *why* certain approaches work
- Pain: "I copy editorial solutions but don't truly understand them"

---

## 3. Core Features

### F1 — Problem Import
- **LeetCode Session Cookie Import**: User provides their LeetCode session cookie; the platform bulk-fetches all accepted submissions including the actual code written.
- **Chrome Extension Auto-Capture**: On every LeetCode/GFG submission, the extension silently captures problem metadata and solution code, sending it to our API.
- **Manual Entry**: User can manually add a problem with solution code if neither import method is available.
- **GFG Import**: Session-based import for GeeksForGeeks accepted submissions.

### F2 — Solution Viewer
- View your own submitted code (not editorial) for every saved problem.
- Syntax highlighting for all major languages (Python, Java, C++, JavaScript, Go).
- Read-only code view with language badge.
- Notes panel alongside code.

### F3 — AI-Generated Problem Notes
- Per problem, Claude generates:
  - **Key Insight**: The single "aha" moment that unlocks the problem.
  - **Brute Force**: The naive O(n²) or worse approach with complexity.
  - **Better Approach**: Intermediate optimisation if it exists.
  - **Optimal Approach**: The intended solution with full explanation.
  - **Time Complexity** and **Space Complexity** for each approach.
- Notes are generated once and cached — not re-generated on every view.
- User can request a "regenerate notes" if they feel the notes are off.

### F4 — Spaced Repetition (SM-2 Algorithm)
- Each problem has a spaced repetition card attached to it.
- Daily queue shows problems due for review today based on SM-2 scheduling.
- After viewing a problem in revision mode, user rates their recall: Again (0), Hard (3), Good (4), Easy (5).
- SM-2 algorithm recalculates the next review date and ease factor.
- Streak tracking: how many consecutive days the user completed their queue.

### F5 — Analytics Dashboard
- **GitHub-style heatmap**: Problem activity (solved/revised) per day over the past 12 months.
- **Topic breakdown**: Pie/bar chart of problems by tag (arrays, trees, DP, graphs, etc.)
- **Difficulty distribution**: Easy/Medium/Hard ratio.
- **Weak topics**: Topics where the user's average recall rating is lowest (most "Again" responses).
- **Streak counter**: Current and longest streak.
- **Total problems**: Imported, unique topics covered, AI notes generated.

### F6 — Authentication & Authorization
- Clerk-powered auth with Google OAuth.
- Every user sees only their own data — strict row-level isolation.
- Protected routes on frontend and API middleware validation on backend.

---

## 4. Out-of-Scope Features (v1)

These features are explicitly excluded from the MVP to keep scope controlled:

| Feature | Reason Excluded |
|---|---|
| Social features (sharing solutions, following users) | Adds complexity; focus is personal revision |
| Collaborative notes or comments | Not a study-group tool in v1 |
| Video explanations | Content moderation overhead |
| Codeforces import | API complexity; low ROI for initial user segment |
| Mobile app (iOS/Android) | Web-first; PWA is acceptable workaround |
| Custom problem creation from scratch | Use case is solved problems, not problem authoring |
| Leaderboards / gamification points | Out of scope; spaced repetition is the engagement driver |
| AI chat / ask-a-question about a problem | Future feature; too open-ended for v1 |
| Offline mode | Complex sync logic; defer to v2 |
| Team/org accounts | B2B model; not validated yet |

---

## 5. Success Metrics

### Acquisition
- **D7 Retention**: ≥ 40% of users who import problems return within 7 days.
- **D30 Retention**: ≥ 20% of users active after 30 days.

### Engagement
- **Daily Active Users (DAU) / Monthly Active Users (MAU)**: Target DAU/MAU ≥ 0.25 by month 3.
- **Problems Revised Per Session**: Average ≥ 5 problems reviewed per session.
- **Streak Length**: Median user streak ≥ 3 days after month 1.

### Feature Adoption
- **AI Notes Generation Rate**: ≥ 70% of imported problems have AI notes generated within 48h.
- **Extension Install Rate**: ≥ 30% of registered users install the Chrome extension.
- **Import Completion Rate**: ≥ 80% of users who start a LeetCode cookie import successfully complete it.

### Quality
- **API Error Rate**: < 0.5% of API requests return 5xx.
- **AI Notes Satisfaction**: ≥ 80% of users who view AI notes do not hit "Regenerate".
- **Time to First Revision Session**: ≤ 10 minutes from signup to completing first revision.

---

## 6. User Stories

### Epic 1: Onboarding & Import

**US-01**  
*As a developer preparing for interviews, I want to import all my LeetCode accepted submissions using my session cookie, so that I don't have to manually enter 200+ problems one by one.*

**US-02**  
*As a developer who solves problems daily, I want the Chrome extension to automatically capture my solutions the moment I submit on LeetCode, so that my archive stays up to date without any extra effort.*

**US-03**  
*As a GFG user, I want to import my GeeksForGeeks accepted submissions, so that problems from my college-level DSA practice are also in my revision system.*

### Epic 2: Solution Viewing

**US-04**  
*As a developer reviewing my past work, I want to view the exact code I submitted for a problem with proper syntax highlighting, so that I can quickly remind myself of my original approach without switching to LeetCode.*

**US-05**  
*As a developer who solves problems in multiple languages, I want to see the language badge clearly on each solution, so that I can immediately know whether this is my Python or Java solution.*

### Epic 3: AI Notes

**US-06**  
*As a developer who sometimes solves a problem without fully understanding the optimal approach, I want AI-generated notes that explain the key insight and break down brute force vs optimal solutions, so that I truly understand the problem before I revise it.*

**US-07**  
*As a developer who feels AI notes for a problem missed the point, I want to regenerate the AI notes for that specific problem, so that I can get a fresh explanation without losing my other data.*

### Epic 4: Spaced Repetition

**US-08**  
*As a developer building a consistent revision habit, I want a daily queue that shows me exactly which problems I need to revisit today based on the spaced repetition algorithm, so that I don't have to manually decide what to study.*

**US-09**  
*As a developer completing a revision session, I want to rate how well I remembered each problem (Again / Hard / Good / Easy), so that the algorithm correctly schedules harder problems more frequently and easy ones less frequently.*

### Epic 5: Analytics

**US-10**  
*As a developer tracking my preparation progress, I want to see a GitHub-style activity heatmap, streak counter, and a breakdown of my weak topics, so that I can identify gaps in my preparation and feel motivated by visible progress.*

---

## 7. Constraints & Assumptions

- **LeetCode scraping**: We rely on LeetCode's internal GraphQL API via session cookie. This is a best-effort integration; LeetCode may change their API at any time without notice.
- **AI Cost**: Claude API calls are not free. Notes are generated once per problem and cached permanently. Re-generation is rate-limited (max 3x per problem per day).
- **Extension permissions**: Manifest V3 has strict limits on background scripts. We use service workers for the extension.
- **CORS**: The extension communicates directly with our API — CORS must be explicitly configured for the extension's origin.
- **Clerk quotas**: Free tier allows up to 10,000 MAU — sufficient for launch.
- **Data privacy**: User solutions are private by default. We do not share solutions between users. We store hashed cookie tokens, never plaintext.

---

## 8. Non-Functional Requirements

| Requirement | Target |
|---|---|
| API Response Time (P95) | < 300ms for non-AI routes |
| AI Notes Generation Time | < 30s (async via queue) |
| Extension Submit-to-Capture Latency | < 2s after user clicks submit |
| Uptime SLA | 99.5% monthly |
| Database Query Time (P95) | < 50ms |
| Max File Size for Code Storage | 64KB per solution |
| Support for Code Length | Up to 10,000 characters |
| Concurrent Users at Launch | 500 DAU initially |

---

*End of PRD v1.0*
