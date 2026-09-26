# 🎸 Guitar Learning Platform for Beginners

A full-stack, production-ready web application engineered to guide novice guitar players through a structured, progressive learning roadmap:

$$\text{Learn} \longrightarrow \text{Practice} \longrightarrow \text{Quiz} \longrightarrow \text{Progress} \longrightarrow \text{Continue}$$

Built with a **Modular Monolith** architecture using **Next.js 16 (App Router)**, **TypeScript (Strict Mode)**, **Tailwind CSS v4**, **PostgreSQL 18**, **Prisma 6**, and **Web Audio API acoustic guitar string tone synthesis**.

---

## 📖 Table of Contents

- [1. Executive Summary](#1-executive-summary)
- [2. Product Principles & Architecture](#2-product-principles--architecture)
- [3. Tech Stack](#3-tech-stack)
- [4. Database & Domain Models](#4-database--domain-models)
- [5. Core Features & User Journey](#5-core-features--user-journey)
- [6. Security & Anti-Cheat Invariants](#6-security--anti-cheat-invariants)
- [7. Local Development Setup](#7-local-development-setup)
- [8. Database Migration & Seeding](#8-database-migration--seeding)
- [9. Testing Strategy & Quality Gates](#9-testing-strategy--quality-gates)
- [10. Production Deployment Guide](#10-production-deployment-guide)

---

## 1. Executive Summary

Beginner guitar learners face significant hurdles: scattered YouTube tutorials, lack of a structured curriculum, difficulty practicing consistently, and uncertainty about what lesson should come next.

This platform solves this by providing:
1. **One Clear Next Action:** The authenticated dashboard immediately directs the learner to their next logical lesson or daily practice target.
2. **30 Deterministic Lessons Across 6 Modules:** From holding a pick and guitar anatomy to essential open chords, chord transitions, rhythm & strumming, music theory, and a capstone full-song playthrough.
3. **Focus Practice Room with Web Audio API:** Dual-oscillator acoustic guitar string tone synthesis and metronome pulses without external media dependencies.
4. **Server-Authoritative Progression:** Progress percentages, quiz evaluations, XP ledger entries, streak updates, and achievement unlocks are computed exclusively on the server.
5. **Multi-Platform UI:** Designed for mobile, tablet, and desktop with dark mode `#0E1014` and warm amber `#F59E0B` accents conforming to WCAG 2.2 AA accessibility guidelines.

---

## 2. Product Principles & Architecture

The application adopts a **Modular Monolith** structure with strict layer separation:

```text
┌─────────────────────────────────────────────────────────┐
│        Presentation Layer (React Server & Client)        │
│          App Router, Tailwind CSS v4, Lucide Icons       │
└────────────────────────────┬────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────┐
│      Application Layer (Use Cases & Route Handlers)     │
│       Session verification, Zod parsing, API Responses  │
└────────────────────────────┬────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────┐
│        Domain Layer (Pure Business Logic Engines)        │
│    Quiz Evaluator, Streak Engine, Level & XP, Anti-Cheat │
└────────────────────────────┬────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────┐
│        Repository Layer (Prisma Data Access Bounds)      │
│      Atomic transactions, Unique constraints, Indexes    │
└────────────────────────────┬────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────┐
│                  PostgreSQL 18 Database                  │
└─────────────────────────────────────────────────────────┘
```

### Directory Structure

```text
guitar-learning-platform/
├── prisma/
│   ├── schema.prisma              # 22 models, 13 enums, composite unique keys & indexes
│   ├── migrations/                # Versioned SQL migration history
│   └── seed.ts                    # Deterministic, re-runnable seed script
├── src/
│   ├── app/                       # Next.js App Router
│   │   ├── (app)/                 # Protected shell (Sidebar + BottomNav)
│   │   │   ├── dashboard/page.tsx # "One Clear Next Action" Priority Dashboard
│   │   │   ├── learn/page.tsx     # 6-Module Curriculum Roadmap
│   │   │   ├── lessons/[slug]/    # Section-by-section interactive lesson reader
│   │   │   ├── practice/page.tsx  # Focus practice room with metronome & chord timer
│   │   │   ├── library/page.tsx   # Interactive SVG Chord Library with audio playback
│   │   │   ├── progress/page.tsx  # Verified analytics, streaks, XP ledger
│   │   │   └── profile/page.tsx   # Timezone settings & daily practice target
│   │   ├── (auth)/                # Login & Registration with encrypted session cookies
│   │   ├── (onboarding)/          # Stepper onboarding & skill placement
│   │   ├── api/                   # 18 Server-Authoritative REST Route Handlers
│   │   └── page.tsx               # Public landing page with core loop presentation
│   ├── components/
│   │   ├── guitar/ChordDiagram.tsx# Accessible SVG interactive chord fingering diagrams
│   │   └── ui/                    # Button, Card, Badge, Input, ProgressBar primitives
│   ├── domain/                    # Pure, zero-dependency business calculation modules
│   ├── lib/                       # Prisma client singleton, Auth cryptography, Web Audio API
│   ├── repositories/              # Isolated Prisma data access layer
│   ├── services/                  # Orchestration layer with database transaction bounds
│   └── validations/               # Zod validation schemas
└── tests/
    ├── unit/domain.test.ts        # Pure domain logic unit tests (21 tests)
    └── integration/               # Database integration tests & Golden Path (32 tests)
```

---

## 3. Tech Stack

| Layer | Technology | Details |
|---|---|---|
| **Framework** | Next.js 16.3.5 | App Router with Turbopack |
| **Language** | TypeScript 5.8 | Strict mode enabled |
| **Database** | PostgreSQL 18.4 | Local trust / Neon / Supabase |
| **ORM** | Prisma 6.19.3 | Type-safe query engine & migrations |
| **Styling** | Tailwind CSS v4 | Curated dark neutral aesthetic (`#0E1014`) |
| **Audio** | Web Audio API | Dual-oscillator acoustic plucked tone synthesis |
| **Validation** | Zod 3.24 | Schema validation for all external payloads |
| **Testing** | Vitest 4.1 | Fast unit and database integration testing |

---

## 4. Database & Domain Models

The Prisma schema defines 22 models and 13 enums:

- **Authentication & User:** `User`, `Profile`, `OnboardingProfile`, `LearningGoal`, `UserLearningGoal`
- **Curriculum:** `Course`, `Module`, `Lesson`, `LessonSection`, `LessonProgress`
- **Practice Room:** `PracticeSession`, `PracticeSessionChord`
- **Quiz Engine:** `Quiz`, `Question`, `AnswerOption`, `QuizAttempt`, `QuizAttemptAnswer`
- **Library:** `Chord` (with structured JSON fingering and string voicings)
- **Gamification & Audit:** `XPTransaction` (idempotent ledger), `Achievement`, `UserAchievement`, `LearningActivity`

### Key Invariants & Constraints

- `User.email`: Unique
- `LessonProgress`: Unique on `(userId, lessonId)`
- `Module`: Unique on `(courseId, slug)` and `(courseId, order)`
- `Lesson`: Unique on `(moduleId, slug)` and `(moduleId, order)`
- `QuizAttemptAnswer`: Unique on `(quizAttemptId, questionId)`
- `XPTransaction`: Unique on `idempotencyKey`
- `UserAchievement`: Unique on `(userId, achievementId)`

---

## 5. Core Features & User Journey

### 1. Registration & Stepper Onboarding
- Learner selects guitar type (`ACOUSTIC`, `ELECTRIC`, `CLASSICAL`), experience level, daily practice goal (`10`, `15`, `30`, `45`, `60` min), and goals.
- Adaptive placement assessment assigns starting level: `BEGINNER_1`, `BEGINNER_2`, `BEGINNER_3`, or `INTERMEDIATE_1`.

### 2. Action-Oriented Dashboard
- Displays **One Clear Next Action** banner (e.g. "Next up: Lesson 1 - Introduction to Guitar").
- Tracks daily practice progress bar (`X / 15 mins today`).
- Highlights current streak and XP level progression.

### 3. Curriculum & Dynamic Availability Locking
- 30 progressive lessons across 6 modules.
- Lessons are dynamically locked based on prerequisite completion or placement level.
- Interactive section reader tracks progress through text, warnings, practice prompts, and summaries.

### 4. Focus Practice Room
- Built-in acoustic guitar synthesizer and metronome.
- Anti-cheat duration verification (Lesson practice $\ge 60\text{s}$, Chord practice $\ge 120\text{s}$, Daily practice $\ge 300\text{s}$).
- Learner difficulty feedback: `EASY`, `OKAY`, `DIFFICULT`.

### 5. Secure Quiz Engine
- Questions never expose `isCorrect` to the browser before submission.
- The server evaluates submitted answer options and computes percentage score ($S = \frac{\text{correct}}{\text{total}} \times 100$).
- Passing threshold is strictly enforced at 60%.

### 6. Transactional Lesson Completion
- Executed inside an atomic database transaction.
- Verifies authentication, lesson existence, required sections viewed, valid practice completed, and passing quiz score.
- Awards +20 XP idempotently, updates calendar-day streak in user's timezone, evaluates achievements (`FIRST_STEP`, `FIRST_CHORD`, etc.), and unlocks the next lesson.

### 7. Interactive Chord Library & Fretboard Explorer
- 10 foundational chords seeded: C Major, G Major, D Major, A Major, E Major, A Minor, E Minor, D Minor, F Major, B7.
- Searchable by name or constituent notes; filterable by Major, Minor, Seventh.
- SVG chord diagram rendering with real-time plucked audio preview and 1-click practice launch.
- **Interactive 15-Fret Fretboard Explorer:** Visual neck with scale overlays (C Major, A Minor Pentatonic, E Minor Pentatonic, A Blues Scale), root highlighting, and click-to-pluck real-time audio.

### 8. Interactive Guitar Tuner (`/tuner`)
- **Microphone Pitch Detection:** Built-in Web Audio API autocorrelation frequency detector that analyzes open string vibration, displays real-time Hz, nearest string target, and cent offset with a visual needle gauge.
- **Acoustic Reference Tones:** Clean synthesized acoustic plucked tones for all 6 standard strings (E2, A2, D3, G3, B3, E4) with continuous repeat mode to allow tuning by ear.
- **Beginner Tuning Guidance:** Peg turning direction advice, anti-backlash string tension locking, and daily tuning best practices.

---

## 6. Security & Anti-Cheat Invariants

- **Multi-Tenant Isolation:** `userId` is always extracted from the cryptographically verified session token; client-supplied `userId` parameters in bodies or query parameters are ignored.
- **Client Zero-Trust:** Lesson completion, XP awards, quiz scores, and streak calculations cannot be dictated by the browser.
- **Idempotency Protection:** XP transactions enforce unique idempotency keys (e.g. `lesson-completed:{userId}:{lessonId}`); retries or duplicate network requests will never duplicate XP.
- **Secure Cookies:** Session tokens are stored in `httpOnly`, `sameSite=lax`, `secure` (in production) cookies.

---

## 7. Local Development Setup

### Prerequisites

- **Node.js:** `v20.x` or later (tested on Node `v26.7.0`)
- **PostgreSQL:** `16+` (tested on PostgreSQL 18.4 on port `5433`)
- **npm:** `10+`

### Installation

1. **Clone the repository:**
   ```bash
   git clone <repo-url>
   cd guitar-learning-platform
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment Variables:**
   Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
   Configure your database connection:
   ```env
   DATABASE_URL="postgresql://postgres:postgres@localhost:5432/guitar_learning_db?schema=public"
   AUTH_SECRET="development-32-character-random-secret-key"
   AUTH_URL="http://localhost:3000"
   NEXT_PUBLIC_APP_URL="http://localhost:3000"
   ```

---

## 8. Database Migration & Seeding

1. **Apply Prisma migrations:**
   ```bash
   npx prisma migrate deploy
   ```

2. **Seed deterministic curriculum & chords:**
   ```bash
   npx prisma db seed
   ```
   *(The seed script is idempotent using upserts and can safely be run repeatedly).*

---

## 9. Testing Strategy & Quality Gates

The platform maintains a strict distinction between **Pure Unit Tests**, **Database Service Integration Tests**, and **Real Playwright Browser End-to-End Tests**:

```text
                                 ┌──────────────────────────────┐
                                 │   Playwright Browser E2E     │ (4 tests in Chromium)
                                 ├──────────────────────────────┤
                                 │ Database Service Integration │ (86 tests in Vitest)
                                 ├──────────────────────────────┤
                                 │   Pure Domain & Math Unit    │ (33 tests in Vitest)
                                 └──────────────────────────────┘
```

### 1. Run Vitest Unit & Integration Tests (119 Tests)

```bash
npm test
```

- `tests/unit/domain.test.ts`: 21 tests covering quiz scoring, streak calendar calculations, level formulas, lesson availability state machines, and anti-cheat duration thresholds.
- `tests/unit/audio-math.test.ts`: 12 tests validating fret frequency formula ($f = f_0 \times 2^{\text{fret}/12}$), octave calculation, cent deviations, and autocorrelation pitch detection against synthetic signals.
- `tests/integration/auth-onboarding.test.ts`: 4 tests for password hashing, multi-user isolation, and onboarding placement.
- `tests/integration/curriculum.test.ts`: 5 tests for roadmap loading, dynamic locking, and section progress tracking.
- `tests/integration/practice-quiz.test.ts`: 5 tests for anti-cheat validation, answer leakage prevention, and server scoring.
- `tests/integration/lesson-completion.test.ts`: 5 tests for atomic transactional completion and idempotency.
- `tests/integration/security-idor.test.ts`: 10 tests verifying IDOR cross-user protection, quiz answer sanitization, practice anti-cheat boundary enforcement, and XP idempotency.
- `tests/integration/golden-path.test.ts`: 13 tests exercising the end-to-end backend service lifecycle.
- `tests/integration/health.test.ts`: 1 test verifying active database connection ping via `/api/health`.
- `tests/integration/auth-security-v2.test.ts`: 16 tests covering Phase A account security (persistent token hashing, revocable multi-device sessions, verification tokens, password resets, rate limiting).
- `tests/integration/admin-rbac-v2.test.ts`: 27 tests covering Phase B administrative isolation (RBAC boundary, user suspension, session invalidation, role management, `LAST_OWNER_PROTECTED` invariants, and secret-scrubbed audit logs).

**Result: 119/119 Vitest tests passing across 11 test suites.**

### 2. Run Real Playwright Browser End-to-End Tests (4 Tests)

```bash
# Local browser testing
npm run test:e2e

# Target staging or live production URL
PLAYWRIGHT_TEST_BASE_URL=https://your-production-url.vercel.app npm run test:e2e:prod
```

- `tests/e2e/golden-path.spec.ts`: Executes true browser user journey: Landing $\rightarrow$ Register $\rightarrow$ Stepper Onboarding (Steps 1–7) $\rightarrow$ Dashboard $\rightarrow$ Roadmap $\rightarrow$ Lesson 1 sections $\rightarrow$ Quiz submission $\rightarrow$ Results & progress persistence $\rightarrow$ Sign out $\rightarrow$ Sign in verification.
- `tests/e2e/tuner.spec.ts`: Verifies Tuner UI, 6 reference tones plucking, loop playback, microphone error fallback, and Interactive Fretboard scale filter switches in the browser.
- `tests/e2e/admin-rbac.spec.ts`: Exercises owner administration: Owner Login $\rightarrow$ Access `/admin` $\rightarrow$ Search User in Directory $\rightarrow$ Inspect User Detail $\rightarrow$ Suspend Account with Reason $\rightarrow$ Verify Sessions Revoked $\rightarrow$ Unsuspend Account $\rightarrow$ Change User Role $\rightarrow$ Inspect Immutable Audit Log.

**Result: 4/4 Playwright browser tests passing in Chromium.**

### 3. Backoffice & Platform Owner Bootstrap

To safely provision the initial platform `OWNER` without exposing public HTTP setup endpoints:

```bash
npm run admin:bootstrap-owner -- --email=owner@example.com
```

Refer to:
- [`docs/RBAC.md`](docs/RBAC.md) — Comprehensive 5-role permission matrix, operational boundaries, and security invariants.
- [`docs/ADMIN_OPERATIONS.md`](docs/ADMIN_OPERATIONS.md) — Operational runbook for user directory search, suspension lifecycles, and audit inspection.

### 4. Typecheck, Lint, and Production Build

```bash
npm run lint         # ESLint (0 errors, 0 warnings)
npx tsc --noEmit     # TypeScript Strict Typecheck (0 errors)
npm run build        # Next.js 16 Production Build (45 routes compiled cleanly)
```

---

## 10. Production Deployment & Operational Documentation

Comprehensive operational documentation has been established:
- 📖 [DEPLOYMENT.md](file:///d:/MY%20CODE/guitar-learning-platform/DEPLOYMENT.md): Detailed guide for Vercel, Neon/Supabase PostgreSQL connection pooling, migrations, and seeding.
- 🛡️ [SECURITY.md](file:///d:/MY%20CODE/guitar-learning-platform/SECURITY.md): Threat modeling, session token cryptography, anti-cheat invariants, and response headers.
- 📋 [RUNBOOK.md](file:///d:/MY%20CODE/guitar-learning-platform/RUNBOOK.md): Site Reliability Engineering incident response matrix, connection pool triage, and recovery workflows.

### Quick Deploy to Vercel

1. Push your repository to GitHub / GitLab.
2. Import the project into [Vercel](https://vercel.com).
3. Set the Environment Variables in the Vercel Dashboard:
   - `DATABASE_URL`: Pooled connection string from Neon or Supabase.
   - `AUTH_SECRET`: Random 32-character secret generated via `openssl rand -base64 32`.
   - `AUTH_URL`: Your canonical production domain (e.g. `https://your-project.vercel.app`).
   - `NEXT_PUBLIC_APP_URL`: Your canonical production domain.
4. Deploy and execute production migrations and seeding:
   ```bash
   npx prisma migrate deploy
   npx prisma db seed
   ```

---

## 📄 License

MIT © Guitar Learning Platform Team.
