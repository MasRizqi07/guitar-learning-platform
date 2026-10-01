# Production Release Governance & Rollback Runbook

This document defines the release lifecycle, branch governance, migration deployment gates, and application rollback procedures for **FretFlow Guitar Learning Platform v2**.

---

## 1. Release Lifecycle & Pipeline

```text
Feature Branch
      ↓
Pull Request (CI Automated Gates)
      ↓
CI Pipeline: Lint + Types + Migrations + Vitest + Build + Playwright
      ↓
Preview Deployment (Isolated DB & Storage)
      ↓
Merge to master
      ↓
Production Deployment (Vercel)
      ↓
Post-Deploy Smoke Check (/api/health, /api/internal/readiness)
      ↓
Release Version Tagging (e.g. v2.0.0-rc.1 -> v2.0.0)
```

---

## 2. Release Gates Checklist

Before promoting any commit to production:

- [ ] **Git SHA Invariant:** Production deployment maps to an immutable Git commit SHA. No release from dirty trees or floating tags.
- [ ] **CI Pipeline Green:** All automated checks pass (0 ESLint errors, 0 TypeScript errors, 200+ Vitest tests, 11 Playwright E2E journeys).
- [ ] **Database Migration Safety Check:**
  - Migrations must strictly be applied using `npx prisma migrate deploy`.
  - **Never run `prisma migrate dev` or `prisma db push` in production.**
  - Schema changes must follow expand-and-contract patterns (additive migrations first; do not drop columns until older code is fully retired).
- [ ] **Preview Environment Isolation:**
  - Pull request previews must **NEVER** share write credentials with the production database.
  - Previews must write to an ephemeral branch or dedicated preview database.
  - Media uploads in preview must use separate bucket prefixes or mock storage.
- [ ] **Post-Deploy Smoke Verification:**
  - `GET /api/health` returns HTTP 200 `{ status: "ok" }`.
  - Authenticated probe `GET /api/internal/readiness` returns HTTP 200 `{ status: "ready" }`.

---

## 3. Semantic Versioning Strategy

- **Local / Staging Phase:** `v2.0.0-rc.1`
- **Live Infrastructure Verification:** `v2.0.0`
- Subsequent patches follow standard semver: `v2.0.1` (patch), `v2.1.0` (minor backward-compatible), `v3.0.0` (major breaking).

---

## 4. Rollback Runbook

### A. Instant Application Rollback (< 1 Minute)
If an unexpected application-level bug or crash is discovered post-deployment:
1. Navigate to **Vercel Dashboard > Project > Deployments**.
2. Locate the previous verified Git SHA deployment.
3. Click the deployment menu and select **"Instant Rollback"**.
4. Traffic is immediately routed back to the previous immutable deployment artifact within seconds without re-building.

### B. Safe Rollback Conditions
- A software rollback is safe **if and only if** the database schema remains compatible with the previous application build.
- This is guaranteed by adhering to additive / backward-compatible migrations:
  1. **Phase 1 (Expand):** Add new optional columns/tables. Deploy application code that writes both old and new formats.
  2. **Phase 2 (Migrate):** Backfill existing data.
  3. **Phase 3 (Contract):** Deploy application code that reads only new formats. Remove old columns in a subsequent release.
- **Do not roll back migrations containing destructive schema changes (e.g. dropped tables/columns) without executing the disaster recovery restoration runbook.**
