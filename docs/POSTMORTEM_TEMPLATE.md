# Incident Postmortem: [Incident Title]

**Date:** YYYY-MM-DD  
**Severity:** [SEV-1 / SEV-2 / SEV-3]  
**Incident Commander:** [Name]  
**Participants:** [Names]  
**Status:** [Resolved / Actions Pending]  

---

## 1. Executive Summary
Brief non-technical summary of what happened, customer impact duration, and how it was resolved.

---

## 2. Customer & Operational Impact
- **Service Outage Duration:** XX minutes
- **Impacted Workflows:** (e.g. Lesson completion, Login, Support tickets)
- **Learners Affected:** Estimated count or percentage
- **Data Loss:** (e.g. None / Recovered from PITR)

---

## 3. Timeline (UTC)
- **HH:MM** - Anomaly detected via [Alert / Synthetic probe / Support ticket].
- **HH:MM** - Incident Commander assigned and triage initiated.
- **HH:MM** - Maintenance mode activated / Rollback invoked.
- **HH:MM** - Root cause isolated to [component].
- **HH:MM** - Fix deployed / Database restored.
- **HH:MM** - Readiness probe verified; service restored to normal operations.

---

## 4. Root Cause Analysis (5 Whys)
1. **Why did the failure occur?**
2. **Why was that condition present?**
3. **Why did earlier checks fail to catch it?**
4. **Why was the mitigation not faster?**
5. **Root Cause:** Detailed technical explanation.

---

## 5. Corrective & Preventive Action Items

| Action Item | Type | Owner | Target Date | Status |
| :--- | :--- | :--- | :--- | :--- |
| Add CI migration validation check | Prevention | Engineering | YYYY-MM-DD | Open |
| Add synthetic probe for endpoint | Detection | SRE / Ops | YYYY-MM-DD | Open |
| Update runbook with rollback step | Mitigation | Engineering | YYYY-MM-DD | Open |

---

## 6. Lessons Learned & What Went Well
- **What went well:** (e.g. Zero data loss, rapid rollback capability)
- **Where we got lucky:** (e.g. Off-peak hour occurrence)
- **Where we must improve:** (e.g. Automated alerting before user report)
