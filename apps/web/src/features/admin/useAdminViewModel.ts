// useAdminViewModel.ts
// Admin hook — a superset of useTeacherViewModel.
// Admins share the teacher login (is_admin === true on their Teacher record).
// Every action a teacher can do, an admin can also do — but scoped to the
// entire platform rather than just their own courses/students.
//
// API calls marked:
//   🔧 STUB — swap for a real fetch() when the backend route exists
import { useState, useCallback } from "react";
import { useTeacherViewModel } from "../teacher/useTeacherViewModel";
import type { TeacherViewModel, CreateAssignmentInput, UpdateAssignmentInput, CreateCourseInput, UploadMaterialInput } from "../teacher/useTeacherViewModel";
import type {
  AdminProfile,
  AdminTeacherRecord,
  AdminStudentRecord,
  AdminStudentDocument,
  ChunkStats,
  WorkspaceFileVersion,
  AdminAnswer,
  PlatformAuditEntry,
  PlatformStats,
} from "./admin.types";
import type {
  Course,
  Assignment,
  CourseMaterial,
  Submission,
  Feedback,
  ChatMessage,
  Canvas,
  ClassAnalysis,
} from "../teacher/teacher.types";

// ─── Stub demo data ───────────────────────────────────────────────────────────

const STUB_ADMIN: AdminProfile = {
  id: 99,
  first_name: "Jordan",
  last_name: "Admin",
  email: "jordan.admin@demo.school",
  is_admin: true,
  created_at: "2026-08-01T00:00:00.000Z",
};

const STUB_TEACHERS: AdminTeacherRecord[] = [
  { id: 1, first_name: "Alex", last_name: "Taylor", email: "alex.taylor@demo.school", is_admin: false, created_at: "2026-09-01T00:00:00.000Z", course_count: 2, student_count: 14 },
  { id: 2, first_name: "Morgan", last_name: "Lee", email: "morgan.lee@demo.school", is_admin: false, created_at: "2026-09-03T00:00:00.000Z", course_count: 1, student_count: 6 },
];

const STUB_ALL_STUDENTS: AdminStudentRecord[] = [
  { id: 1,  teacher_id: 1, display_name: "Amelia B.",  username: "amelia.b8",  email: null, created_at: "2026-09-02T00:00:00.000Z" },
  { id: 2,  teacher_id: 1, display_name: "Ethan C.",   username: "ethan.c8",   email: null, created_at: "2026-09-02T00:00:00.000Z" },
  { id: 3,  teacher_id: 1, display_name: "Isla D.",    username: "isla.d8",    email: null, created_at: "2026-09-02T00:00:00.000Z" },
  { id: 4,  teacher_id: 1, display_name: "Liam K.",    username: "liam.k8",    email: null, created_at: "2026-09-02T00:00:00.000Z" },
  { id: 5,  teacher_id: 1, display_name: "Maya L.",    username: "maya.l8",    email: null, created_at: "2026-09-02T00:00:00.000Z" },
  { id: 6,  teacher_id: 1, display_name: "Noah M.",    username: "noah.m8",    email: null, created_at: "2026-09-02T00:00:00.000Z" },
  { id: 7,  teacher_id: 1, display_name: "Oliver R.",  username: "oliver.r8",  email: null, created_at: "2026-09-02T00:00:00.000Z" },
  { id: 8,  teacher_id: 1, display_name: "Sofia T.",   username: "sofia.t8",   email: null, created_at: "2026-09-02T00:00:00.000Z" },
  { id: 9,  teacher_id: 1, display_name: "Aiden H.",   username: "aiden.h9",   email: null, created_at: "2026-09-02T00:00:00.000Z" },
  { id: 10, teacher_id: 1, display_name: "Chloe J.",   username: "chloe.j9",   email: null, created_at: "2026-09-02T00:00:00.000Z" },
  { id: 11, teacher_id: 1, display_name: "Emma N.",    username: "emma.n9",    email: null, created_at: "2026-09-02T00:00:00.000Z" },
  { id: 12, teacher_id: 1, display_name: "Lucas P.",   username: "lucas.p9",   email: null, created_at: "2026-09-02T00:00:00.000Z" },
  { id: 13, teacher_id: 1, display_name: "Mateo S.",   username: "mateo.s9",   email: null, created_at: "2026-09-02T00:00:00.000Z" },
  { id: 14, teacher_id: 1, display_name: "Zoe W.",     username: "zoe.w9",     email: null, created_at: "2026-09-02T00:00:00.000Z" },
  { id: 15, teacher_id: 2, display_name: "Priya R.",   username: "priya.r9",   email: null, created_at: "2026-09-04T00:00:00.000Z" },
  { id: 16, teacher_id: 2, display_name: "James W.",   username: "james.w9",   email: null, created_at: "2026-09-04T00:00:00.000Z" },
];

