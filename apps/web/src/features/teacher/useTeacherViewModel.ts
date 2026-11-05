// useTeacherViewModel.ts
// Central hook for all teacher state and actions.
// Each section that talks to the API is marked:
//   ✅ LIVE   — real API call exists
//   🔧 STUB   — returns demo data; swap for a real fetch() when the route is built
import { useState, useCallback } from "react";
import type {
  Teacher,
  Course,
  CourseStudent,
  CourseMaterial,
  Assignment,
  AssistantMode,
  AssignmentKind,
  RubricCriterion,
  Submission,
  Feedback,
  ChatMessage,
  ClassAnalysis,
  Canvas,
} from "./teacher.types";

// ─── Stub demo data ───────────────────────────────────────────────────────────
// Remove these once the corresponding API routes are live.

const STUB_TEACHER: Teacher = {
  id: 1,
  first_name: "Alex",
  last_name: "Taylor",
  email: "alex.taylor@demo.school",
  is_admin: false,
  created_at: "2026-09-01T00:00:00.000Z",
};

const STUB_COURSES: Course[] = [
  { id: 1, teacher_id: 1, name: "Science · Period 2", grade: 8, join_code: "CELLS-001", created_at: "2026-09-01T00:00:00.000Z" },
  { id: 2, teacher_id: 1, name: "Science · Period 4", grade: 9, join_code: "ELEC-002", created_at: "2026-09-01T00:00:00.000Z" },
];

const STUB_STUDENTS: Record<number, CourseStudent[]> = {
  1: [
    { id: 1, display_name: "Amelia B.", username: "amelia.b8", created_at: "2026-09-02T00:00:00.000Z", enrolled_at: "2026-09-02T00:00:00.000Z" },
    { id: 2, display_name: "Ethan C.",  username: "ethan.c8",  created_at: "2026-09-02T00:00:00.000Z", enrolled_at: "2026-09-02T00:00:00.000Z" },
    { id: 3, display_name: "Isla D.",   username: "isla.d8",   created_at: "2026-09-02T00:00:00.000Z", enrolled_at: "2026-09-02T00:00:00.000Z" },
    { id: 4, display_name: "Liam K.",   username: "liam.k8",   created_at: "2026-09-02T00:00:00.000Z", enrolled_at: "2026-09-02T00:00:00.000Z" },
    { id: 5, display_name: "Maya L.",   username: "maya.l8",   created_at: "2026-09-02T00:00:00.000Z", enrolled_at: "2026-09-02T00:00:00.000Z" },
    { id: 6, display_name: "Noah M.",   username: "noah.m8",   created_at: "2026-09-02T00:00:00.000Z", enrolled_at: "2026-09-02T00:00:00.000Z" },
    { id: 7, display_name: "Oliver R.", username: "oliver.r8", created_at: "2026-09-02T00:00:00.000Z", enrolled_at: "2026-09-02T00:00:00.000Z" },
    { id: 8, display_name: "Sofia T.",  username: "sofia.t8",  created_at: "2026-09-02T00:00:00.000Z", enrolled_at: "2026-09-02T00:00:00.000Z" },
  ],
  2: [
    { id: 9,  display_name: "Aiden H.", username: "aiden.h9", created_at: "2026-09-02T00:00:00.000Z", enrolled_at: "2026-09-02T00:00:00.000Z" },
    { id: 10, display_name: "Chloe J.", username: "chloe.j9", created_at: "2026-09-02T00:00:00.000Z", enrolled_at: "2026-09-02T00:00:00.000Z" },
    { id: 11, display_name: "Emma N.",  username: "emma.n9",  created_at: "2026-09-02T00:00:00.000Z", enrolled_at: "2026-09-02T00:00:00.000Z" },
    { id: 12, display_name: "Lucas P.", username: "lucas.p9", created_at: "2026-09-02T00:00:00.000Z", enrolled_at: "2026-09-02T00:00:00.000Z" },
    { id: 13, display_name: "Mateo S.", username: "mateo.s9", created_at: "2026-09-02T00:00:00.000Z", enrolled_at: "2026-09-02T00:00:00.000Z" },
    { id: 14, display_name: "Zoe W.",   username: "zoe.w9",   created_at: "2026-09-02T00:00:00.000Z", enrolled_at: "2026-09-02T00:00:00.000Z" },
  ],
};

