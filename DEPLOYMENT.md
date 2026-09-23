# 🚀 Production Deployment Guide

This guide provides step-by-step instructions for deploying the **Guitar Learning Platform for Beginners** to production using **Vercel** (Application Hosting) and **Neon / Supabase** (Managed PostgreSQL Database).

---

## 1. Production Architecture Overview

```text
                                 ┌─────────────────────────┐
                                 │   Custom Domain (HTTPS)  │
                                 └────────────┬────────────┘
                                              │
                                              ▼
                                 ┌─────────────────────────┐
                                 │    Vercel Edge Network  │
                                 │   Next.js 16 App Router │
                                 └────────────┬────────────┘
                                              │
                         ┌────────────────────┴────────────────────┐
                         │                                         │
                         ▼                                         ▼
            ┌─────────────────────────┐               ┌─────────────────────────┐
            │   Neon / Supabase Pool   │               │   Neon Direct Migrations │
            │      (Port 6543/PgBouncer)│               │          (Port 5432)    │
            └────────────┬────────────┘               └────────────┬────────────┘
                         │                                         │
                         └────────────────────┬────────────────────┘
                                              │
                                              ▼
                                 ┌─────────────────────────┐
                                 │   PostgreSQL 16+ Engine │
                                 └─────────────────────────┘
```

---

## 2. Prerequisites

1. **GitHub/GitLab Account:** Repository pushed to your remote origin.
2. **Vercel Account:** [vercel.com](https://vercel.com) account linked to your Git provider.
3. **Managed PostgreSQL Database:** An active PostgreSQL instance from [Neon](https://neon.tech) or [Supabase](https://supabase.com).

---

## 3. Managed Database Configuration (Neon / Supabase)

### 3.1 Neon Setup
1. Create a new Neon project: `guitar-learning-prod`.
2. Neon provides two connection strings:
   - **Pooled Connection String** (recommended for serverless queries):
     ```text
     postgresql://user:password@ep-xyz-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require&pgbouncer=true
     ```
   - **Direct Connection String** (required for running migrations):
     ```text
     postgresql://user:password@ep-xyz.us-east-2.aws.neon.tech/neondb?sslmode=require
     ```

### 3.2 Supabase Setup
1. Create a new project: `guitar-learning-prod`.
2. In **Project Settings -> Database**:
   - Connection Pooling (Session/Transaction mode): port `6543` for `DATABASE_URL`.
   - Direct Connection: port `5432` for `DIRECT_URL`.

---

## 4. Production Environment Variables

Configure the following variables in the **Vercel Project Settings -> Environment Variables**:

| Variable | Description | Example / Generation |
|---|---|---|
| `DATABASE_URL` | Pooled PostgreSQL connection string | `postgresql://...neon.tech/neondb?sslmode=require&pgbouncer=true` |
| `AUTH_SECRET` | 32+ character random secret for HMAC SHA-256 session token signing | Generate via `openssl rand -base64 32` |
| `AUTH_URL` | Canonical production URL (HTTPS) | `https://guitar.yourdomain.com` (or `https://your-project.vercel.app`) |
| `NEXT_PUBLIC_APP_URL`| Public canonical URL for browser links | `https://guitar.yourdomain.com` |

> [!WARNING]
> Never set `AUTH_URL` or `NEXT_PUBLIC_APP_URL` to `http://localhost:3000` in your production environment.

---

## 5. Deployment Options

### Option A: Git Integration (Recommended for CI/CD)
1. In Vercel, click **Add New -> Project**.
2. Select your `guitar-learning-platform` repository.
3. Keep the default framework preset: **Next.js**.
4. In **Build & Development Settings**:
   - Build Command: `next build` (or `prisma generate && next build`)
   - Install Command: `npm install`
5. Add the Environment Variables configured in Section 4.
6. Click **Deploy**.

### Option B: Vercel CLI
```bash
# 1. Login to Vercel
npx vercel login

# 2. Link local repository to Vercel project
npx vercel link

# 3. Pull production environment variables
npx vercel env pull .env.production

# 4. Deploy to Production
npx vercel --prod
```

---

## 6. Database Migration & Seeding on Production

Once your production database is online and reachable:

### 6.1 Apply Migrations
```bash
# Run migrations using the direct database connection
npx prisma migrate deploy
```
*Note: Never run `prisma migrate dev` or `prisma db push` in production.*

### 6.2 Verify Migration Status
```bash
npx prisma migrate status
```
Expected output: `Database schema is up to date!`

### 6.3 Seed Initial Curriculum & Chords
```bash
# Execute deterministic, idempotent seed
npx prisma db seed
```
This populates:
- 1 Course (`Beginner Guitar Fundamentals`)
- 6 Modules & 30 progressive lessons
- 10 Foundational open chords with fingering diagrams
- 5 Starter achievements
- 6 Learning goals
- Multiple-choice lesson quizzes

---

## 7. Post-Deployment Verification

### 7.1 Health Check Probe
Verify that the deployment is live and communicating with PostgreSQL:
```bash
curl -i https://your-production-url.vercel.app/api/health
```
Expected response:
```json
{
  "status": "ok",
  "database": "connected",
  "timestamp": "2026-09-23T...",
  "uptime": 42,
  "environment": "production"
}
```

### 7.2 Run Automated Production E2E
Execute the Playwright Golden Path and Guitar Utilities test suite directly against your live production domain:
```bash
PLAYWRIGHT_TEST_BASE_URL=https://your-production-url.vercel.app npm run test:e2e:prod
```

### 7.3 Manual Golden Path Check
1. Open `https://your-production-url.vercel.app/`
2. Register a new user account.
3. Complete onboarding stepper (Steps 1–7).
4. Verify Dashboard displays "One Clear Next Action".
5. Open Lesson 1, complete required sections, and pass the quiz ($\ge 60\%$).
6. Verify +20 XP awarded and Lesson 2 unlocks.
7. Open `/tuner` and verify reference tone plucking.
8. Open `/library` and verify Fretboard Explorer scales.
9. Log out and log back in to verify session and progress persistence.

---

## 8. Rollback Strategy

1. **Instant Application Rollback:**
   - In the Vercel Dashboard -> **Deployments**, locate the previously stable deployment.
   - Click the three dots -> **Instant Rollback**. Traffic switches within seconds.
2. **Database Schema Forward-Fix:**
   - Prisma migrations cannot be reversed automatically without risk of data loss.
   - For database issues, prefer deploying a forward-fix migration (`prisma migrate dev --create-only` in development, followed by testing and `prisma migrate deploy`).
