import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '@/lib/db';
import { StorageService } from '@/services/storage/storage.service';
import { MockStorageProvider } from '@/services/storage/providers/mock-storage.provider';
import { AdminContentService } from '@/services/admin-content.service';
import { AuthService } from '@/services/auth.service';
import { SessionUser } from '@/lib/auth';
import { UserRole, MediaType, MediaStatus } from '@prisma/client';
import { AppError } from '@/lib/errors';

describe('Phase D — Production Media Management & Storage Integration Tests', () => {
  const timestamp = Date.now();
  let nextCourseOrder = 8000 + Math.floor(Math.random() * 50000);
  const getNextOrder = () => ++nextCourseOrder;

  const createdUserIds: string[] = [];
  const cleanupMediaAssetIds: string[] = [];
  const cleanupCourseIds: string[] = [];

  let learnerActor: SessionUser;
  let supportActor: SessionUser;
  let editorActor: SessionUser;
  let adminActor: SessionUser;
  let ownerActor: SessionUser;

  let learnerUserId: string;
  let supportUserId: string;
  let editorUserId: string;
  let adminUserId: string;
  let ownerUserId: string;

  let mockStorage: MockStorageProvider;

  beforeAll(async () => {
    // 1. Create test users
    const uLearner = await AuthService.register({
      name: 'Media Learner',
      email: `media_learner_${timestamp}@test.com`,
      password: 'SecurePassword123!',
    });
    learnerUserId = uLearner.id;
    createdUserIds.push(learnerUserId);
    learnerActor = { id: learnerUserId, email: uLearner.email, name: uLearner.name, role: UserRole.LEARNER };

    const uSupport = await AuthService.register({
      name: 'Media Support',
      email: `media_support_${timestamp}@test.com`,
      password: 'SecurePassword123!',
    });
    supportUserId = uSupport.id;
    createdUserIds.push(supportUserId);
    await prisma.user.update({ where: { id: supportUserId }, data: { role: UserRole.SUPPORT } });
    supportActor = { id: supportUserId, email: uSupport.email, name: uSupport.name, role: UserRole.SUPPORT };

    const uEditor = await AuthService.register({
      name: 'Media Editor',
      email: `media_editor_${timestamp}@test.com`,
      password: 'SecurePassword123!',
    });
    editorUserId = uEditor.id;
    createdUserIds.push(editorUserId);
    await prisma.user.update({ where: { id: editorUserId }, data: { role: UserRole.CONTENT_EDITOR } });
    editorActor = { id: editorUserId, email: uEditor.email, name: uEditor.name, role: UserRole.CONTENT_EDITOR };

    const uAdmin = await AuthService.register({
      name: 'Media Admin',
      email: `media_admin_${timestamp}@test.com`,
      password: 'SecurePassword123!',
    });
    adminUserId = uAdmin.id;
    createdUserIds.push(adminUserId);
    await prisma.user.update({ where: { id: adminUserId }, data: { role: UserRole.ADMIN } });
    adminActor = { id: adminUserId, email: uAdmin.email, name: uAdmin.name, role: UserRole.ADMIN };

    const uOwner = await AuthService.register({
      name: 'Media Owner',
      email: `media_owner_${timestamp}@test.com`,
      password: 'SecurePassword123!',
    });
    ownerUserId = uOwner.id;
    createdUserIds.push(ownerUserId);
    await prisma.user.update({ where: { id: ownerUserId }, data: { role: UserRole.OWNER } });
    ownerActor = { id: ownerUserId, email: uOwner.email, name: uOwner.name, role: UserRole.OWNER };

    // Get reference to the mock storage provider
    mockStorage = StorageService.getProvider() as MockStorageProvider;
  });

  afterAll(async () => {
    // Clean up courses, lessons, sections, revisions
    for (const cId of cleanupCourseIds) {
      const lessons = await prisma.lesson.findMany({ where: { module: { courseId: cId } }, select: { id: true } });
      const lessonIds = lessons.map((l) => l.id);
      if (lessonIds.length > 0) {
        await prisma.lessonRevision.deleteMany({ where: { lessonId: { in: lessonIds } } });
        await prisma.lessonSection.deleteMany({ where: { lessonId: { in: lessonIds } } });
      }
      await prisma.course.deleteMany({ where: { id: cId } });
    }

    // Clean up media assets
    for (const mId of cleanupMediaAssetIds) {
      await prisma.course.updateMany({ where: { thumbnailAssetId: mId }, data: { thumbnailAssetId: null } });
      await prisma.lessonSection.updateMany({ where: { mediaAssetId: mId }, data: { mediaAssetId: null } });
      await prisma.mediaAsset.deleteMany({ where: { id: mId } });
    }

    // Clean up audit logs & users
    for (const uId of createdUserIds) {
      await prisma.adminAuditLog.deleteMany({ where: { actorUserId: uId } });
      await prisma.user.deleteMany({ where: { id: uId } });
    }
  });

  // =========================================================================
  // 1. RBAC & PERMISSION ISOLATION
  // =========================================================================
  describe('1. RBAC & Media Permission Enforcement', () => {
    it('denies LEARNER from initiating an upload', async () => {
      await expect(
        StorageService.initiateUpload(learnerActor, {
          filename: 'guitar-test.png',
          mimeType: 'image/png',
          sizeBytes: 1024 * 50,
        })
      ).rejects.toThrow(AppError);
    });

    it('denies SUPPORT from initiating an upload', async () => {
      await expect(
        StorageService.initiateUpload(supportActor, {
          filename: 'guitar-test.png',
          mimeType: 'image/png',
          sizeBytes: 1024 * 50,
        })
      ).rejects.toThrow(AppError);
    });

    it('allows CONTENT_EDITOR to initiate a valid image upload', async () => {
      const result = await StorageService.initiateUpload(editorActor, {
        filename: 'fretboard-hero.png',
        mimeType: 'image/png',
        sizeBytes: 1024 * 200,
        altText: 'Fretboard diagram hero image',
      });

      expect(result).toBeDefined();
      expect(result.asset.id).toBeDefined();
      expect(result.asset.status).toBe(MediaStatus.UPLOADING);
      expect(result.asset.type).toBe(MediaType.IMAGE);
      expect(result.asset.originalName).toBe('fretboard-hero.png');
      expect(result.uploadTarget.uploadUrl).toBeDefined();

      cleanupMediaAssetIds.push(result.asset.id);
    });

    it('allows ADMIN and OWNER to initiate uploads', async () => {
      const adminUpload = await StorageService.initiateUpload(adminActor, {
        filename: 'strumming-lesson.mp4',
        mimeType: 'video/mp4',
        sizeBytes: 1024 * 1024 * 10,
      });
      expect(adminUpload.asset.type).toBe(MediaType.VIDEO);
      cleanupMediaAssetIds.push(adminUpload.asset.id);

      const ownerUpload = await StorageService.initiateUpload(ownerActor, {
        filename: 'metronome-beat.wav',
        mimeType: 'audio/wav',
        sizeBytes: 1024 * 500,
      });
      expect(ownerUpload.asset.type).toBe(MediaType.AUDIO);
      cleanupMediaAssetIds.push(ownerUpload.asset.id);
    });
  });

  // =========================================================================
  // 2. MIME & FILE SIZE VALIDATION
  // =========================================================================
  describe('2. Media Validation (MIME & Size Limits)', () => {
    it('rejects disallowed executable or script MIME types', async () => {
      await expect(
        StorageService.initiateUpload(editorActor, {
          filename: 'malicious.exe',
          mimeType: 'application/x-msdownload',
          sizeBytes: 1024,
        })
      ).rejects.toThrow(/not permitted/i);

      await expect(
        StorageService.initiateUpload(editorActor, {
          filename: 'exploit.html',
          mimeType: 'text/html',
          sizeBytes: 1024,
        })
      ).rejects.toThrow(/not permitted/i);
    });

    it('rejects un-sanitized SVG files by security policy', async () => {
      await expect(
        StorageService.initiateUpload(editorActor, {
          filename: 'active-xss.svg',
          mimeType: 'image/svg+xml',
          sizeBytes: 1024,
        })
      ).rejects.toThrow(/not permitted/i);
    });

    it('rejects image files exceeding 10MB limit', async () => {
      await expect(
        StorageService.initiateUpload(editorActor, {
          filename: 'massive-poster.jpg',
          mimeType: 'image/jpeg',
          sizeBytes: 15 * 1024 * 1024, // 15MB > 10MB limit
        })
      ).rejects.toThrow(/File size exceeds limit/i);
    });

    it('rejects video files exceeding 250MB limit', async () => {
      await expect(
        StorageService.initiateUpload(editorActor, {
          filename: 'huge-performance.mp4',
          mimeType: 'video/mp4',
          sizeBytes: 300 * 1024 * 1024, // 300MB > 250MB limit
        })
      ).rejects.toThrow(/File size exceeds limit/i);
    });
  });

  // =========================================================================
  // 3. UPLOAD LIFECYCLE (INIT -> TARGET -> COMPLETE)
  // =========================================================================
  describe('3. Upload Lifecycle (Init -> Complete)', () => {
    it('fails completion if object was never uploaded to storage provider', async () => {
      const init = await StorageService.initiateUpload(editorActor, {
        filename: 'missing-bytes.png',
        mimeType: 'image/png',
        sizeBytes: 1024 * 10,
      });
      cleanupMediaAssetIds.push(init.asset.id);

      await expect(
        StorageService.completeUpload(editorActor, {
          assetId: init.asset.id,
        })
      ).rejects.toThrow(/object does not exist/i);

      const assetAfter = await prisma.mediaAsset.findUnique({ where: { id: init.asset.id } });
      expect(assetAfter?.status).toBe(MediaStatus.FAILED);
    });

    it('successfully activates asset once object exists in storage', async () => {
      const init = await StorageService.initiateUpload(editorActor, {
        filename: 'verified-guitar.png',
        mimeType: 'image/png',
        sizeBytes: 1024 * 12,
        altText: 'Verified electric guitar image',
      });
      cleanupMediaAssetIds.push(init.asset.id);

      // Simulate client PUT upload to mock storage
      const dummyPng = Buffer.from('FAKE-PNG-IMAGE-BINARY-DATA');
      mockStorage.storeObject(init.asset.storageKey, dummyPng, 'image/png');

      const completed = await StorageService.completeUpload(editorActor, {
        assetId: init.asset.id,
        width: 800,
        height: 600,
      });

      expect(completed.status).toBe(MediaStatus.ACTIVE);
      expect(completed.width).toBe(800);
      expect(completed.height).toBe(600);
      expect(completed.publicUrl).toBeDefined();

      // Check audit log
      const audit = await prisma.adminAuditLog.findFirst({
        where: {
          action: 'MEDIA_UPLOAD_COMPLETED',
          entityId: init.asset.id,
        },
      });
      expect(audit).toBeDefined();
    });

    it('supports server direct buffer upload for smaller assets', async () => {
      const buffer = Buffer.from('SMALL-AUDIO-SAMPLE-DATA');
      const asset = await StorageService.uploadServerBuffer(editorActor, {
        filename: 'intro-lick.mp3',
        mimeType: 'audio/mpeg',
        buffer,
        altText: 'Introduction lick audio',
      });

      cleanupMediaAssetIds.push(asset.id);
      expect(asset.status).toBe(MediaStatus.ACTIVE);
      expect(asset.type).toBe(MediaType.AUDIO);
      expect(asset.publicUrl).toContain(asset.storageKey);

      // Verify object exists in storage
      const exists = await mockStorage.objectExists(asset.storageKey);
      expect(exists).toBe(true);
    });
  });

  // =========================================================================
  // 4. MEDIA LIBRARY SEARCH, FILTER & PAGINATION
  // =========================================================================
  describe('4. Media Library Browsing & Filtering', () => {
    let searchableAssetId: string;

    beforeAll(async () => {
      const buf = Buffer.from('SEARCHABLE-MEDIA-TEST');
      const created = await StorageService.uploadServerBuffer(editorActor, {
        filename: 'unique-fingerstyle-guide.png',
        mimeType: 'image/png',
        buffer: buf,
        altText: 'Comprehensive fingerstyle acoustic tutorial illustration',
        caption: 'Lesson 3 finger placement',
      });
      searchableAssetId = created.id;
      cleanupMediaAssetIds.push(searchableAssetId);
    });

    it('searches assets by filename keyword', async () => {
      const result = await StorageService.listAssets(editorActor, {
        search: 'fingerstyle',
      });
      expect(result.data.some((a) => a.id === searchableAssetId)).toBe(true);
    });

    it('searches assets by altText keyword', async () => {
      const result = await StorageService.listAssets(editorActor, {
        search: 'Comprehensive fingerstyle',
      });
      expect(result.data.some((a) => a.id === searchableAssetId)).toBe(true);
    });

    it('filters assets by MediaType', async () => {
      const imagesOnly = await StorageService.listAssets(editorActor, {
        type: MediaType.IMAGE,
      });
      expect(imagesOnly.data.every((a) => a.type === MediaType.IMAGE)).toBe(true);
    });

    it('paginates results accurately', async () => {
      const page1 = await StorageService.listAssets(editorActor, {
        page: 1,
        pageSize: 2,
      });
      expect(page1.pagination.page).toBe(1);
      expect(page1.pagination.pageSize).toBe(2);
      expect(page1.data.length).toBeLessThanOrEqual(2);
    });
  });

  // =========================================================================
  // 5. CMS ATTACHMENT & LEGACY COMPATIBILITY
  // =========================================================================
  describe('5. CMS Content Attachment & Legacy Dual Compatibility', () => {
    let testCourseId: string;
    let thumbnailAssetId: string;
    let sectionAssetId: string;

    beforeAll(async () => {
      // Create thumbnail asset
      const thumb = await StorageService.uploadServerBuffer(editorActor, {
        filename: 'course-thumb.jpg',
        mimeType: 'image/jpeg',
        buffer: Buffer.from('THUMBNAIL-BYTES'),
        altText: 'Course thumbnail',
      });
      thumbnailAssetId = thumb.id;
      cleanupMediaAssetIds.push(thumb.id);

      // Create section media asset
      const secMedia = await StorageService.uploadServerBuffer(editorActor, {
        filename: 'section-video.mp4',
        mimeType: 'video/mp4',
        buffer: Buffer.from('VIDEO-BYTES'),
      });
      sectionAssetId = secMedia.id;
      cleanupMediaAssetIds.push(secMedia.id);
    });

    it('attaches MediaAsset to Course as thumbnailAssetId', async () => {
      const course = await AdminContentService.createCourse(editorActor, {
        title: `Media Integration Course ${timestamp}`,
        slug: `media-course-${timestamp}`,
        description: 'Testing MediaAsset integration with Course model',
        difficulty: 'BEGINNER',
        thumbnailAssetId,
        order: getNextOrder(),
      });
      testCourseId = course.id;
      cleanupCourseIds.push(testCourseId);

      expect(course.thumbnailAssetId).toBe(thumbnailAssetId);
      // Legacy thumbnailUrl is automatically populated with the asset publicUrl
      expect(course.thumbnailUrl).toBeDefined();

      const detail = await AdminContentService.getCourseById(editorActor, course.id);
      expect(detail.thumbnailAsset?.id).toBe(thumbnailAssetId);
    });

    it('attaches MediaAsset to LessonSection as mediaAssetId', async () => {
      // Create module and lesson first
      const testModule = await AdminContentService.createModule(editorActor, {
        courseId: testCourseId,
        title: 'Module with Media',
        slug: `media-mod-${timestamp}`,
        description: 'Module testing media attachment',
        estimatedMinutes: 30,
        order: 1,
      });

      const lesson = await AdminContentService.createLesson(editorActor, {
        moduleId: testModule.id,
        title: 'Lesson with Section Media',
        slug: `media-lesson-${timestamp}`,
        description: 'Lesson testing media attachment',
        difficulty: 'BEGINNER',
        estimatedMinutes: 15,
        xpReward: 50,
        order: 1,
      });

      const section = await AdminContentService.addLessonSection(editorActor, {
        lessonId: lesson.id,
        type: 'VIDEO',
        title: 'Video Strumming Demonstration',
        content: 'Watch how the plectrum contacts the strings.',
        mediaAssetId: sectionAssetId,
        required: true,
      });

      expect(section.mediaAssetId).toBe(sectionAssetId);
      // Legacy mediaUrl is populated
      expect(section.mediaUrl).toBeDefined();

      const lessonDetail = await AdminContentService.getLessonById(editorActor, lesson.id);
      const fetchedSection = lessonDetail.sections.find((s) => s.id === section.id);
      expect(fetchedSection?.mediaAsset?.id).toBe(sectionAssetId);
    });

    it('preserves legacy thumbnailUrl when no MediaAsset relation is present', async () => {
      const legacyCourse = await AdminContentService.createCourse(editorActor, {
        title: `Legacy URL Course ${timestamp}`,
        slug: `legacy-course-${timestamp}`,
        description: 'Using plain legacy URL',
        difficulty: 'BEGINNER',
        thumbnailUrl: 'https://images.unsplash.com/photo-legacy-test',
        order: getNextOrder(),
      });
      cleanupCourseIds.push(legacyCourse.id);

      expect(legacyCourse.thumbnailAssetId).toBeNull();
      expect(legacyCourse.thumbnailUrl).toBe('https://images.unsplash.com/photo-legacy-test');
    });
  });

  // =========================================================================
  // 6. REFERENCE SAFETY & SAFE DELETION (MEDIA_IN_USE)
  // =========================================================================
  describe('6. Reference-Safe Deletion Guard (409 MEDIA_IN_USE)', () => {
    let attachedAssetId: string;
    let assignedCourseId: string;

    beforeAll(async () => {
      const asset = await StorageService.uploadServerBuffer(editorActor, {
        filename: 'guarded-asset.png',
        mimeType: 'image/png',
        buffer: Buffer.from('GUARDED-BYTES'),
      });
      attachedAssetId = asset.id;
      cleanupMediaAssetIds.push(attachedAssetId);

      const course = await AdminContentService.createCourse(editorActor, {
        title: `Safe Deletion Test Course ${timestamp}`,
        slug: `safe-del-course-${timestamp}`,
        description: 'Testing reference protection',
        difficulty: 'INTERMEDIATE',
        thumbnailAssetId: attachedAssetId,
        order: getNextOrder(),
      });
      assignedCourseId = course.id;
      cleanupCourseIds.push(assignedCourseId);
    });

    it('rejects hard deletion of asset attached to a course with 409 MEDIA_IN_USE', async () => {
      try {
        await StorageService.deleteAsset(adminActor, attachedAssetId);
        expect.fail('Should have thrown MEDIA_IN_USE error');
      } catch (err: unknown) {
        expect(err).toBeInstanceOf(AppError);
        const appErr = err as AppError;
        expect(appErr.statusCode).toBe(409);
        expect(appErr.code).toBe('MEDIA_IN_USE');
        expect(appErr.details).toBeDefined();
        // Details contain reference list
        const details = appErr.details as { usageCount: number; courses: Array<{ id: string }> };
        expect(details.usageCount).toBeGreaterThanOrEqual(1);
        expect(details.courses.some((c) => c.id === assignedCourseId)).toBe(true);
      }
    });

    it('denies CONTENT_EDITOR from hard deleting even an unused asset', async () => {
      const unusedAsset = await StorageService.uploadServerBuffer(editorActor, {
        filename: 'unused-temp.png',
        mimeType: 'image/png',
        buffer: Buffer.from('UNUSED-BYTES'),
      });
      cleanupMediaAssetIds.push(unusedAsset.id);

      await expect(
        StorageService.deleteAsset(editorActor, unusedAsset.id)
      ).rejects.toThrow(/media.delete/i);
    });

    it('denies CONTENT_EDITOR from archiving and allows ADMIN to archive', async () => {
      const unusedAsset = await StorageService.uploadServerBuffer(editorActor, {
        filename: 'to-archive.png',
        mimeType: 'image/png',
        buffer: Buffer.from('ARCHIVE-BYTES'),
      });
      cleanupMediaAssetIds.push(unusedAsset.id);

      await expect(
        StorageService.archiveAsset(editorActor, unusedAsset.id)
      ).rejects.toThrow(/media.archive/i);

      const archived = await StorageService.archiveAsset(adminActor, unusedAsset.id);
      expect(archived.status).toBe(MediaStatus.ARCHIVED);
    });

    it('allows ADMIN to hard delete an unused asset after detach', async () => {
      // Detach asset from course first
      await AdminContentService.updateCourse(editorActor, assignedCourseId, {
        thumbnailAssetId: null,
      });

      // Now safe deletion should succeed
      const result = await StorageService.deleteAsset(adminActor, attachedAssetId);
      expect(result.success).toBe(true);

      const deletedAsset = await prisma.mediaAsset.findUnique({ where: { id: attachedAssetId } });
      expect(deletedAsset?.status).toBe(MediaStatus.DELETED);
    });
  });

  // =========================================================================
  // 7. STORAGE RECOVERY ON PROVIDER FAILURE
  // =========================================================================
  describe('7. Storage Recovery & Resiliency', () => {
    it('handles storage provider deletion failure gracefully without fake success', async () => {
      const asset = await StorageService.uploadServerBuffer(editorActor, {
        filename: 'failure-sim.png',
        mimeType: 'image/png',
        buffer: Buffer.from('FAIL-BYTES'),
      });
      cleanupMediaAssetIds.push(asset.id);

      // Simulate storage provider failure
      mockStorage.simulateDeleteFailure(true);

      try {
        await StorageService.deleteAsset(adminActor, asset.id);
        expect.fail('Should have thrown on provider failure');
      } catch (err: unknown) {
        expect(err).toBeInstanceOf(AppError);
        const appErr = err as AppError;
        expect(appErr.code).toBe('MEDIA_DELETE_FAILED');
      } finally {
        mockStorage.simulateDeleteFailure(false);
      }

      // Ensure asset status was transitioned to FAILED for operational observability
      const failedAsset = await prisma.mediaAsset.findUnique({ where: { id: asset.id } });
      expect(failedAsset?.status).toBe(MediaStatus.FAILED);
    });
  });

  // =========================================================================
  // 8. HISTORICAL REVISION ROLLBACK PRESERVATION
  // =========================================================================
  describe('8. Historical Revision Rollback Preservation', () => {
    it('restores previous MediaAsset attachment when restoring an older revision', async () => {
      // Upload Asset A and Asset B
      const assetA = await StorageService.uploadServerBuffer(editorActor, {
        filename: 'chord-diagram-v1.png',
        mimeType: 'image/png',
        buffer: Buffer.from('VERSION-1-CHORD'),
        altText: 'Chord diagram v1',
      });
      cleanupMediaAssetIds.push(assetA.id);

      const assetB = await StorageService.uploadServerBuffer(editorActor, {
        filename: 'chord-diagram-v2.png',
        mimeType: 'image/png',
        buffer: Buffer.from('VERSION-2-CHORD'),
        altText: 'Chord diagram v2',
      });
      cleanupMediaAssetIds.push(assetB.id);

      // Create course, module, lesson
      const course = await AdminContentService.createCourse(editorActor, {
        title: `Revision Media Course ${timestamp}`,
        slug: `rev-media-course-${timestamp}`,
        description: 'Testing revision media snapshots',
        difficulty: 'BEGINNER',
        order: getNextOrder(),
      });
      cleanupCourseIds.push(course.id);

      const testModule = await AdminContentService.createModule(editorActor, {
        courseId: course.id,
        title: 'Rev Module',
        slug: `rev-mod-${timestamp}`,
        description: 'Module testing revision media rollback',
        estimatedMinutes: 30,
        order: 1,
      });

      const lesson = await AdminContentService.createLesson(editorActor, {
        moduleId: testModule.id,
        title: 'Rev Lesson with Media',
        slug: `rev-lesson-${timestamp}`,
        description: 'Lesson testing revision media rollback',
        difficulty: 'BEGINNER',
        estimatedMinutes: 15,
        xpReward: 50,
        order: 1,
      });

      // Section with Asset A
      const section = await AdminContentService.addLessonSection(editorActor, {
        lessonId: lesson.id,
        type: 'IMAGE',
        title: 'C Major Finger Placement',
        content: 'Original posture diagram',
        mediaAssetId: assetA.id,
        required: true,
      });

      // Submit for review and publish -> triggers Revision 1
      await AdminContentService.submitLessonForReview(editorActor, lesson.id);
      const publishedRev1 = await AdminContentService.publishLesson(adminActor, lesson.id);
      expect(publishedRev1.status).toBe('PUBLISHED');

      // Now update section to Asset B
      await AdminContentService.updateLessonSection(editorActor, section.id, {
        content: 'Updated higher-resolution diagram',
        mediaAssetId: assetB.id,
      });

      // Publish update -> triggers Revision 2
      const publishedRev2 = await AdminContentService.publishLesson(adminActor, lesson.id);
      expect(publishedRev2.status).toBe('PUBLISHED');

      // Verify current section has Asset B
      const currentLesson = await AdminContentService.getLessonById(editorActor, lesson.id);
      const currentSec = currentLesson.sections.find((s) => s.id === section.id);
      expect(currentSec?.mediaAssetId).toBe(assetB.id);

      // Fetch revisions
      const revisions = await prisma.lessonRevision.findMany({
        where: { lessonId: lesson.id },
        orderBy: { version: 'asc' },
      });
      expect(revisions.length).toBeGreaterThanOrEqual(2);
      const rev1 = revisions[0];

      // Restore Revision 1
      const restored = await AdminContentService.restoreRevision(adminActor, rev1.id);
      expect(restored).not.toBeNull();
      expect(restored?.status).toBe('DRAFT');

      // Verify the restored section has recovered Asset A!
      const restoredLesson = await AdminContentService.getLessonById(editorActor, lesson.id);
      const restoredSec = restoredLesson.sections.find((s) => s.title === 'C Major Finger Placement');
      expect(restoredSec).toBeDefined();
      expect(restoredSec?.mediaAssetId).toBe(assetA.id);
    });
  });
});