const STUB_ASSIGNMENTS: Assignment[] = [
  {
    id: 1, course_id: 1, canvas_id: null, kind: "assignment",
    title: "A closer look at cells",
    instructions: "Compare plant and animal cells. Write a hypothesis, describe your observations, and explain how each structure supports the cell. Use evidence from your class material.",
    rubric: null, assistant_mode: "hints", time_limit_minutes: null,
    due_at: null, published_at: "2026-09-10T00:00:00.000Z", created_at: "2026-09-05T00:00:00.000Z",
  },
  {
    id: 2, course_id: 2, canvas_id: null, kind: "assignment",
    title: "Build a better circuit",
    instructions: "Investigate how adding a bulb changes a series circuit. Record your prediction, procedure, observations, and conclusion.",
    rubric: null, assistant_mode: "explain", time_limit_minutes: null,
    due_at: null, published_at: "2026-09-10T00:00:00.000Z", created_at: "2026-09-05T00:00:00.000Z",
  },
];

// ─── Input shapes for create/update actions ───────────────────────────────────

export interface CreateAssignmentInput {
  course_id: number;
  kind: AssignmentKind;
  title: string;
  instructions: string;
  assistant_mode: AssistantMode;
  due_at: string | null;
  rubric: RubricCriterion[] | null;
  time_limit_minutes: number | null;
}

export interface UpdateAssignmentInput extends Partial<CreateAssignmentInput> {
  id: number;
}

export interface CreateCourseInput {
  name: string;
  grade: 8 | 9;
}

export interface UploadMaterialInput {
  course_id: number | null;
  file: File;
  unit: string | null;
}

// ─── The viewmodel ────────────────────────────────────────────────────────────

export interface TeacherViewModel {
  // ── Identity ──
  teacher: Teacher;

  // ── Courses ──
  courses: Course[];
  getStudents: (courseId: number) => CourseStudent[];
  createCourse: (input: CreateCourseInput) => Promise<Course>;
  removeStudent: (courseId: number, studentId: number) => Promise<void>;
  resetStudentPassword: (studentId: number) => Promise<{ temporary_password: string }>;

  // ── Assignments ──
  assignments: Assignment[];
  createAssignment: (input: CreateAssignmentInput) => Promise<Assignment>;
  updateAssignment: (input: UpdateAssignmentInput) => Promise<Assignment>;
  publishAssignment: (assignmentId: number) => Promise<Assignment>;
  deleteAssignment: (assignmentId: number) => Promise<void>;

  // ── Course materials ──
  materials: CourseMaterial[];
  uploadMaterial: (input: UploadMaterialInput) => Promise<CourseMaterial>;
  deleteMaterial: (materialId: number) => Promise<void>;

  // ── Submissions (read-only for teacher) ──
  getSubmissions: (assignmentId: number) => Promise<Submission[]>;

  // ── Feedback ──
  getFeedback: (submissionId: number) => Promise<Feedback | null>;
  saveFeedback: (submissionId: number, teacherFinal: string, tags: string[]) => Promise<Feedback>;
  approveFeedback: (submissionId: number) => Promise<Feedback>;

  // ── Chat logs (audit view) ──
  getChatLog: (studentId: number, assignmentId: number) => Promise<ChatMessage[]>;

  // ── Class analysis ──
  getClassAnalysis: (assignmentId: number) => Promise<ClassAnalysis | null>;

