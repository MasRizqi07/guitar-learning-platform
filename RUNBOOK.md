# 📖 Site Reliability Engineering (SRE) Operations Runbook

This runbook provides on-call engineers and operators with triage steps, diagnostic procedures, and recovery workflows for production incidents.

---

## 1. Incident Severity Matrix

| Severity | Definition | Target Response | Notification |
|---|---|---|---|
| **SEV-1 (Critical)** | Core learning platform down; database unreachable; login failing for all users | $< 15\text{ minutes}$ | Engineering Lead, DevOps |
| **SEV-2 (High)** | Lesson completion / quiz scoring failing; practice sessions not recording | $< 1\text{ hour}$ | On-Call Engineer |
| **SEV-3 (Medium)** | Individual utility degraded (e.g. Tuner mic permission errors on specific browsers) | $< 4\text{ hours}$ | Core Team |
| **SEV-4 (Low)** | Minor UI layout glitch, typo, or non-blocking metric discrepancy | Next business day | Backlog triage |

---

## 2. Common Scenarios & Triage Workflows

### Scenario A: Database Connection Pool Exhaustion (`P1001`, `P2024`)
- **Symptoms:** API endpoints returning HTTP 500 or 503; logs reporting `PrismaClientInitializationError` or `Can't reach database server at...`.
- **Diagnosis:**
  1. Check `/api/health` — if returning `{ status: "error" }` or HTTP 503, database connectivity is lost.
  2. Inspect database active connections in Neon / Supabase dashboard.
  3. Verify whether serverless functions are exhausting connection slots.
- **Remediation:**
  1. Ensure `DATABASE_URL` in Vercel points to the **Pooled connection string** (port 6543 / PgBouncer mode) and NOT the direct port 5432.
  2. Append connection pool limits to `DATABASE_URL`: `?connection_limit=10&pool_timeout=20`.
  3. If connection count remains pinned, restart the Neon compute endpoint or restart Supabase Postgres.

### Scenario B: Health Check Probe Failure (`/api/health` returns 503)
- **Symptoms:** Uptime monitor alerts triggers on `https://yourdomain.com/api/health`.
- **Diagnosis:**
  1. Query the endpoint with full verbose output:
     ```bash
     curl -i https://yourdomain.com/api/health
     ```
  2. Inspect Vercel runtime logs for the `/api/health` invocation.
  3. Test whether PostgreSQL credentials expired or IP allowlists changed.
- **Remediation:**
  1. Verify the `DATABASE_URL` secret in Vercel environment variables.
  2. Trigger a redeployment in Vercel to force fresh serverless containers.

### Scenario C: Failed Migration During Deployment
- **Symptoms:** Build or deployment pipeline fails during `prisma migrate deploy`.
- **Diagnosis:**
  1. Run `npx prisma migrate status` locally with the production connection string to identify the failed migration name.
  2. Review the SQL script in `prisma/migrations/<failed_migration>/migration.sql`.
- **Remediation:**
  1. If a migration partially applied, inspect table states via database GUI (Neon Console / Supabase Table Editor).
  2. If safe, mark the migration resolved using `npx prisma migrate resolve --applied "<migration_name>"` or `--rolled-back "<migration_name>"`.
  3. Never run `prisma db push` in production. Always commit a corrective forward migration.

### Scenario D: Microphone Pitch Detection Degraded on Tuner (`/tuner`)
- **Symptoms:** User reports needle gauge is frozen or microphone cannot be activated.
- **Diagnosis:**
  1. Check browser context: Web Audio `getUserMedia` requires a **Secure Context (HTTPS)**. It fails immediately on insecure HTTP.
  2. Check browser Permissions Policy: verify `Permissions-Policy: microphone=(self)` header is present.
  3. Verify whether browser autoplay policies blocked `AudioContext`.
- **Remediation:**
  1. Ensure users have granted microphone permissions in their browser settings bar (lock icon).
  2. Advise the user to switch to the **"By Ear (Tones)"** tab, which uses pure synthesized reference tones without requiring microphone hardware.

---

## 3. Deployment & Rollback Commands

### Instant Application Rollback
```bash
# Using Vercel CLI to rollback to previous deployment
npx vercel rollback [deployment-url-or-id]
```
Alternatively, use the **Vercel Dashboard -> Deployments -> Instant Rollback** button.

### Manual Database Backup & Verification
```bash
# If using pg_dump with direct connection URL
pg_dump "postgresql://user:password@direct-host:5432/dbname" --schema=public -f backup_$(date +%Y%m%d).sql
```
Neon and Supabase provide automated daily snapshots and point-in-time recovery (PITR) available directly in their management consoles.

---

## 4. Verification Checklists

### Post-Incident Recovery Verification
- [ ] `/api/health` returns HTTP 200 OK with `{"status":"ok"}`.
- [ ] Landing page (`/`), Dashboard (`/dashboard`), and Learn (`/learn`) load with zero console errors.
- [ ] Test user can log in and view active streak and XP totals.
- [ ] Practice timer and Tuner plucks render and emit sound cleanly.
