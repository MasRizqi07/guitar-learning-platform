# Production Media Management & Storage Operations Guide (Phase D)

## 1. Overview & Architecture

Phase D transforms media handling across the Guitar Learning Platform from raw, unauthenticated external URL strings into a secure, structured, reference-safe media subsystem.

### System Diagram

```text
┌─────────────────┐       1. Request Upload Target        ┌───────────────────────┐
│                 │──────────────────────────────────────>│  Next.js App Server   │
│                 │                                       │ (StorageService)      │
│  Staff Browser  │<──────────────────────────────────────│  - RBAC & MIME Check  │
│  (MediaPicker   │       2. Signed Upload Target (PUT)   │  - Creates UPLOADING  │
│   / Admin CMS)  │                                       └───────────────────────┘
│                 │                                                   │
│                 │       3. Direct Binary Upload                     │ Creates MediaAsset
│                 │──────────────────────────────────┐                ▼
│                 │                                  │    ┌───────────────────────┐
│                 │       4. Confirm Completion      │    │  PostgreSQL Database  │
│                 │─────────────────────────┐        │    │  (MediaAsset Model)   │
│                 │                         │        │    └───────────────────────┘
│                 │                         ▼        ▼                │
│                 │               ┌───────────────────────┐           │ Verified / ACTIVE
│                 │               │ Cloud Object Storage  │<──────────┘
│                 │               │ (R2 / S3 / Mock)      │
│                 │<──────────────│                       │
└─────────────────┘  5. Fast CDN  └───────────────────────┘
                     Public URL
```

### Key Architectural Tenets
1. **Zero Raw Binary Media in PostgreSQL**: Only structured metadata, references, dimensions, checksums, and storage keys are persisted in PostgreSQL.
2. **Zero Storage Secret Leakage**: AWS/R2 secrets and service role keys are never sent to client browsers. Browsers only receive short-lived, single-purpose signed upload URLs restricted by storage key and MIME type.
3. **Provider-Agnostic Storage Abstraction**: The core CMS code interacts exclusively with `StorageService` and the `StorageProvider` interface, decoupling the application from vendor-specific SDKs.
4. **Deterministic Local / CI Testing**: `MockStorageProvider` provides fast, in-memory object storage with simulated network failures for offline CI environments.
5. **Reference-Safe Deletion**: Assets actively attached to published Courses or LessonSections cannot be deleted (`409 MEDIA_IN_USE`).
6. **Dual Legacy Compatibility**: Legacy plain URLs (`thumbnailUrl`, `mediaUrl`) remain fully functional and rendered, while new uploads leverage relational `MediaAsset` links.

---

## 2. Supported Storage Providers

The application dynamically selects its storage provider based on the `STORAGE_PROVIDER` environment variable:

| Provider | `STORAGE_PROVIDER` Value | Use Case | Authentication |
| :--- | :--- | :--- | :--- |
| **Mock Storage** | `mock` (default) | Local development, Vitest, CI, Playwright | In-memory with simulated target endpoint |
| **Cloudflare R2** | `r2` | Production (zero egress fees, global edge) | S3-compatible SigV4 credentials |
| **AWS S3** | `s3` | Production standard AWS object storage | S3-compatible SigV4 credentials |
| **Supabase / MinIO**| `s3` | Self-hosted or alternative S3-compatible | S3-compatible SigV4 credentials |

---

## 3. Media Lifecycle & State Machine

Every media asset follows an explicit lifecycle enforced by the database and business logic:

```text
                  [Staff initiates upload]
                             │
                             ▼
                    ┌─────────────────┐
                    │    UPLOADING    │
                    └─────────────────┘
                             │
            ┌────────────────┴────────────────┐
            │ Object verified                 │ Verification failed
            ▼                                 ▼
   ┌─────────────────┐               ┌─────────────────┐
   │     ACTIVE      │               │     FAILED      │
   └─────────────────┘               └─────────────────┘
      │           │                           │
      │ Archive   │ Safe Delete (usage = 0)   │ Retry / Cleanup
      ▼           ▼                           ▼
┌───────────┐ ┌───────────┐          ┌─────────────────┐
│ ARCHIVED  │ │  DELETED  │          │   (Removed or   │
└───────────┘ └───────────┘          │    Investigated)│
                                     └─────────────────┘
```

- **`UPLOADING`**: Temporary record created during upload initiation. Incomplete uploads remain quarantined here and do not appear in the active media selector.
- **`ACTIVE`**: Storage object presence has been verified by the server. Available for attachment to courses and lessons.
- **`ARCHIVED`**: Preserved for historical/audit reasons but hidden from primary selectors.
- **`FAILED`**: Upload confirmation or cloud deletion failed. Preserved for operational inspection and retry.
- **`DELETED`**: Unused asset whose binary object has been successfully deleted from cloud storage. Marked with `deletedAt` for audit trail.

