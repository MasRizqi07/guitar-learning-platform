import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '@/lib/db';
import { AdminContentService } from '@/services/admin-content.service';
import { AdminContentRepository } from '@/repositories/admin-content.repository';
import { CurriculumRepository } from '@/repositories/curriculum.repository';
import { AuthService } from '@/services/auth.service';
import { SessionUser } from '@/lib/auth';
import { UserRole, ContentStatus, LessonSectionType, QuestionType, ChordType, AchievementConditionType } from '@prisma/client';

describe('Phase C — Production Content Management System (CMS) Integration Tests', () => {
  const timestamp = Date.now();
  let nextCourseOrder = 1000 + Math.floor(Math.random() * 50000);
  const getNextOrder = () => ++nextCourseOrder;
  const createdUserIds: string[] = [];
  const cleanupCourseIds: string[] = [];
  const cleanupChordIds: string[] = [];
  const cleanupAchievementIds: string[] = [];

  let learnerActor: SessionUser;
  let editorActor: SessionUser;
  let supportActor: SessionUser;
  let adminActor: SessionUser;
  let ownerActor: SessionUser;

  let learnerUserId: string;
  let editorUserId: string;
  let supportUserId: string;
  let adminUserId: string;
  let ownerUserId: string;

  beforeAll(async () => {
    // 1. Create test learner
    const u1 = await AuthService.register({
      name: 'CMS Learner',
      email: `cms_learner_${timestamp}@test.com`,
      password: 'SecurePassword123!',
    });
    learnerUserId = u1.id;
    createdUserIds.push(learnerUserId);
    learnerActor = { id: learnerUserId, email: u1.email, name: u1.name, role: UserRole.LEARNER };

    // 2. Create Content Editor
    const u2 = await AuthService.register({
      name: 'CMS Editor',
      email: `cms_editor_${timestamp}@test.com`,
      password: 'SecurePassword123!',
    });
    editorUserId = u2.id;
    createdUserIds.push(editorUserId);
    await prisma.user.update({ where: { id: editorUserId }, data: { role: UserRole.CONTENT_EDITOR } });
    editorActor = { id: editorUserId, email: u2.email, name: u2.name, role: UserRole.CONTENT_EDITOR };

    // 3. Create Support
    const u3 = await AuthService.register({
      name: 'CMS Support',
      email: `cms_support_${timestamp}@test.com`,
      password: 'SecurePassword123!',
    });
    supportUserId = u3.id;
    createdUserIds.push(supportUserId);
    await prisma.user.update({ where: { id: supportUserId }, data: { role: UserRole.SUPPORT } });
    supportActor = { id: supportUserId, email: u3.email, name: u3.name, role: UserRole.SUPPORT };

    // 4. Create Admin
    const u4 = await AuthService.register({
      name: 'CMS Admin',
      email: `cms_admin_${timestamp}@test.com`,
      password: 'SecurePassword123!',
    });
    adminUserId = u4.id;
    createdUserIds.push(adminUserId);
    await prisma.user.update({ where: { id: adminUserId }, data: { role: UserRole.ADMIN } });
    adminActor = { id: adminUserId, email: u4.email, name: u4.name, role: UserRole.ADMIN };

    // 5. Create Owner
    const u5 = await AuthService.register({
      name: 'CMS Owner',
      email: `cms_owner_${timestamp}@test.com`,
      password: 'SecurePassword123!',
    });
    ownerUserId = u5.id;
    createdUserIds.push(ownerUserId);
    await prisma.user.update({ where: { id: ownerUserId }, data: { role: UserRole.OWNER } });
    ownerActor = { id: ownerUserId, email: u5.email, name: u5.name, role: UserRole.OWNER };
  });

  afterAll(async () => {
    // Clean up created entities
    for (const uId of createdUserIds) {
      await prisma.quizAttemptAnswer.deleteMany({ where: { quizAttempt: { userId: uId } } });
      await prisma.quizAttempt.deleteMany({ where: { userId: uId } });
      await prisma.lessonRevision.deleteMany({ where: { createdById: uId } });
    }
    for (const cId of cleanupCourseIds) {
      const lessons = await prisma.lesson.findMany({ where: { module: { courseId: cId } }, select: { id: true } });
      const lessonIds = lessons.map((l) => l.id);
      if (lessonIds.length > 0) {
        await prisma.quizAttemptAnswer.deleteMany({ where: { question: { quiz: { lessonId: { in: lessonIds } } } } });
        await prisma.quizAttempt.deleteMany({ where: { quiz: { lessonId: { in: lessonIds } } } });
        await prisma.lessonRevision.deleteMany({ where: { lessonId: { in: lessonIds } } });
      }
      await prisma.course.deleteMany({ where: { id: cId } });
    }
    for (const chId of cleanupChordIds) {
      await prisma.chord.deleteMany({ where: { id: chId } });
    }
    for (const achId of cleanupAchievementIds) {
      await prisma.achievement.deleteMany({ where: { id: achId } });
    }
    for (const uId of createdUserIds) {
      await prisma.user.deleteMany({ where: { id: uId } });
    }
  });

  // =========================================================================
  // 1. RBAC & PERMISSION ISOLATION
  // =========================================================================
  describe('1. RBAC & CMS Permission Isolation', () => {
    it('denies LEARNER from accessing CMS course operations', async () => {
      await expect(
        AdminContentService.createCourse(learnerActor, {
          title: 'Learner Course',
          slug: `learner-course-${timestamp}`,
          description: 'Denied course',
          difficulty: 'BEGINNER',
          order: 99,
        })
      ).rejects.toThrow(/Permission denied/);
    });

    it('denies SUPPORT from creating or mutating curriculum', async () => {
      await expect(
        AdminContentService.createCourse(supportActor, {
          title: 'Support Course',
          slug: `support-course-${timestamp}`,
          description: 'Denied course',
          difficulty: 'BEGINNER',
          order: 99,
        })
      ).rejects.toThrow(/Permission denied/);
    });

    it('allows CONTENT_EDITOR to create draft courses and modules', async () => {
      const course = await AdminContentService.createCourse(editorActor, {
        title: `Editor Course ${timestamp}`,
        slug: `editor-course-${timestamp}`,
        description: 'Course created by Content Editor',
        difficulty: 'BEGINNER',
        order: getNextOrder(),
      });

      cleanupCourseIds.push(course.id);
      expect(course).toBeDefined();
      expect(course.status).toBe(ContentStatus.DRAFT);
      expect(course.published).toBe(false);

      const createdMod = await AdminContentService.createModule(editorActor, {
        courseId: course.id,
        title: 'Module 1 - Editor Draft',
        slug: `module-1-${timestamp}`,
        description: 'First module',
        estimatedMinutes: 20,
        order: 1,
      });

      expect(createdMod).toBeDefined();
      expect(createdMod.status).toBe(ContentStatus.DRAFT);
    });

    it('allows CONTENT_EDITOR to create lesson draft and sections', async () => {
      const course = await AdminContentService.createCourse(editorActor, {
        title: `Lesson Test Course ${timestamp}`,
        slug: `lesson-course-${timestamp}`,
        description: 'Testing lesson lifecycle',
        difficulty: 'INTERMEDIATE',
        order: getNextOrder(),
      });
      cleanupCourseIds.push(course.id);

      const createdMod = await AdminContentService.createModule(editorActor, {
        courseId: course.id,
        title: 'Module For Lesson',
        slug: `mod-for-les-${timestamp}`,
        description: 'Test mod',
        estimatedMinutes: 30,
        order: 1,
      });

      const lesson = await AdminContentService.createLesson(editorActor, {
        moduleId: createdMod.id,
        title: 'Test Draft Lesson',
        slug: `draft-lesson-${timestamp}`,
        description: 'Draft lesson description',
        difficulty: 'INTERMEDIATE',
        estimatedMinutes: 15,
        xpReward: 30,
        order: 1,
      });

      expect(lesson).toBeDefined();
      expect(lesson.status).toBe(ContentStatus.DRAFT);
      expect(lesson.published).toBe(false);

      const section = await AdminContentService.createSection(editorActor, {
        lessonId: lesson.id,
        type: LessonSectionType.TEXT,
        title: 'Introduction to Testing',
        content: 'This is educational content for lesson testing.',
        required: true,
        order: 1,
      });

      expect(section).toBeDefined();
      expect(section.title).toBe('Introduction to Testing');
    });

    it('denies CONTENT_EDITOR from publishing lesson directly (enforcing review workflow & self-approval rule)', async () => {
      const course = await AdminContentService.createCourse(adminActor, {
        title: `Self Approval Test Course ${timestamp}`,
        slug: `self-approval-course-${timestamp}`,
        description: 'Testing self approval restriction',
        difficulty: 'BEGINNER',
        order: getNextOrder(),
      });
      cleanupCourseIds.push(course.id);

      const testMod = await AdminContentService.createModule(adminActor, {
        courseId: course.id,
        title: 'Approval Module',
        slug: `approval-mod-${timestamp}`,
        description: 'Test mod',
        estimatedMinutes: 20,
        order: 1,
      });

      const lesson = await AdminContentService.createLesson(editorActor, {
        moduleId: testMod.id,
        title: `Self Approval Test ${timestamp}`,
        slug: `self-approval-${timestamp}`,
        description: 'Testing self approval restriction',
        difficulty: 'BEGINNER',
        estimatedMinutes: 10,
        xpReward: 20,
        order: 1,
      });

      // Add a valid required section
      await AdminContentService.createSection(editorActor, {
        lessonId: lesson.id,
        type: LessonSectionType.TEXT,
        title: 'Valid Section',
        content: 'Valid content for publication',
        required: true,
        order: 1,
      });

      // Submit for review
      await AdminContentService.submitLessonForReview(editorActor, lesson.id);

      // Attempt to publish as editor -> must fail
      await expect(AdminContentService.publishLesson(editorActor, lesson.id)).rejects.toThrow(
        /Permission denied/
      );
    });

    it('allows OWNER to publish content directly', async () => {
      const course = await AdminContentService.createCourse(ownerActor, {
        title: `Owner Test Course ${timestamp}`,
        slug: `owner-course-${timestamp}`,
        description: 'Testing owner publishing authority',
        difficulty: 'BEGINNER',
        order: getNextOrder(),
      });
      cleanupCourseIds.push(course.id);

      const testMod = await AdminContentService.createModule(ownerActor, {
        courseId: course.id,
        title: 'Owner Module',
        slug: `owner-mod-${timestamp}`,
        description: 'Test mod',
        estimatedMinutes: 20,
        order: 1,
      });

      const lesson = await AdminContentService.createLesson(ownerActor, {
        moduleId: testMod.id,
        title: `Owner Lesson ${timestamp}`,
        slug: `owner-lesson-${timestamp}`,
        description: 'Testing owner publishing authority',
        difficulty: 'BEGINNER',
        estimatedMinutes: 10,
        xpReward: 20,
        order: 1,
      });

      await AdminContentService.createSection(ownerActor, {
        lessonId: lesson.id,
        type: LessonSectionType.TEXT,
        title: 'Owner Section',
        content: 'Owner content directly publishable.',
        required: true,
        order: 1,
      });

      await AdminContentService.submitLessonForReview(ownerActor, lesson.id);
      const published = await AdminContentService.publishLesson(ownerActor, lesson.id);
      expect(published.status).toBe(ContentStatus.PUBLISHED);
      expect(published.publishedById).toBe(ownerActor.id);
    });
  });

  // =========================================================================
  // 2. CONTENT WORKFLOW & STATE MACHINE
  // =========================================================================
  describe('2. Content Workflow & Status Transitions', () => {
    let testLessonId: string;

    beforeAll(async () => {
      const course = await AdminContentService.createCourse(adminActor, {
        title: `Workflow Course ${timestamp}`,
        slug: `workflow-course-${timestamp}`,
        description: 'Workflow testing',
        difficulty: 'ADVANCED',
        order: getNextOrder(),
      });
      cleanupCourseIds.push(course.id);

      const createdMod = await AdminContentService.createModule(adminActor, {
        courseId: course.id,
        title: 'Workflow Module',
        slug: `workflow-mod-${timestamp}`,
        description: 'Module',
        estimatedMinutes: 30,
        order: 1,
      });

      const lesson = await AdminContentService.createLesson(adminActor, {
        moduleId: createdMod.id,
        title: `Workflow Lesson ${timestamp}`,
        slug: `workflow-lesson-${timestamp}`,
        description: 'Lesson workflow state transitions',
        difficulty: 'ADVANCED',
        estimatedMinutes: 25,
        xpReward: 50,
        order: 1,
      });
      testLessonId = lesson.id;

      // Add required section
      await AdminContentService.createSection(adminActor, {
        lessonId: testLessonId,
        type: LessonSectionType.TEXT,
        title: 'Required Section',
        content: 'This lesson covers advanced guitar mastery.',
        required: true,
        order: 1,
      });
    });

    it('validates lesson before publish and rejects if required content is missing', async () => {
      // Create empty lesson without sections
      const course = await AdminContentRepository.getCourseById(cleanupCourseIds[cleanupCourseIds.length - 1]);
      const mod = (await AdminContentRepository.listModules(course!.id))[0];
      const emptyLesson = await AdminContentService.createLesson(adminActor, {
        moduleId: mod.id,
        title: `Empty Lesson ${timestamp}`,
        slug: `empty-lesson-${timestamp}`,
        description: 'Empty',
        difficulty: 'BEGINNER',
        estimatedMinutes: 5,
        xpReward: 10,
        order: 98,
      });

      await expect(AdminContentService.publishLesson(adminActor, emptyLesson.id)).rejects.toThrow(
        /CONTENT_NOT_PUBLISHABLE/
      );
    });

    it('transitions DRAFT -> IN_REVIEW -> PUBLISHED successfully by ADMIN', async () => {
      // 1. Submit for review
      const inReview = await AdminContentService.submitLessonForReview(editorActor, testLessonId);
      expect(inReview.status).toBe(ContentStatus.IN_REVIEW);
      expect(inReview.submittedForReviewAt).toBeDefined();

      // 2. Publish by ADMIN
      const published = await AdminContentService.publishLesson(adminActor, testLessonId);
      expect(published.status).toBe(ContentStatus.PUBLISHED);
      expect(published.published).toBe(true);
      expect(published.publishedById).toBe(adminActor.id);
      expect(published.publishedAt).toBeDefined();
    });

    it('transitions PUBLISHED -> ARCHIVED and sets legacy published boolean to false', async () => {
      const archived = await AdminContentService.archiveLesson(adminActor, testLessonId);
      expect(archived.status).toBe(ContentStatus.ARCHIVED);
      expect(archived.published).toBe(false);
      expect(archived.archivedAt).toBeDefined();
    });

    it('forbids arbitrary ARCHIVED -> PUBLISHED without proper review/restore workflow', async () => {
      await expect(AdminContentService.publishLesson(adminActor, testLessonId)).rejects.toThrow(
        /INVALID_STATUS_TRANSITION/
      );
    });
  });

  // =========================================================================
  // 3. LESSON REVISION & RESTORE SYSTEM
  // =========================================================================
  describe('3. Lesson Revision History & Restore Workflow', () => {
    type TestSnapshot = {
      lesson: { title: string };
      sections: Array<{ title: string }>;
      quiz?: { title: string };
    };

    let revLessonId: string;
    let revCourseId: string;

    beforeAll(async () => {
      const course = await AdminContentService.createCourse(adminActor, {
        title: `Revision Test Course ${timestamp}`,
        slug: `rev-course-${timestamp}`,
        description: 'Course for testing revision history',
        difficulty: 'BEGINNER',
        order: getNextOrder(),
      });
      revCourseId = course.id;
      cleanupCourseIds.push(revCourseId);

      const mod = await AdminContentService.createModule(adminActor, {
        courseId: course.id,
        title: 'Rev Module',
        slug: `rev-mod-${timestamp}`,
        description: 'Module',
        estimatedMinutes: 30,
        order: 1,
      });

      const lesson = await AdminContentService.createLesson(adminActor, {
        moduleId: mod.id,
        title: 'Original Title v1',
        slug: `rev-lesson-${timestamp}`,
        description: 'Initial lesson content v1',
        difficulty: 'BEGINNER',
        estimatedMinutes: 10,
        xpReward: 20,
        order: 1,
      });
      revLessonId = lesson.id;

      await AdminContentService.createSection(adminActor, {
        lessonId: revLessonId,
        type: LessonSectionType.TEXT,
        title: 'Section 1 (v1)',
        content: 'Original content of section 1 in version 1.',
        required: true,
        order: 1,
      });

      // Create initial quiz directly
      await prisma.quiz.create({
        data: {
          lessonId: revLessonId,
          title: 'Quiz v1',
          description: 'Quiz version 1',
          passingScore: 70,
          xpReward: 15,
          questions: {
            create: [
              {
                type: QuestionType.MULTIPLE_CHOICE,
                prompt: 'Question v1: How many strings does a guitar have?',
                order: 1,
                options: {
                  create: [
                    { text: '6', isCorrect: true, order: 1 },
                    { text: '4', isCorrect: false, order: 2 },
                  ],
                },
              },
            ],
          },
        },
      });
    });

    it('creates monotonically incremented Revision 1 on first publish', async () => {
      const published = await AdminContentService.publishLesson(adminActor, revLessonId);
      expect(published.status).toBe(ContentStatus.PUBLISHED);

      const revisions = await AdminContentRepository.listLessonRevisions(revLessonId);
      expect(revisions.length).toBe(1);
      expect(revisions[0].version).toBe(1);

      const snapshot = revisions[0].snapshot as unknown as TestSnapshot;
      expect(snapshot.lesson.title).toBe('Original Title v1');
      expect(snapshot.sections.length).toBe(1);
      expect(snapshot.sections[0].title).toBe('Section 1 (v1)');
      expect(snapshot.quiz?.title).toBe('Quiz v1');
    });

    it('creates Revision 2 upon editing and republishing', async () => {
      // 1. Update lesson metadata
      const current = await AdminContentRepository.getLessonById(revLessonId);
      await AdminContentService.updateLesson(adminActor, revLessonId, {
        title: 'Updated Title v2',
        description: 'Revised lesson description v2',
        clientUpdatedAt: current!.updatedAt.toISOString(),
      });

      // 2. Add a second section
      await AdminContentService.createSection(adminActor, {
        lessonId: revLessonId,
        type: LessonSectionType.TIP,
        title: 'Section 2 (v2) Pro Tip',
        content: 'Keep your thumb anchored behind the neck.',
        required: false,
        order: 2,
      });

      // 3. Re-publish
      const republished = await AdminContentService.publishLesson(adminActor, revLessonId);
      expect(republished.title).toBe('Updated Title v2');

      const revisions = await AdminContentRepository.listLessonRevisions(revLessonId);
      expect(revisions.length).toBe(2);
      expect(revisions[0].version).toBe(2); // ordered desc
      expect(revisions[1].version).toBe(1);

      const snap2 = revisions[0].snapshot as unknown as TestSnapshot;
      expect(snap2.lesson.title).toBe('Updated Title v2');
      expect(snap2.sections.length).toBe(2);
    });

    it('restores Revision 1, creates safety backup, and resets status to DRAFT', async () => {
      const revisions = await AdminContentRepository.listLessonRevisions(revLessonId);
      const v1Revision = revisions.find((r) => r.version === 1);
      expect(v1Revision).toBeDefined();

      const restored = await AdminContentService.restoreLessonRevision(adminActor, revLessonId, v1Revision!.id);
      expect(restored!.title).toBe('Original Title v1');
      expect(restored!.status).toBe(ContentStatus.DRAFT);
      expect(restored!.published).toBe(false);

      // Verify sections were restored to v1 state (1 section)
      const freshLesson = await AdminContentRepository.getLessonById(revLessonId);
      expect(freshLesson!.sections.length).toBe(1);
      expect(freshLesson!.sections[0].title).toBe('Section 1 (v1)');

      // Verify a safety revision version 3 was automatically archived
      const revsAfterRestore = await AdminContentRepository.listLessonRevisions(revLessonId);
      expect(revsAfterRestore.length).toBe(3);
      expect(revsAfterRestore[0].version).toBe(3);
    });
  });

  // =========================================================================
  // 4. TRANSACTIONAL COLLISION-FREE REORDERING
  // =========================================================================
  describe('4. Transactional Collision-Free Reordering', () => {
    let reorderCourseId: string;
    let reorderModId: string;
    let modIds: string[] = [];
    let secIds: string[] = [];

    beforeAll(async () => {
      const course = await AdminContentService.createCourse(adminActor, {
        title: `Reorder Test Course ${timestamp}`,
        slug: `reorder-course-${timestamp}`,
        description: 'Reordering safety test',
        difficulty: 'BEGINNER',
        order: getNextOrder(),
      });
      reorderCourseId = course.id;
      cleanupCourseIds.push(reorderCourseId);

      // Create 3 modules in order 1, 2, 3
      const m1 = await AdminContentService.createModule(adminActor, {
        courseId: reorderCourseId,
        title: 'Module 1',
        slug: `mod-order-1-${timestamp}`,
        description: 'M1',
        estimatedMinutes: 30,
        order: 1,
      });
      const m2 = await AdminContentService.createModule(adminActor, {
        courseId: reorderCourseId,
        title: 'Module 2',
        slug: `mod-order-2-${timestamp}`,
        description: 'M2',
        estimatedMinutes: 30,
        order: 2,
      });
      const m3 = await AdminContentService.createModule(adminActor, {
        courseId: reorderCourseId,
        title: 'Module 3',
        slug: `mod-order-3-${timestamp}`,
        description: 'M3',
        estimatedMinutes: 30,
        order: 3,
      });
      modIds = [m1.id, m2.id, m3.id];
      reorderModId = m1.id;

      // Create lesson and 3 sections in order 1, 2, 3
      const lesson = await AdminContentService.createLesson(adminActor, {
        moduleId: reorderModId,
        title: 'Section Reorder Lesson',
        slug: `sec-reorder-${timestamp}`,
        description: 'Sections',
        difficulty: 'BEGINNER',
        estimatedMinutes: 10,
        xpReward: 10,
        order: 1,
      });

      const s1 = await AdminContentService.createSection(adminActor, {
        lessonId: lesson.id,
        type: LessonSectionType.TEXT,
        title: 'Sec A',
        content: 'Content A',
        required: true,
        order: 1,
      });
      const s2 = await AdminContentService.createSection(adminActor, {
        lessonId: lesson.id,
        type: LessonSectionType.TEXT,
        title: 'Sec B',
        content: 'Content B',
        required: true,
        order: 2,
      });
      const s3 = await AdminContentService.createSection(adminActor, {
        lessonId: lesson.id,
        type: LessonSectionType.TEXT,
        title: 'Sec C',
        content: 'Content C',
        required: true,
        order: 3,
      });
      secIds = [s1.id, s2.id, s3.id];
    });

    it('safely reorders modules [1, 2, 3] -> [3, 1, 2] without unique constraint collisions', async () => {
      // Move m3 to order 1, m1 to order 2, m2 to order 3
      const newOrdering = [
        { id: modIds[2], order: 1 },
        { id: modIds[0], order: 2 },
        { id: modIds[1], order: 3 },
      ];

      await AdminContentService.reorderModules(adminActor, { items: newOrdering });

      const modules = await AdminContentRepository.listModules(reorderCourseId);
      expect(modules[0].id).toBe(modIds[2]);
      expect(modules[0].order).toBe(1);
      expect(modules[1].id).toBe(modIds[0]);
      expect(modules[1].order).toBe(2);
      expect(modules[2].id).toBe(modIds[1]);
      expect(modules[2].order).toBe(3);
    });

    it('safely reorders sections without unique constraint collisions', async () => {
      // Invert order: s3 -> 1, s2 -> 2, s1 -> 3
      const newOrdering = [
        { id: secIds[2], order: 1 },
        { id: secIds[1], order: 2 },
        { id: secIds[0], order: 3 },
      ];

      await AdminContentService.reorderSections(adminActor, { items: newOrdering });

      const freshLesson = await AdminContentRepository.getLessonById(
        (await AdminContentRepository.listLessons({ page: 1, pageSize: 1, status: 'ALL', sortBy: 'order', sortOrder: 'asc', search: 'Section Reorder Lesson' })).items[0].id
      );
      expect(freshLesson!.sections[0].id).toBe(secIds[2]);
      expect(freshLesson!.sections[0].order).toBe(1);
      expect(freshLesson!.sections[1].id).toBe(secIds[1]);
      expect(freshLesson!.sections[1].order).toBe(2);
      expect(freshLesson!.sections[2].id).toBe(secIds[0]);
      expect(freshLesson!.sections[2].order).toBe(3);
    });
  });

  // =========================================================================
  // 5. HISTORICAL QUIZ DATA INTEGRITY & QUESTION PROTECTION
  // =========================================================================
  describe('5. Historical Quiz Data Integrity & Question Protection', () => {
    let quizLessonId: string;
    let quizId: string;
    let questionId1: string;

    beforeAll(async () => {
      const course = await AdminContentService.createCourse(adminActor, {
        title: `Quiz History Safety Course ${timestamp}`,
        slug: `quiz-hist-course-${timestamp}`,
        description: 'Quiz attempt preservation',
        difficulty: 'BEGINNER',
        order: getNextOrder(),
      });
      cleanupCourseIds.push(course.id);

      const mod = await AdminContentService.createModule(adminActor, {
        courseId: course.id,
        title: 'Quiz Hist Module',
        slug: `quiz-hist-mod-${timestamp}`,
        description: 'Module',
        estimatedMinutes: 30,
        order: 1,
      });

      const lesson = await AdminContentService.createLesson(adminActor, {
        moduleId: mod.id,
        title: 'Quiz History Lesson',
        slug: `quiz-hist-lesson-${timestamp}`,
        description: 'Lesson with completed quiz attempts',
        difficulty: 'BEGINNER',
        estimatedMinutes: 10,
        xpReward: 20,
        order: 1,
      });
      quizLessonId = lesson.id;

      await AdminContentService.createSection(adminActor, {
        lessonId: quizLessonId,
        type: LessonSectionType.TEXT,
        title: 'Quiz Prep',
        content: 'Read this before attempting the quiz.',
        required: true,
        order: 1,
      });

      const createdQuiz = await prisma.quiz.create({
        data: {
          lessonId: quizLessonId,
          title: 'Preserved Quiz',
          description: 'Test attempt safety',
          passingScore: 80,
          xpReward: 20,
          questions: {
            create: [
              {
                type: QuestionType.MULTIPLE_CHOICE,
                prompt: 'Historical Question: Name the standard guitar tuning.',
                order: 1,
                options: {
                  create: [
                    { text: 'E A D G B E', isCorrect: true, order: 1 },
                    { text: 'D A D G A D', isCorrect: false, order: 2 },
                  ],
                },
              },
              {
                type: QuestionType.TRUE_FALSE,
                prompt: 'A guitar has frets.',
                order: 2,
                options: {
                  create: [
                    { text: 'True', isCorrect: true, order: 1 },
                    { text: 'False', isCorrect: false, order: 2 },
                  ],
                },
              },
            ],
          },
        },
      });
      quizId = createdQuiz.id;

      const loadedQuiz = await AdminContentRepository.getQuizById(quizId);
      questionId1 = loadedQuiz!.questions[0].id;

      // Publish the lesson
      await AdminContentService.publishLesson(adminActor, quizLessonId);

      // Simulate a Learner taking and submitting the quiz
      const attempt = await prisma.quizAttempt.create({
        data: {
          userId: learnerUserId,
          quizId,
          score: 100,
          passed: true,
          completedAt: new Date(),
        },
      });

      await prisma.quizAttemptAnswer.create({
        data: {
          quizAttemptId: attempt.id,
          questionId: questionId1,
          selectedAnswerOptionId: loadedQuiz!.questions[0].options[0].id,
          isCorrect: true,
        },
      });
    });

    it('rejects deletion of a question that has historical learner attempts (QUESTION_IN_USE)', async () => {
      const current = await AdminContentRepository.getQuizById(quizId);
      expect(current).toBeDefined();

      // Attempt to save quiz with question 1 deleted (only keeping question 2)
      const q2 = current!.questions.find((q) => q.id !== questionId1)!;

      await expect(
        AdminContentService.updateQuiz(adminActor, quizId, {
          title: current!.title,
          description: current!.description,
          passingScore: current!.passingScore,
          xpReward: current!.xpReward,
          questions: [
            {
              id: q2.id,
              type: q2.type,
              prompt: q2.prompt,
              order: 1,
              options: q2.options.map((o) => ({
                id: o.id,
                text: o.text,
                isCorrect: o.isCorrect,
                order: o.order,
              })),
            },
          ],
        })
      ).rejects.toThrow(/QUESTION_IN_USE/);
    });

    it('preserves historical QuizAttempt and answer records intact when modifying quiz metadata', async () => {
      const current = await AdminContentRepository.getQuizById(quizId);

      // Update quiz title and passing score
      await AdminContentService.updateQuiz(adminActor, quizId, {
        title: 'Preserved Quiz (Revised Title)',
        description: current!.description,
        passingScore: 85,
        xpReward: 25,
        questions: current!.questions.map((q) => ({
          id: q.id,
          type: q.type,
          prompt: q.prompt,
          order: q.order,
          options: q.options.map((o) => ({
            id: o.id,
            text: o.text,
            isCorrect: o.isCorrect,
            order: o.order,
          })),
        })),
      });

      // Verify learner attempt remains intact in the database
      const attempts = await prisma.quizAttempt.findMany({
        where: { quizId },
        include: { answers: true },
      });

      expect(attempts.length).toBe(1);
      expect(attempts[0].score).toBe(100);
      expect(attempts[0].passed).toBe(true);
      expect(attempts[0].answers.length).toBe(1);
      expect(attempts[0].answers[0].questionId).toBe(questionId1);
    });
  });

  // =========================================================================
  // 6. LEARNER CURRICULUM VISIBILITY
  // =========================================================================
  describe('6. Learner Curriculum Visibility Invariant', () => {
    let visibilityCourseId: string;
    let draftLessonId: string;
    let publishedLessonId: string;
    const draftSlug = `secret-draft-${timestamp}`;
    const publishedSlug = `public-lesson-${timestamp}`;

    beforeAll(async () => {
      const course = await AdminContentService.createCourse(adminActor, {
        title: `Visibility Test Course ${timestamp}`,
        slug: `vis-course-${timestamp}`,
        description: 'Learner visibility invariant',
        difficulty: 'BEGINNER',
        order: getNextOrder(),
      });
      visibilityCourseId = course.id;
      cleanupCourseIds.push(visibilityCourseId);

      const mod = await AdminContentService.createModule(adminActor, {
        courseId: course.id,
        title: 'Vis Module',
        slug: `vis-mod-${timestamp}`,
        description: 'Module',
        estimatedMinutes: 30,
        order: 1,
      });

      // Lesson 1: Draft
      const l1 = await AdminContentService.createLesson(adminActor, {
        moduleId: mod.id,
        title: 'Secret Draft Lesson',
        slug: draftSlug,
        description: 'Draft',
        difficulty: 'BEGINNER',
        estimatedMinutes: 10,
        xpReward: 10,
        order: 1,
      });
      draftLessonId = l1.id;

      // Lesson 2: Published
      const l2 = await AdminContentService.createLesson(adminActor, {
        moduleId: mod.id,
        title: 'Public Published Lesson',
        slug: publishedSlug,
        description: 'Published',
        difficulty: 'BEGINNER',
        estimatedMinutes: 10,
        xpReward: 10,
        order: 2,
      });
      publishedLessonId = l2.id;

      await AdminContentService.createSection(adminActor, {
        lessonId: publishedLessonId,
        type: LessonSectionType.TEXT,
        title: 'Public Section',
        content: 'Publicly readable material.',
        required: true,
        order: 1,
      });

      await AdminContentService.publishLesson(adminActor, publishedLessonId);
    });

    it('ensures DRAFT lesson has published=false and is filtered from learner published queries', async () => {
      const draft = await AdminContentRepository.getLessonById(draftLessonId);
      expect(draft!.status).toBe(ContentStatus.DRAFT);
      expect(draft!.published).toBe(false);

      // Invariant: Learner cannot retrieve draft lesson
      const learnerDraftResult = await CurriculumRepository.getLessonBySlug(draftSlug);
      expect(learnerDraftResult).toBeNull();

      // Invariant: Learner CAN retrieve published lesson
      const learnerPublishedResult = await CurriculumRepository.getLessonBySlug(publishedSlug);
      expect(learnerPublishedResult).not.toBeNull();
      expect(learnerPublishedResult!.id).toBe(publishedLessonId);
      expect(learnerPublishedResult!.published).toBe(true);
    });
  });

  // =========================================================================
  // 7. CHORD & ACHIEVEMENT CMS
  // =========================================================================
  describe('7. Chord & Achievement CMS Management', () => {
    it('creates, previews, and updates chord definitions', async () => {
      const chord = await AdminContentService.createChord(adminActor, {
        name: `Cadd9 ${timestamp}`,
        slug: `cadd9-${timestamp}`,
        type: ChordType.MAJOR,
        difficulty: 'INTERMEDIATE',
        description: 'Beautiful acoustic embellishment',
        notes: ['C', 'E', 'G', 'D'],
        diagramData: {
          strings: ['X', 3, 2, 0, 3, 3],
          fingers: [0, 2, 1, 0, 3, 4],
          baseFret: 1,
        },
      });

      cleanupChordIds.push(chord.id);
      expect(chord).toBeDefined();
      expect(chord.name).toContain('Cadd9');

      const updated = await AdminContentService.updateChord(adminActor, chord.id, {
        description: 'Updated acoustic embellishment description',
      });
      expect(updated.description).toBe('Updated acoustic embellishment description');
    });

    it('creates and updates achievements with protected stable code', async () => {
      const ach = await AdminContentService.createAchievement(adminActor, {
        code: `CMS_PRACTICE_${timestamp}`,
        name: 'CMS Master Practicer',
        description: 'Practice for 100 minutes',
        icon: '🎸',
        conditionType: AchievementConditionType.PRACTICE_SECONDS,
        conditionValue: 6000,
        xpReward: 100,
        active: true,
      });

      cleanupAchievementIds.push(ach.id);
      expect(ach).toBeDefined();
      expect(ach.code).toBe(`CMS_PRACTICE_${timestamp}`);

      const updated = await AdminContentService.updateAchievement(adminActor, ach.id, {
        name: 'CMS Master Practicer (Renamed)',
        xpReward: 150,
      });
      expect(updated.name).toBe('CMS Master Practicer (Renamed)');
      expect(updated.xpReward).toBe(150);
      expect(updated.code).toBe(`CMS_PRACTICE_${timestamp}`); // code remains stable
    });
  });

  // =========================================================================
  // 8. OPTIMISTIC CONCURRENCY PROTECTION
  // =========================================================================
  describe('8. Optimistic Concurrency Protection', () => {
    it('detects concurrent stale edits and throws CONTENT_CONFLICT (409)', async () => {
      const course = await AdminContentService.createCourse(adminActor, {
        title: `Concurrency Course ${timestamp}`,
        slug: `conc-course-${timestamp}`,
        description: 'Testing concurrency',
        difficulty: 'BEGINNER',
        order: getNextOrder(),
      });
      cleanupCourseIds.push(course.id);

      const staleUpdatedAt = new Date(Date.now() - 60000).toISOString();

      await expect(
        AdminContentService.updateCourse(adminActor, course.id, {
          title: 'Concurrent Overwrite Title',
          clientUpdatedAt: staleUpdatedAt,
        })
      ).rejects.toThrow(/This content was updated by another editor/);
    });
  });
});
