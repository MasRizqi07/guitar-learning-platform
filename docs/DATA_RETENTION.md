# Data Retention & Privacy Schedule

This document defines the authoritative data retention policies and automated cleanup intervals across all database models for **FretFlow Guitar Learning Platform v2**.

---

## 1. Concrete Retention Schedule

| Data Category / Entity | Model Name | Retention Window | Lifecycle Action | Rationale |
| :--- | :--- | :--- | :--- | :--- |
| **Email Verification Tokens** | `EmailVerificationToken` | **24 Hours** | Expired / Deleted | Single-use registration security. |
| **Password Reset Tokens** | `PasswordResetToken` | **1 Hour** | Expired / Deleted | Strict security window for account recovery. |
| **Active Browser Sessions** | `Session` | **30 Days of Inactivity** | Expired / Revoked | Rolling session refresh on activity; inactive revoked. |
| **Security Events** | `SecurityEvent` | **365 Days** | Retained | Crucial for security audits, forensic analysis, and fraud detection. |
| **Admin Audit Logs** | `AdminAuditLog` | **730 Days (2 Years)** | Retained | Immutable operational accountability for staff actions. |
| **Support Tickets & Messages** | `SupportTicket`, `SupportMessage` | **Lifetime of Account** | Retained | Essential for customer service context; exportable by user. |
| **Staff Internal Notes** | `SupportInternalNote` | **Lifetime of Ticket** | Retained (Staff Only) | Operational notes; strictly excluded from user data exports. |
| **Pending Deletion Accounts** | `User (DELETION_PENDING)` | **30-Day Grace Period** | Anonymized / Purged | Allows user recovery window before irreversible database purge. |
| **Audio Microphone Data** | N/A (Web Audio API) | **0 Seconds (Ephemeral)** | Discarded Instantly | Processed in-memory within client browser. Never persisted or sent to servers. |
| **Temporary Upload Revisions** | `MediaAsset (ARCHIVED)` | **90 Days** | Soft-deleted / Archived | Prevents immediate accidental data loss before permanent purge. |

---

## 2. GDPR & CCPA Compliance Operations

- **Right to Portability (Data Export):**
  - Learners can trigger a self-service export of their entire learning, practice, and ticket records from `/settings/data`.
  - The export endpoint (`/api/profile/export`) strictly filters out password hashes and internal staff notes.
- **Right to Erasure (Account Deletion):**
  - Learners can request account closure from `/settings/data` via `POST /api/profile/delete-request`.
  - The account status shifts to `DELETION_PENDING`, active sessions are revoked instantly, and personal records enter the 30-day grace period before purge.