---

## 4. Allowed MIME Types & Capacity Limits

Uploads are strictly validated on both MIME headers and file sizes:

| Category | Permitted MIME Types | Max Size | Notes |
| :--- | :--- | :--- | :--- |
| **IMAGE** | `image/jpeg`, `image/png`, `image/webp` | 10 MB | Direct rendering in curriculum and course cards |
| **AUDIO** | `audio/mpeg`, `audio/wav`, `audio/ogg` | 25 MB | Guitar licks, backing tracks, metronome samples |
| **VIDEO** | `video/mp4`, `video/webm` | 100 MB | Instructional fretboard and strumming videos |
| **DOCUMENT** | `application/pdf` | 15 MB | Supplementary chord charts and exercise tabs |

> **Security Policy on SVG**: SVG files (`image/svg+xml`) are **rejected** by policy due to active XML scripting/XSS attack vectors.

---

## 5. Object Key & URL Strategy

Object keys are generated deterministically and immutably by the server:

```text
media/{yyyy}/{mm}/{uuid}.{ext}
```

- **Path Traversal Prevention**: Client-supplied filenames are never used as storage keys.
- **Cache-Control Immutability**: Because each asset has a unique UUID-based key, replacements create new keys rather than overwriting existing objects. This allows aggressive HTTP caching (`Cache-Control: public, max-age=31536000, immutable`).

---

## 6. Safe Deletion & Reference Protection

When an administrator attempts to delete a media asset via `DELETE /api/admin/media/[id]`:

1. **Dependency Inspection**: `StorageService.deleteAsset` queries all relational dependents:
   - `Course.thumbnailAssetId`
   - `LessonSection.mediaAssetId`
2. **Conflict Guard**: If `usageCount > 0`, deletion is **aborted immediately**:
   - HTTP Status: `409 Conflict`
   - Error Code: `MEDIA_IN_USE`
   - Payload: Returns the exact list of attached courses and lessons.
3. **Storage Object Removal**: If `usageCount === 0`, the server issues a deletion command to the storage provider.
4. **Compensation on Failure**: If the cloud provider fails to delete the object, the database asset is marked `status: FAILED` and `502 Bad Gateway` (`MEDIA_DELETE_FAILED`) is returned. No false success is ever reported.
5. **Database Audit**: Upon successful cloud deletion, the asset record is marked `status: DELETED` with `deletedAt: new Date()` and an `AdminAuditLog` entry is committed.

---

## 7. Historical Lesson Revision Rollback Safety

When a lesson is published, a snapshot is captured in `LessonRevision`.
- The snapshot preserves each section's `mediaAssetId` along with resolved metadata.
- When an editor replaces media in a lesson and republishes, the prior revision remains intact.
- If staff rollback to Revision 1 via `AdminContentService.restoreLessonRevision`, the older section's `mediaAssetId` is faithfully restored.

---

## 8. Operational Runbooks

### Runbook 1: Storage Provider Outage / Unavailability
**Symptoms**: Upload initialization returns `500 MEDIA_STORAGE_UNAVAILABLE` or `502 MEDIA_UPLOAD_FAILED`.
**Resolution**:
1. Check cloud provider status (Cloudflare R2 or AWS S3 health dashboard).
2. Validate storage credentials:
   ```bash
   node -e "console.log(process.env.STORAGE_PROVIDER, !!process.env.STORAGE_ACCESS_KEY_ID)"
   ```
3. If cloud is temporarily unreachable, legacy manual URLs remain usable as a fallback in CMS forms.

### Runbook 2: Stuck `UPLOADING` Assets
**Symptoms**: Assets remain in `UPLOADING` status because client closed tab during transfer.
**Resolution**:
Stale `UPLOADING` records older than 24 hours can be cleaned up using the admin query:
```sql
SELECT id, "storageKey", "createdAt" FROM "MediaAsset"
WHERE status = 'UPLOADING' AND "createdAt" < NOW() - INTERVAL '24 hours';
```
These can be safely updated to `FAILED` or purged.

### Runbook 3: Zero-Downtime Credential Rotation
To rotate storage credentials without platform downtime:
1. Generate a new Access Key ID and Secret Access Key in the storage provider console (keep old key active).
2. Update environment variables in the hosting platform:
   ```env
   STORAGE_ACCESS_KEY_ID="new_key_id"
   STORAGE_SECRET_ACCESS_KEY="new_secret"
   ```
3. Deploy / restart application processes.
4. Verify by uploading a test asset in `/admin/media`.
5. Deactivate and revoke the old credentials in the storage console.