const STUB_PLATFORM_STATS: PlatformStats = {
  total_teachers: 2,
  total_students: 16,
  total_courses: 3,
  total_assignments: 2,
  total_submissions: 0,
  total_chat_messages: 0,
  flagged_messages_last_7_days: 0,
  storage_bytes_used: 0,
};

// ─── Input shapes (admin-only) ────────────────────────────────────────────────

export interface CreateStudentInput {
  teacher_id: number;
  display_name: string;
  username: string;
  password: string; // plaintext; hashed server-side, never stored on client
}

export interface EnrollStudentInput {
  student_id: number;
  course_id: number;
}

export interface PromoteTeacherInput {
  teacher_id: number;
  is_admin: boolean;
}

// ─── The admin viewmodel ──────────────────────────────────────────────────────

export interface AdminViewModel {
  // ── Identity ──
  admin: AdminProfile;

  // ── Everything a teacher can do (re-exported, platform-scoped) ──
  teacher: TeacherViewModel;

  // ── Platform-wide read access ──
  platformStats: PlatformStats;

  // ── Teacher management ──
  allTeachers: AdminTeacherRecord[];
  promoteTeacher: (input: PromoteTeacherInput) => Promise<AdminTeacherRecord>;
  deleteTeacher: (teacherId: number) => Promise<void>; // cascades: courses, students, materials

  // ── Student management (cross-teacher) ──
  allStudents: AdminStudentRecord[];
  createStudent: (input: CreateStudentInput) => Promise<AdminStudentRecord>;
  enrollStudent: (input: EnrollStudentInput) => Promise<void>;
  unenrollStudent: (studentId: number, courseId: number) => Promise<void>;
  deleteStudent: (studentId: number) => Promise<void>; // purges all student data (GDPR)
  resetStudentPasswordAdmin: (studentId: number) => Promise<{ temporary_password: string }>;

  // ── Cross-teacher course access ──
  getAllCourses: () => Promise<Course[]>;
  reassignCourse: (courseId: number, newTeacherId: number) => Promise<Course>;

  // ── Cross-teacher assignment access ──
  getAllAssignments: () => Promise<Assignment[]>;
  createAssignmentForTeacher: (teacherId: number, input: CreateAssignmentInput) => Promise<Assignment>;
  updateAnyAssignment: (input: UpdateAssignmentInput) => Promise<Assignment>;
  deleteAnyAssignment: (assignmentId: number) => Promise<void>;

  // ── Cross-teacher material access ──
  getAllMaterials: () => Promise<CourseMaterial[]>;
  uploadMaterialForTeacher: (teacherId: number, input: UploadMaterialInput) => Promise<CourseMaterial>;
  deleteAnyMaterial: (materialId: number) => Promise<void>;

  // ── Cross-teacher submission access ──
  getAllSubmissions: (assignmentId: number) => Promise<Submission[]>;

