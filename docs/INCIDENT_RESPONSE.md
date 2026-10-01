# Incident Response & Severity Management Runbook

This document defines incident severity classifications, escalation pathways, containment steps, and security breach procedures for **FretFlow Guitar Learning Platform v2**.

---

## 1. Incident Severity Model

| Severity Level | Definition | Impact Scope | Response SLA | Escalation |
| :--- | :--- | :--- | :--- | :--- |
| **SEV-1 (Critical)** | Catastrophic outage, database corruption, security breach, or total platform unavailability. | > 25% of learners affected or integrity of database/secrets at risk. | **Immediate (< 15 mins)** | Platform Owner & Lead Engineers |
| **SEV-2 (Major)** | Major functionality impaired (e.g. email delivery failing, audio pitch detection degraded, support desk unreachable). Workaround not available. | Core learning workflow partially blocked. | **< 1 Hour** | On-Call Engineer |
| **SEV-3 (Minor)** | Non-blocking defect, reporting discrepancy, minor UI glitch, or localized error. Workaround available. | Isolated user impact. | **< 24 Hours** | Assigned in next planning cycle |

---

## 2. Standard Incident Lifecycle

```text
Detect → Triage & Classify → Contain & Mitigate → Recover → Verify → Postmortem
```

### 1. Detection
- Alerts from Sentry, external synthetic uptime monitors, or elevated error rates in structured logs (`UnhandledApiError`).

### 2. Triage & Classification
- Determine severity level (`SEV-1`, `SEV-2`, `SEV-3`).
- Assign Incident Commander.

### 3. Containment
- If data corruption or security breach is active: Enable Maintenance Mode (`MAINTENANCE_MODE="true"`).
- If deployment caused failure: Invoke instant Vercel rollback.

### 4. Recovery & Verification
- Apply hotfix or restore database from point-in-time backup.
- Validate via `GET /api/internal/readiness`.
- Disable Maintenance Mode.

### 5. Blameless Postmortem
- Complete a formal review within 48 hours using `docs/POSTMORTEM_TEMPLATE.md`.

---

## 3. Security Incident Response Protocol

### A. Suspected Secret or Credential Leak
If `AUTH_SECRET`, database passwords, or provider API keys are suspected leaked:
1. **Rotate Credentials Immediately:**
   - Generate new cryptographic secret.
   - Update environment variables in Vercel.
2. **Revoke Active Sessions:**
   - Execute master session revocation in database:
     ```sql
     DELETE FROM "Session";
     ```
3. **Invalidate Pending Tokens:**
   - Delete all active password reset and email verification tokens.
4. **Audit Access:**
   - Inspect `AdminAuditLog` and `SecurityEvent` tables for unauthorized actions during the vulnerability window.

### B. Account Compromise
1. Suspend affected user account via Admin User Management (`/admin/users/[id]`).
2. Revoke all active sessions for the user.
3. Trigger password reset workflow to verified email address.
