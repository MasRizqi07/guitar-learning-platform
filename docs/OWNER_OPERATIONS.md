# Platform Owner Operations & Governance Runbook (Phase E / F)

## 1. Owner Console Boundary (`/owner`)

The Owner Console provides executive platform governance, product analytics, dynamic feature flags, and emergency maintenance controls:

- **Strict Access Guard**: Only authenticated actors with `role === 'OWNER'` can access `/owner` or `/api/owner/*`. Any other role (including `ADMIN`) is denied with `403 OWNER_ACCESS_REQUIRED`.
- **Navigation & Surfaces**:
  - `/owner` — Executive Overview & Product KPI dashboard.
  - `/owner/analytics` — Cohort retention matrices, practice funnel, and engagement ledgers.
  - `/owner/features` — Dynamic zero-downtime feature flag controls.
  - `/owner/settings` — System settings, maintenance mode switch, and platform support email configuration.

---

## 2. Platform Maintenance Mode & Support Availability

The platform maintenance mode can be toggled by the `OWNER` from `/owner/settings` or via API:

```bash
PATCH /api/owner/settings
{
  "key": "MAINTENANCE_MODE",
  "value": "true"
}
```

### Operational Invariants During Maintenance
1. **Public/Learner Routes**: Requests to core curriculum, lessons, and practice write APIs are paused with HTTP 503, rendering the truthfully labeled `/maintenance` surface.
2. **Help & Support Continuity**: `/help` and support ticket reading remain accessible so learners can report urgent account or billing concerns.
3. **Owner Recovery**: Authentication and `/owner/*` routes remain fully operational so platform custodians can diagnose issues and restore service without being locked out.

---

## 3. Platform Configuration & Support Email

Platform contact coordinates are managed via `PlatformSetting`:
- `SUPPORT_EMAIL`: Authoritative address displayed on help portals and used as the reply-to header for transactional support notifications.
- Managed centrally without requiring application re-deployment or container restarts.