  // ── Platform-wide chat audit log ──
  getPlatformChatLog: (filters?: {
    teacherId?: number;
    studentId?: number;
    assignmentId?: number;
    flaggedOnly?: boolean;
    since?: string;
  }) => Promise<PlatformAuditEntry[]>;

  // ── Student documents (privacy oversight) ──
  getStudentDocuments: (studentId: number) => Promise<AdminStudentDocument[]>;
  deleteStudentDocument: (documentId: number) => Promise<void>;

  // ── Workspace version history (audit/recovery) ──
  getFileVersions: (fileId: number) => Promise<WorkspaceFileVersion[]>;
  restoreFileVersion: (fileId: number, versionId: number) => Promise<void>;

  // ── Test answers (cross-class) ──
  getAnswers: (submissionId: number) => Promise<AdminAnswer[]>;

  // ── Feedback (cross-class) ──
  getAllFeedback: (assignmentId: number) => Promise<Feedback[]>;

  // ── Class analyses (cross-class) ──
  getAllAnalyses: (assignmentId: number) => Promise<ClassAnalysis[]>;

  // ── Canvases (cross-teacher) ──
  getAllCanvases: (teacherId?: number) => Promise<Canvas[]>;

  // ── Chunk stats (vector store health) ──
  getChunkStats: (materialId: number) => Promise<ChunkStats>;

