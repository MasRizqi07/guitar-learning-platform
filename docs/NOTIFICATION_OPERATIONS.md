# Notification Operations & Delivery Runbook (Phase F)

## 1. Architecture Overview

Notifications in FretFlow are designed around two core principles:
1. **Durable In-App Persistence**: Notifications are primary product state stored directly in PostgreSQL (`Notification`).
2. **Database-First, Non-Authoritative External Delivery**: Failure of third-party transactional email providers never rolls back primary product state (tickets, messages, lesson progress, or user achievements).

---

## 2. Notification Models

### Model: `Notification`
- `id`: Internal UUID primary key.
- `userId`: Foreign key to `User` (strictly enforced IDOR boundary).
- `type`: Enum (`SUPPORT`, `SECURITY`, `ACHIEVEMENT`, `SYSTEM`, `LEARNING`).
- `title`: Short summary (e.g. `Support Ticket Created: SUP-2026-000001`).
- `message`: Detailed plain-text alert body.
- `actionUrl`: Relative in-app deep link (e.g. `/support/[ticketId]`).
- `dedupeKey`: Optional idempotent deduplication string.
- `readAt`: Nullable timestamp indicating when the user viewed/marked the notification.
- `createdAt`: Immutable audit creation timestamp.

**Compound Constraint**: `@@unique([userId, dedupeKey])` prevents notification storms when retrying background jobs or Webhook handlers.

### Model: `NotificationDelivery` (Outbox / Telemetry)
- `id`: Internal UUID primary key.
- `notificationId`: Optional reference to the parent `Notification`.
- `channel`: Enum (`EMAIL`, `IN_APP`).
- `recipient`: Destination email address.
- `status`: Delivery status (`PENDING`, `PROCESSING`, `SENT`, `FAILED`, `CANCELLED`).
- `attemptCount`: Integer tracking retry attempts (capped at 3).
- `lastAttemptAt`: Timestamp of the most recent dispatch attempt.
- `sentAt`: Timestamp when provider confirmed delivery.
- `errorReason`: Sanitized failure description.

---

## 3. IDOR & Access Protection

- **User Boundaries**: Every read and mark-as-read mutation verifies `notification.userId === authenticatedUser.id`.
- **Zero-Trust**: Client-supplied user IDs in query parameters or request bodies are completely ignored; the session user context is exclusively authoritative.

---

## 4. Transactional Email Outbox & Delivery

### Email Provider Configuration Notice
```text
PRODUCTION TRANSACTIONAL EMAIL PROVIDER:
EXTERNAL CONFIGURATION REQUIRED
```
In development and integration environments, FretFlow utilizes the configured `ConsoleEmailProvider` to prevent unintended outbound spam. When configuring production:
- Provide `RESEND_API_KEY`, `SENDGRID_API_KEY`, or custom SMTP credentials in `.env.production`.
- The application code is 100% production-ready and abstracts providers through `EmailService`.

### Failure Invariance
```
Persist Support Ticket / Reply
          │
          ▼
Persist Notification (In-App)
          │
          ▼
Attempt Transactional Email ────[ Failure / Timeout ]────► Record Delivery Failure
          │                                                   (Non-Authoritative)
          ▼
Record Delivery Success
```

Email failures log non-fatal warnings and persist a failed attempt in `NotificationDelivery`. Under no circumstances will an email failure rollback ticket creation, message replies, or user notifications.

---

## 5. UI Integration & Notification Center

- **Page**: `/notifications`
  - Real-time unread count.
  - Tabbed filtering between All Activity and Unread Only.
  - Single-click "Mark Read" per item.
  - Bulk "Mark All as Read" via `POST /api/notifications/read-all`.
  - Deep-link action button to view related resources.
- **Navigation Badge**:
  - Live pulse counter rendered in desktop sidebar navigation and mobile bottom navigation.
