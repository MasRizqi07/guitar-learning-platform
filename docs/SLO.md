# Operational Service Level Objectives (SLOs) & Reliability Targets

This document defines the production Service Level Indicators (SLIs), Service Level Objectives (SLOs), and error budgets for **FretFlow Guitar Learning Platform v2**.

---

## 1. Reliability Objectives & SLIs

| Service Domain | Service Level Indicator (SLI) | Target SLO | Measurement Source |
| :--- | :--- | :--- | :--- |
| **Platform Availability** | Successful HTTP responses (non-5xx) / Total Requests | **99.5% Monthly** | Edge CDN / Vercel Analytics |
| **API Error Rate** | Server errors (HTTP 500) / Total API Requests | **< 0.1%** | Structured Logs & Sentry |
| **Core API Latency** | Request duration for authenticated endpoints (`/api/lessons/*`, `/api/practice/*`, `/api/quizzes/*`) | **p95 < 250ms** | Telemetry / Logger `durationMs` |
| **Analytics Query Latency** | Aggregation endpoints (`/api/owner/analytics/*`) | **p95 < 500ms** | Server-side execution timers |
| **Authentication Flow Success** | Successful user login / Total valid credential submissions | **> 99.9%** | Security Event Logs |
| **Curriculum Progression** | Lesson completions & XP awarded successfully | **> 99.9%** | Database Transactions |
| **Support Desk Availability** | Support ticket submission & staff reply delivery | **> 99.5%** | Support Ticket Domain Metrics |

---

## 2. Monthly Error Budget

Based on our **99.5% monthly availability** objective:
- **Total Hours per Month (30 days):** 720 hours
- **Error Budget (0.5%):** **3.6 hours / month** of degraded availability
- **Budget Burn Rate Actions:**
  - If **> 50%** of monthly error budget is consumed within 7 days: Freeze non-critical feature deployments; allocate sprint to reliability and query optimization.
  - If **> 100%** of budget is consumed: Declare `SEV-2` review, require architectural sign-off for next release.

---

## 3. Synthetic Monitoring Strategy

1. **Shallow Liveness Ping:**
   - External monitoring probe (e.g. Better Uptime / Pingdom) queries `GET /api/health` every 60 seconds from multiple geographic regions.
   - Alert triggers if 2 consecutive probes fail or latency exceeds 1,500ms.

2. **Authenticated Journey Verification:**
   - Dedicated synthetic test account triggers a non-destructive lesson fetch and practice stats check every 15 minutes.
   - Flagged with `analyticsExcluded = true` so synthetic checks never contaminate real learner metrics.