  // ── Chat logs scoped to a single student (same as teacher, but for any student) ──
  getStudentChatLog: (studentId: number, assignmentId?: number) => Promise<ChatMessage[]>;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAdminViewModel(): AdminViewModel {
  const teacher = useTeacherViewModel();
  const [allTeachers, setAllTeachers] = useState<AdminTeacherRecord[]>(STUB_TEACHERS);
  const [allStudents, setAllStudents] = useState<AdminStudentRecord[]>(STUB_ALL_STUDENTS);

  // ── Teacher management ────────────────────────────────────────────────────

  // 🔧 STUB — replace with PATCH /api/admin/teachers/:id
  const promoteTeacher = useCallback(async (input: PromoteTeacherInput): Promise<AdminTeacherRecord> => {
    let updated!: AdminTeacherRecord;
    setAllTeachers(prev => prev.map(t => {
      if (t.id !== input.teacher_id) return t;
      updated = { ...t, is_admin: input.is_admin };
      return updated;
    }));
    return updated;
  }, []);

  // 🔧 STUB — replace with DELETE /api/admin/teachers/:id
  const deleteTeacher = useCallback(async (teacherId: number): Promise<void> => {
    setAllTeachers(prev => prev.filter(t => t.id !== teacherId));
    setAllStudents(prev => prev.filter(s => s.teacher_id !== teacherId));
  }, []);

  // ── Student management ────────────────────────────────────────────────────

  // 🔧 STUB — replace with POST /api/admin/students
  const createStudent = useCallback(async (input: CreateStudentInput): Promise<AdminStudentRecord> => {
    const newStudent: AdminStudentRecord = {
      id: Date.now(),
      teacher_id: input.teacher_id,
      display_name: input.display_name,
      username: input.username,
      email: null,
      created_at: new Date().toISOString(),
    };
    setAllStudents(prev => [...prev, newStudent]);
    return newStudent;
  }, []);

  // 🔧 STUB — replace with POST /api/admin/courses/:courseId/enroll
  const enrollStudent = useCallback(async (_input: EnrollStudentInput): Promise<void> => {
    // TODO: add to course_enrollments, then refresh student list for that course
  }, []);

  // 🔧 STUB — replace with DELETE /api/admin/courses/:courseId/students/:studentId
  const unenrollStudent = useCallback(async (_studentId: number, _courseId: number): Promise<void> => {
    // TODO: remove from course_enrollments
  }, []);

  // 🔧 STUB — replace with DELETE /api/admin/students/:id (GDPR purge)
  const deleteStudent = useCallback(async (studentId: number): Promise<void> => {
    setAllStudents(prev => prev.filter(s => s.id !== studentId));
  }, []);

  // 🔧 STUB — replace with POST /api/admin/students/:id/reset-password
  const resetStudentPasswordAdmin = useCallback(async (_studentId: number) => {
    return { temporary_password: "admin-reset-9999" };
  }, []);

  // ── Cross-teacher course access ───────────────────────────────────────────

  // 🔧 STUB — replace with GET /api/admin/courses
  const getAllCourses = useCallback(async (): Promise<Course[]> => {
    return teacher.courses; // currently only one teacher's worth in demo
  }, [teacher.courses]);

  // 🔧 STUB — replace with PATCH /api/admin/courses/:id/reassign
  const reassignCourse = useCallback(async (courseId: number, newTeacherId: number): Promise<Course> => {
    const course = teacher.courses.find(c => c.id === courseId);
    if (!course) throw new Error("Course not found");
    return { ...course, teacher_id: newTeacherId };
  }, [teacher.courses]);

  // ── Cross-teacher assignment access ──────────────────────────────────────

  // 🔧 STUB — replace with GET /api/admin/assignments
  const getAllAssignments = useCallback(async (): Promise<Assignment[]> => {
    return teacher.assignments;
  }, [teacher.assignments]);

  // 🔧 STUB — replace with POST /api/admin/teachers/:teacherId/assignments
  const createAssignmentForTeacher = useCallback(async (_teacherId: number, input: CreateAssignmentInput): Promise<Assignment> => {
    return teacher.createAssignment(input);
  }, [teacher]);

  // 🔧 STUB — replace with PATCH /api/admin/assignments/:id
  const updateAnyAssignment = useCallback(async (input: UpdateAssignmentInput): Promise<Assignment> => {
    return teacher.updateAssignment(input);
  }, [teacher]);

  // 🔧 STUB — replace with DELETE /api/admin/assignments/:id
  const deleteAnyAssignment = useCallback(async (assignmentId: number): Promise<void> => {
    return teacher.deleteAssignment(assignmentId);
  }, [teacher]);

  // ── Cross-teacher material access ─────────────────────────────────────────

  // 🔧 STUB — replace with GET /api/admin/materials
  const getAllMaterials = useCallback(async (): Promise<CourseMaterial[]> => {
    return teacher.materials;
  }, [teacher.materials]);

  // 🔧 STUB — replace with POST /api/admin/teachers/:teacherId/materials
  const uploadMaterialForTeacher = useCallback(async (_teacherId: number, input: UploadMaterialInput): Promise<CourseMaterial> => {
    return teacher.uploadMaterial(input);
  }, [teacher]);

  // 🔧 STUB — replace with DELETE /api/admin/materials/:id
  const deleteAnyMaterial = useCallback(async (materialId: number): Promise<void> => {
    return teacher.deleteMaterial(materialId);
  }, [teacher]);

  // ── Submissions ───────────────────────────────────────────────────────────

  // 🔧 STUB — replace with GET /api/admin/assignments/:id/submissions
  const getAllSubmissions = useCallback(async (assignmentId: number): Promise<Submission[]> => {
    return teacher.getSubmissions(assignmentId);
  }, [teacher]);

  // ── Platform-wide chat audit ──────────────────────────────────────────────

  // 🔧 STUB — replace with GET /api/admin/chat?teacherId=&studentId=&flaggedOnly=&since=
  const getPlatformChatLog = useCallback(async (_filters?: {
    teacherId?: number;
    studentId?: number;
    assignmentId?: number;
    flaggedOnly?: boolean;
    since?: string;
  }): Promise<PlatformAuditEntry[]> => {
    return [];
  }, []);

  // ── Student documents ─────────────────────────────────────────────────────

  // 🔧 STUB — replace with GET /api/admin/students/:id/documents
  const getStudentDocuments = useCallback(async (_studentId: number): Promise<AdminStudentDocument[]> => {
    return [];
  }, []);

  // 🔧 STUB — replace with DELETE /api/admin/documents/:id
  const deleteStudentDocument = useCallback(async (_documentId: number): Promise<void> => {
    // TODO: remove from storage + DB, delete chunks
  }, []);

  // ── Workspace version history ─────────────────────────────────────────────

  // 🔧 STUB — replace with GET /api/admin/files/:fileId/versions
  const getFileVersions = useCallback(async (_fileId: number): Promise<WorkspaceFileVersion[]> => {
    return [];
  }, []);

  // 🔧 STUB — replace with POST /api/admin/files/:fileId/restore/:versionId
  const restoreFileVersion = useCallback(async (_fileId: number, _versionId: number): Promise<void> => {
    // TODO: copy version content back into workspace_files
  }, []);

  // ── Test answers ──────────────────────────────────────────────────────────

  // 🔧 STUB — replace with GET /api/admin/submissions/:id/answers
  const getAnswers = useCallback(async (_submissionId: number): Promise<AdminAnswer[]> => {
    return [];
  }, []);

  // ── Feedback (cross-class) ────────────────────────────────────────────────

  // 🔧 STUB — replace with GET /api/admin/assignments/:id/feedback
  const getAllFeedback = useCallback(async (assignmentId: number): Promise<Feedback[]> => {
    return teacher.getFeedback(assignmentId).then(f => (f ? [f] : []));
  }, [teacher]);

  // ── Class analyses ────────────────────────────────────────────────────────

  // 🔧 STUB — replace with GET /api/admin/assignments/:id/analyses
  const getAllAnalyses = useCallback(async (assignmentId: number): Promise<ClassAnalysis[]> => {
    const a = await teacher.getClassAnalysis(assignmentId);
    return a ? [a] : [];
  }, [teacher]);

  // ── Canvases ──────────────────────────────────────────────────────────────

  // 🔧 STUB — replace with GET /api/admin/canvases?teacherId=
  const getAllCanvases = useCallback(async (_teacherId?: number): Promise<Canvas[]> => {
    return teacher.canvases;
  }, [teacher.canvases]);

  // ── Chunk stats ───────────────────────────────────────────────────────────

  // 🔧 STUB — replace with GET /api/admin/materials/:id/chunks/stats
  const getChunkStats = useCallback(async (materialId: number): Promise<ChunkStats> => {
    return { material_id: materialId, student_document_id: null, total_chunks: 0, failed_chunks: 0 };
  }, []);

  // ── Student chat log (any student) ───────────────────────────────────────

  // 🔧 STUB — replace with GET /api/admin/students/:studentId/chat?assignment_id=
  const getStudentChatLog = useCallback(async (studentId: number, assignmentId?: number): Promise<ChatMessage[]> => {
    return teacher.getChatLog(studentId, assignmentId ?? 0);
  }, [teacher]);

  // ─────────────────────────────────────────────────────────────────────────

  return {
    admin: STUB_ADMIN,
    teacher,
    platformStats: STUB_PLATFORM_STATS,
    allTeachers,
    promoteTeacher,
    deleteTeacher,
    allStudents,
    createStudent,
    enrollStudent,
    unenrollStudent,
    deleteStudent,
    resetStudentPasswordAdmin,
    getAllCourses,
    reassignCourse,
    getAllAssignments,
    createAssignmentForTeacher,
    updateAnyAssignment,
    deleteAnyAssignment,
    getAllMaterials,
    uploadMaterialForTeacher,
    deleteAnyMaterial,
    getAllSubmissions,
    getPlatformChatLog,
    getStudentDocuments,
    deleteStudentDocument,
    getFileVersions,
    restoreFileVersion,
    getAnswers,
    getAllFeedback,
    getAllAnalyses,
    getAllCanvases,
    getChunkStats,
    getStudentChatLog,
  };
}