  // ── Canvas ──
  canvases: Canvas[];
  createCanvas: (title: string, courseId: number | null) => Promise<Canvas>;
  saveCanvas: (canvasId: number, state: Record<string, unknown>) => Promise<Canvas>;
  deleteCanvas: (canvasId: number) => Promise<void>;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useTeacherViewModel(): TeacherViewModel {
  const [courses, setCourses] = useState<Course[]>(STUB_COURSES);
  const [assignments, setAssignments] = useState<Assignment[]>(STUB_ASSIGNMENTS);
  const [materials, setMaterials] = useState<CourseMaterial[]>([]);
  const [canvases, setCanvases] = useState<Canvas[]>([]);

  // ── Courses ──────────────────────────────────────────────────────────────

  // 🔧 STUB — replace with GET /api/courses/:courseId/students
  const getStudents = useCallback((courseId: number): CourseStudent[] => {
    return STUB_STUDENTS[courseId] ?? [];
  }, []);

  // 🔧 STUB — replace with POST /api/courses
  const createCourse = useCallback(async (input: CreateCourseInput): Promise<Course> => {
    const newCourse: Course = {
      id: Date.now(),
      teacher_id: STUB_TEACHER.id,
      name: input.name,
      grade: input.grade,
      join_code: Math.random().toString(36).slice(2, 8).toUpperCase(),
      created_at: new Date().toISOString(),
    };
    setCourses(prev => [...prev, newCourse]);
    return newCourse;
  }, []);

  // 🔧 STUB — replace with DELETE /api/courses/:courseId/students/:studentId
  const removeStudent = useCallback(async (_courseId: number, _studentId: number): Promise<void> => {
    // TODO: call API, then refresh student list for the course
  }, []);

  // 🔧 STUB — replace with POST /api/students/:studentId/reset-password
  const resetStudentPassword = useCallback(async (_studentId: number) => {
    // TODO: call API; returns a one-time temporary password for the teacher to hand to the student
    return { temporary_password: "demo-reset-1234" };
  }, []);

  // ── Assignments ───────────────────────────────────────────────────────────

  // 🔧 STUB — replace with POST /api/assignments
  const createAssignment = useCallback(async (input: CreateAssignmentInput): Promise<Assignment> => {
    const newAssignment: Assignment = {
      id: Date.now(),
      canvas_id: null,
      published_at: null, // starts as draft
      created_at: new Date().toISOString(),
      ...input,
    };
    setAssignments(prev => [...prev, newAssignment]);
    return newAssignment;
  }, []);

  // 🔧 STUB — replace with PATCH /api/assignments/:id
  const updateAssignment = useCallback(async (input: UpdateAssignmentInput): Promise<Assignment> => {
    let updated!: Assignment;
    setAssignments(prev => prev.map(a => {
      if (a.id !== input.id) return a;
      updated = { ...a, ...input };
      return updated;
    }));
    return updated;
  }, []);

  // 🔧 STUB — replace with POST /api/assignments/:id/publish
  const publishAssignment = useCallback(async (assignmentId: number): Promise<Assignment> => {
    return updateAssignment({ id: assignmentId, published_at: new Date().toISOString() } as UpdateAssignmentInput);
  }, [updateAssignment]);

  // 🔧 STUB — replace with DELETE /api/assignments/:id
  const deleteAssignment = useCallback(async (assignmentId: number): Promise<void> => {
    setAssignments(prev => prev.filter(a => a.id !== assignmentId));
  }, []);

  // ── Course materials ──────────────────────────────────────────────────────

  // 🔧 STUB — replace with POST /api/materials (multipart/form-data)
  const uploadMaterial = useCallback(async (input: UploadMaterialInput): Promise<CourseMaterial> => {
    const newMaterial: CourseMaterial = {
      id: Date.now(),
      teacher_id: STUB_TEACHER.id,
      course_id: input.course_id,
      file_name: input.file.name,
      mime_type: input.file.type || "application/octet-stream",
      storage_path: "", // server sets this; empty in demo
      size_bytes: input.file.size,
      unit: input.unit,
      ingest_status: "pending",
      uploaded_at: new Date().toISOString(),
    };
    setMaterials(prev => [...prev, newMaterial]);
    return newMaterial;
  }, []);

  // 🔧 STUB — replace with DELETE /api/materials/:id
  const deleteMaterial = useCallback(async (materialId: number): Promise<void> => {
    setMaterials(prev => prev.filter(m => m.id !== materialId));
  }, []);

  // ── Submissions ───────────────────────────────────────────────────────────

  // 🔧 STUB — replace with GET /api/assignments/:id/submissions
  const getSubmissions = useCallback(async (_assignmentId: number): Promise<Submission[]> => {
    return [];
  }, []);

  // ── Feedback ──────────────────────────────────────────────────────────────

  // 🔧 STUB — replace with GET /api/submissions/:id/feedback
  const getFeedback = useCallback(async (_submissionId: number): Promise<Feedback | null> => {
    return null;
  }, []);

  // 🔧 STUB — replace with PUT /api/submissions/:id/feedback
  const saveFeedback = useCallback(async (submissionId: number, teacherFinal: string, tags: string[]): Promise<Feedback> => {
    return {
      id: Date.now(),
      submission_id: submissionId,
      ai_draft: null,
      teacher_final: teacherFinal,
      misconception_tags: tags,
      status: "draft",
      approved_at: null,
      created_at: new Date().toISOString(),
    };
  }, []);

  // 🔧 STUB — replace with POST /api/submissions/:id/feedback/approve
  const approveFeedback = useCallback(async (submissionId: number): Promise<Feedback> => {
    return {
      id: Date.now(),
      submission_id: submissionId,
      ai_draft: null,
      teacher_final: null,
      misconception_tags: [],
      status: "approved",
      approved_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    };
  }, []);

  // ── Chat logs ─────────────────────────────────────────────────────────────

  // 🔧 STUB — replace with GET /api/students/:studentId/chat?assignment_id=:assignmentId
  const getChatLog = useCallback(async (_studentId: number, _assignmentId: number): Promise<ChatMessage[]> => {
    return [];
  }, []);

  // ── Class analysis ────────────────────────────────────────────────────────

  // 🔧 STUB — replace with GET /api/assignments/:id/analysis
  const getClassAnalysis = useCallback(async (_assignmentId: number): Promise<ClassAnalysis | null> => {
    return null;
  }, []);

  // ── Canvas ────────────────────────────────────────────────────────────────

  // 🔧 STUB — replace with POST /api/canvases
  const createCanvas = useCallback(async (title: string, courseId: number | null): Promise<Canvas> => {
    const newCanvas: Canvas = {
      id: Date.now(),
      teacher_id: STUB_TEACHER.id,
      course_id: courseId,
      title,
      state: {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setCanvases(prev => [...prev, newCanvas]);
    return newCanvas;
  }, []);

  // 🔧 STUB — replace with PATCH /api/canvases/:id
  const saveCanvas = useCallback(async (canvasId: number, state: Record<string, unknown>): Promise<Canvas> => {
    let updated!: Canvas;
    setCanvases(prev => prev.map(c => {
      if (c.id !== canvasId) return c;
      updated = { ...c, state, updated_at: new Date().toISOString() };
      return updated;
    }));
    return updated;
  }, []);

  // 🔧 STUB — replace with DELETE /api/canvases/:id
  const deleteCanvas = useCallback(async (canvasId: number): Promise<void> => {
    setCanvases(prev => prev.filter(c => c.id !== canvasId));
  }, []);

  // ─────────────────────────────────────────────────────────────────────────

  return {
    teacher: STUB_TEACHER,
    courses,
    getStudents,
    createCourse,
    removeStudent,
    resetStudentPassword,
    assignments,
    createAssignment,
    updateAssignment,
    publishAssignment,
    deleteAssignment,
    materials,
    uploadMaterial,
    deleteMaterial,
    getSubmissions,
    getFeedback,
    saveFeedback,
    approveFeedback,
    getChatLog,
    getClassAnalysis,
    canvases,
    createCanvas,
    saveCanvas,
    deleteCanvas,
  };
}
