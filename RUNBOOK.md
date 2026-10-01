# 📖 Site Reliability Engineering (SRE) Operations Runbook

This runbook provides on-call engineers and operators with triage steps, diagnostic procedures, and recovery workflows for production incidents across **FretFlow Guitar Learning Platform v2**.

---

## 1. Incident Severity Matrix

| Severity | Definition | Target Response | Notification | Escalation Runbook |
| :--- | :--- | :--- | :--- | :--- |
| **SEV-1 (Critical)** | Core learning platform down; database unreachable; login failing; security breach. | $< 15\text{ minutes}$ | Engineering Lead, Owner | Engage Maintenance Mode, see `docs/INCIDENT_RESPONSE.md` |
| **SEV-2 (High)** | Lesson completion / quiz scoring failing; practice sessions not recording; storage or email failing. | $< 1\text{ hour}$ | On-Call Engineer | See Section 2 Scenarios |
| **SEV-3 (Medium)** | Individual utility degraded (e.g. Tuner mic permission errors on specific browsers) or localized error. | $< 4\text{ hours}$ | Core Team | Normal triage |
| **SEV-4 (Low)** | Minor UI layout glitch, typo, or non-blocking metric discrepancy. | Next business day | Backlog triage | Non-urgent sprint cycle |

---

## 2. Common Scenarios & Triage Workflows

### Scenario A: Database Connection Pool Exhaustion (`P1001`, `P2024`)
- **Symptoms:** API endpoints returning HTTP 500 or 503; logs reporting `PrismaClientInitializationError` or `Can't reach database server at...`.
- **Diagnosis:**
  1. Check `/api/internal/readiness` with header `x-internal-secret: <INTERNAL_OPS_TOKEN>`. If returning HTTP 503, database probe failed.
  2. Inspect database active connections in Neon / Supabase dashboard.
  3. Verify whether serverless functions are exhausting connection slots.
- **Remediation:**
  1. Ensure `DATABASE_URL` in Vercel points to the **Pooled connection string** (port 6543 / PgBouncer mode) and NOT the direct port 5432.
  2. Append connection pool limits to `DATABASE_URL`: `?connection_limit=10&pool_timeout=20`.
  3. If connection count remains pinned, restart the Neon compute endpoint or restart Supabase Postgres.

### Scenario B: Health & Readiness Probes
- **Public Health (`/api/health`):**
  - Shallow check. Returns HTTP 200 `{ status: "ok" }`. If failing, server process or edge routing is completely down.
- **Protected Readiness (`/api/internal/readiness`):**
  - Requires `x-internal-secret: <token>` or Admin session.
  - Queries active PostgreSQL `SELECT 1` and checks provider readiness.
  - Command:
    ```bash
    curl -i -H "x-internal-secret: $INTERNAL_OPS_TOKEN" https://yourdomain.com/api/internal/readiness
    ```

### Scenario C: Correlating User Reports with Request IDs (`x-request-id`)
- **Symptoms:** User reports an unexpected error dialog with a diagnostic Request ID (e.g. `req-7a8b9c...`).
- **Diagnosis:**
  1. Search Vercel / Sentry / CloudWatch structured logs for `requestId: "req-7a8b9c..."`.
  2. The structured log contains `{ timestamp, level, event, route, method, status, durationMs, userIdHash, metadata }`.
  3. All sensitive credentials, tokens, and internal notes are automatically scrubbed via `src/lib/scrubber.ts`.

### Scenario D: Storage Provider (S3 / R2) Outage
- **Symptoms:** Media uploads fail with `500 STORAGE_PROVIDER_ERROR`; course editors unable to attach lesson audio/images.
- **Diagnosis:**
  1. Check AWS / Cloudflare R2 status dashboard.
  2. Test S3 bucket connectivity via AWS CLI:
     ```bash
     aws s3 ls "s3://$AWS_S3_BUCKET"
     ```
- **Remediation:**
  1. Existing published lessons continue serving through CDN caches.
  2. Notify content editors to pause uploads.
  3. If credentials expired, rotate `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` in Vercel project settings.

### Scenario E: Email Provider Outage (Non-Authoritative)
- **Symptoms:** Learners report missing password reset or ticket notification emails.
- **Diagnosis:**
  1. Support ticket creation and account updates **continue operating normally** due to database-first non-authoritative delivery.
  2. Inspect `NotificationDelivery` table for records with `status = 'FAILED'`.
- **Remediation:**
  1. Verify Resend / SMTP API quota and domain verification status.
  2. Support staff can reply directly in the web support desk (`/admin/support`).

### Scenario F: Upstash Redis Rate Limiter Outage
- **Symptoms:** Logs report `UpstashRateLimiterFailure` or `ProductionRateLimiterUnconfigured`.
- **Diagnosis:**
  1. `RateLimiter` automatically falls back to in-memory sliding window, preventing user lockouts.
  2. Verify Upstash Redis endpoint URL and REST token validity.

---

## 3. Maintenance Mode Control

In catastrophic incidents, activate Maintenance Mode to protect data integrity:

### Enable Maintenance Mode:
- **Via Owner Console:** Navigate to `/owner/features` or `/owner/system` and toggle **Platform Maintenance Mode**.
- **Via Vercel Environment:** Set `MAINTENANCE_MODE="true"` and trigger instant redeploy.

### Operational Behavior:
- All learner mutations return HTTP 503 `MAINTENANCE_MODE`.
- Read-only browsing on public pages remains available.
- `OWNER` role retains full operational bypass to diagnose and repair the system.

---

## 4. Disaster Recovery & Rollback Commands

### Instant Application Rollback
```bash
# Using Vercel CLI to rollback to previous deployment
npx vercel rollback [deployment-url-or-id]
```
Alternatively, use the **Vercel Dashboard -> Deployments -> Instant Rollback** button.

### Full Disaster Recovery & Database Restoration
See the authoritative disaster recovery guide:
👉 **[Disaster Recovery & Restore Runbook](file:///d:/MY%20CODE/guitar-learning-platform/docs/DISASTER_RECOVERY.md)**

---

## 5. Verification Checklist

### Post-Incident Recovery Verification
- [ ] `/api/health` returns HTTP 200 OK with `{"status":"ok"}`.
- [ ] `/api/internal/readiness` returns HTTP 200 OK with `{"status":"ready","checks":{"database":"healthy",...}}`.
- [ ] Landing page (`/`), Dashboard (`/dashboard`), and Learn (`/learn`) load cleanly.
- [ ] Test user can log in, view active streak, and complete a lesson without errors.
- [ ] Support Desk (`/support`) and Admin Console (`/admin`) load with zero data leakage.
