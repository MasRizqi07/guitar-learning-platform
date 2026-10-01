# Disaster Recovery, Backup & Restore Runbook

This document defines disaster recovery targets, database backup strategies, logical backup fallbacks, and the step-by-step restoration procedure for **FretFlow Guitar Learning Platform v2**.

---

## 1. Recovery Objectives (RPO & RTO)

> [!IMPORTANT]
> **Operational Classification:** `TARGET DEFINED` (Policy Target, Not Live-Verified Guarantee).
> The recovery objectives below represent architectural policy targets. Until an actual live cloud restore drill is executed on provisioned managed PostgreSQL infrastructure, these metrics remain operational targets rather than proven guarantees.

| Metric | Target | Classification | Rationale & Policy |
| :--- | :--- | :--- | :--- |
| **Recovery Point Objective (RPO)** | **< 1 Hour** | `TARGET DEFINED` | Maximum acceptable data loss window in the event of catastrophic primary cluster corruption. Managed PostgreSQL continuous WAL archiving provides theoretical sub-5-minute point-in-time recovery capability. |
| **Recovery Time Objective (RTO)** | **< 30 Minutes** | `TARGET DEFINED` | Maximum acceptable downtime from incident declaration to traffic restoration on an alternate restored database branch. |

---

## 2. Managed PostgreSQL Continuous Backup

In production, FretFlow utilizes managed PostgreSQL (Neon / Supabase):
- **Continuous WAL Archiving:** Every write-ahead log transaction is streamed to durable object storage.
- **Point-in-Time Recovery (PITR):** Enables restoring the database state to any specific second within the last 7 to 30 days.
- **Branch-Based Restoration:** Facilitates creating an instant copy of the database from a past timestamp for verification without disturbing the existing production branch.

---

## 3. Logical Backup Fallback (`pg_dump`)

As a supplementary disaster recovery safeguard against provider lock-in, automated daily logical dumps should be executed and archived to encrypted offsite object storage.

### Manual Logical Dump Export:
```bash
# Export schema + data in compressed custom format
pg_dump "$DIRECT_URL" \
  --format=custom \
  --no-owner \
  --no-privileges \
  --file="fretflow_backup_$(date +%Y%m%d_%H%M%S).dump"
```

### Manual Logical Restore:
```bash
# Restore into an isolated staging target database
pg_restore \
  --clean \
  --if-exists \
  --no-owner \
  --no-privileges \
  --dbname="$STAGING_DATABASE_URL" \
  "fretflow_backup_timestamp.dump"
```

---

## 4. Step-by-Step Restoration Procedure

When a catastrophic database incident (e.g. accidental drop, data corruption, ransomware) is declared:

1. **Declare Incident & Freeze Writes:**
   - Engage `SEV-1` protocol.
   - Set platform to Maintenance Mode via Owner Console or environment variable `MAINTENANCE_MODE="true"` to prevent inconsistent writes.

2. **Select Recovery Point:**
   - Identify the exact timestamp immediately preceding the corruption event (e.g. `2026-10-01T14:22:00Z`).

3. **Restore into Isolated Target:**
   - **Provider Console (Neon / Supabase):** Create a new branch/database restored to the target PITR timestamp.
   - **Do NOT restore directly into the existing production branch** before validating data integrity.

4. **Verify Schema & Migration State:**
   - Run Prisma verification against the restored target:
     ```bash
     DATABASE_URL="$RESTORED_TARGET_URL" npx prisma migrate status
     ```
   - Ensure all 7 migrations (`20260925*` to `20260929115000_phase_f_support_notifications`) are marked as applied.

5. **Execute Smoke Tests:**
   - Connect temporary staging runner to the restored database.
   - Verify critical learner data: users count, latest completed lesson progress, quiz attempts, and support ticket history.

6. **Traffic Cutover:**
   - In Vercel Project Settings, update `DATABASE_URL` and `DIRECT_URL` to point to the restored cluster.
   - Trigger instant zero-downtime redeployment or configuration redeploy.

7. **Verify & Disable Maintenance Mode:**
   - Verify `/api/internal/readiness` returns HTTP 200 `{ status: "ready" }`.
   - Disable Maintenance Mode.
   - Monitor real-time logs for query anomalies.

---

## 5. Live Restoration Drill Status
 
- **Operational Classification:** `POLICY / TARGET DEFINED`
- **Restore Capability:** `NOT LIVE-VERIFIED (PENDING CLOUD PROVISIONING)`
- **Assessment:** Local PostgreSQL / SQLite restoration drills and dump exports pass cleanly. Real-world continuous PITR restoration against managed cloud infrastructure (Neon/Supabase) is pending production environment provisioning. RPO/RTO metrics remain architectural targets.
