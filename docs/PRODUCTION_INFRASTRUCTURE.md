# Production Infrastructure Matrix & External Providers

This document defines the authoritative production infrastructure topology, selected providers, environment bindings, and integration status for **FretFlow Guitar Learning Platform v2**.

---

## 1. Production Provider Topology

| Domain | Selected Production Provider | Deployment Model | Environment Bindings | Current Status |
| :--- | :--- | :--- | :--- | :--- |
| **Application Hosting** | **Vercel** | Serverless Next.js 16 (Turbopack) | Edge Network / Production DNS | **LOCAL MOCK ONLY** (Awaiting production deployment) |
| **Primary Database** | **Neon PostgreSQL** | Serverless Managed Postgres with connection pooling | `DATABASE_URL` (pooled), `DIRECT_URL` (direct) | **LOCAL MOCK ONLY** (Local Postgres running on port 5433) |
| **Object Storage** | **Cloudflare R2 / AWS S3** | S3-Compatible Object Store (Presigned URLs) | `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`, `AWS_S3_BUCKET` | **LOCAL MOCK ONLY** (Local mock storage provider active) |
| **Distributed Rate Limiting & Cache** | **Upstash Redis** | Serverless Redis REST API | `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | **LOCAL MOCK ONLY** (In-memory token bucket fallback active) |
| **Transactional Email** | **Resend** | Non-authoritative transactional API | `RESEND_API_KEY` | **LOCAL MOCK ONLY** (`ConsoleEmailProvider` active) |
| **Product Analytics** | **PostHog** | Client & Server Event Stream with learner opt-out | `POSTHOG_API_KEY`, `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST` | **LOCAL MOCK ONLY** (No-op / Console fallback active) |
| **Error Monitoring** | **Sentry** | Unified Client/Server Tracing with secret scrubber | `SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DSN` | **LOCAL MOCK ONLY** (`ConsoleErrorProvider` active) |

---

## 2. Configuration Status Classification

### A. Core Database & Compute
- **Status:** `LOCAL MOCK ONLY`
- **Details:** Local PostgreSQL database (`guitar_learning_db`) running locally on port 5433 with 7 applied migrations. Neon or Supabase cloud instances will be provisioned in the live certification phase.

### B. Distributed Rate Limiter
- **Status:** `LOCAL MOCK ONLY`
- **Details:** `RateLimiter` (`src/lib/rate-limit.ts`) evaluates against Upstash REST API if credentials exist. When unconfigured in development/test, it uses `MemoryRateLimiter`. In production, missing credentials trigger structured warning `ProductionRateLimiterUnconfigured`.

### C. Object Storage
- **Status:** `LOCAL MOCK ONLY`
- **Details:** `MediaStorageService` utilizes S3 presigned URL architecture. In development/testing, it operates against local mock target routes (`/api/admin/media/upload/mock-target`).

### D. Transactional Email
- **Status:** `LOCAL MOCK ONLY`
- **Details:** `EmailService` implements database-first non-authoritative delivery. `ConsoleEmailProvider` logs deliveries cleanly without crashing or rolling back ticket/auth transactions.

### E. Telemetry & Error Tracking
- **Status:** `LOCAL MOCK ONLY`
- **Details:** `ErrorMonitoringService` utilizes `ConsoleErrorProvider` locally with `sanitizePayload()` secret scrubbing. In production, setting `SENTRY_DSN` activates `SentryErrorProvider`.

---

## 3. Environment Variable Manifest

```bash
# Core Runtime (Required)
DATABASE_URL="postgresql://user:password@host/dbname?sslmode=require&pgbouncer=true"
DIRECT_URL="postgresql://user:password@host/dbname?sslmode=require"
AUTH_SECRET="min_32_characters_cryptographically_secure_secret"
NEXT_PUBLIC_APP_URL="https://fretflow.com"
NODE_ENV="production"

# Release & Diagnostic Identification
GIT_SHA="<git-commit-sha>"
VERCEL_GIT_COMMIT_SHA="<git-commit-sha>"
INTERNAL_OPS_TOKEN="secure_random_readiness_probe_token"

# External Managed Providers (Configured upon cloud deployment)
UPSTASH_REDIS_REST_URL="https://your-upstash-redis.upstash.io"
UPSTASH_REDIS_REST_TOKEN="your_upstash_rest_token"
AWS_ACCESS_KEY_ID="your_s3_or_r2_access_key"
AWS_SECRET_ACCESS_KEY="your_s3_or_r2_secret_key"
AWS_REGION="auto"
AWS_S3_BUCKET="fretflow-production-media"
RESEND_API_KEY="re_123456789"
SENTRY_DSN="https://key@sentry.io/project"
POSTHOG_API_KEY="phc_123456789"
```
