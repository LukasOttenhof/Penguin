// useStudentViewModel.ts
// Central hook for all student state and actions.
// Each API call is marked:
//   🔧 STUB — returns demo data; swap for a real fetch() when the route is built
import { useState, useCallback, useMemo } from "react";
import type {
  StudentProfile,
  StudentCourse,
  StudentAssignment,
  StudentQuestion,
  StudentSubmission,
  StudentWorkspaceFile,
  StudentAnswer,
  StudentFeedback,
  StudentChatMessage,
  StudentCourseMaterial,
  ScheduleItem,
  AssistantMode,
} from "./student.types";

// ─── Stub demo data ───────────────────────────────────────────────────────────

const STUB_PROFILE: StudentProfile = {
  id: 1,
  display_name: "Amelia B.",
  username: "amelia.b8",
  created_at: "2026-09-02T00:00:00.000Z",
};

const STUB_COURSES: StudentCourse[] = [
  {
    id: 1,
    name: "Science · Period 2",
    grade: 8,
    teacher: { id: 1, first_name: "Alex", last_name: "Taylor" },
    enrolled_at: "2026-09-02T00:00:00.000Z",
  },
];

// Only published assignments — no drafts, no canvas_id
const STUB_ASSIGNMENTS: StudentAssignment[] = [
  {
    id: 1,
    course_id: 1,
    kind: "assignment",
    title: "A closer look at cells",
    instructions: "Compare plant and animal cells. Write a hypothesis, describe your observations, and explain how each structure supports the cell. Use evidence from your class material.",
    rubric: null,
    assistant_mode: "hints",
    time_limit_minutes: null,
    due_at: null,
    published_at: "2026-09-10T00:00:00.000Z",
  },
];

const STUB_MATERIALS: StudentCourseMaterial[] = [
  {
    id: 1,
    course_id: 1,
    file_name: "Cells and Systems — Unit Notes.pdf",
    mime_type: "application/pdf",
    unit: "Gr 8 cells",
    ingest_status: "ready",
    uploaded_at: "2026-09-03T00:00:00.000Z",
  },
];

// ─── Input shapes ─────────────────────────────────────────────────────────────

export interface SendMessageInput {
  assignment_id: number | null;
  content: string;
}

export interface SaveFileInput {
  submission_id: number;
  name: string;
  content: Record<string, unknown>;
}

export interface SubmitAnswerInput {
  submission_id: number;
  question_id: number;
  response: unknown;
}

// ─── The viewmodel ────────────────────────────────────────────────────────────

export interface StudentViewModel {
  // ── Identity ──
  profile: StudentProfile;

  // ── Courses + schedule ──
  courses: StudentCourse[];
  /** All upcoming assignments with a due date, sorted earliest first. */
  schedule: ScheduleItem[];

  // ── Assignments ──
  /** Published assignments across all enrolled courses. */
  assignments: StudentAssignment[];
  getAssignmentsForCourse: (courseId: number) => StudentAssignment[];
  getQuestions: (assignmentId: number) => Promise<StudentQuestion[]>;

  // ── Submissions ──
  /** Start or resume a submission for an assignment. */
  openSubmission: (assignmentId: number) => Promise<StudentSubmission>;
  submitWork: (submissionId: number) => Promise<StudentSubmission>;
  getSubmission: (assignmentId: number) => StudentSubmission | null;

  // ── Workspace files ──
  getFiles: (submissionId: number) => Promise<StudentWorkspaceFile[]>;
  saveFile: (input: SaveFileInput) => Promise<StudentWorkspaceFile>;

  // ── Test answers ──
  submitAnswer: (input: SubmitAnswerInput) => Promise<StudentAnswer>;

  // ── Feedback (approved only) ──
  getFeedback: (submissionId: number) => Promise<StudentFeedback | null>;

  // ── Chat assistant ──
  chatHistory: StudentChatMessage[];
  sendMessage: (input: SendMessageInput) => Promise<StudentChatMessage>;
  clearChat: () => void;

  // ── Course materials (read-only) ──
  getMaterials: (courseId: number) => StudentCourseMaterial[];
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useStudentViewModel(): StudentViewModel {
  const [submissions, setSubmissions] = useState<StudentSubmission[]>([]);
  const [chatHistory, setChatHistory] = useState<StudentChatMessage[]>([]);

  // ── Schedule ──────────────────────────────────────────────────────────────

  const schedule = useMemo<ScheduleItem[]>(() => {
    return STUB_ASSIGNMENTS
      .filter(a => a.due_at !== null)
      .map(a => {
        const course = STUB_COURSES.find(c => c.id === a.course_id);
        const submission = submissions.find(s => s.assignment_id === a.id);
        return {
          assignment_id: a.id,
          assignment_title: a.title,
          course_id: a.course_id,
          course_name: course?.name ?? "",
          due_at: a.due_at!,
          status: submission?.status ?? "in_progress",
        };
      })
      .sort((a, b) => new Date(a.due_at).getTime() - new Date(b.due_at).getTime());
  }, [submissions]);

  // ── Assignments ───────────────────────────────────────────────────────────

  const getAssignmentsForCourse = useCallback((courseId: number): StudentAssignment[] => {
    return STUB_ASSIGNMENTS.filter(a => a.course_id === courseId);
  }, []);

  // 🔧 STUB — replace with GET /api/assignments/:id/questions
  const getQuestions = useCallback(async (_assignmentId: number): Promise<StudentQuestion[]> => {
    return [];
  }, []);

  // ── Submissions ───────────────────────────────────────────────────────────

  const getSubmission = useCallback((assignmentId: number): StudentSubmission | null => {
    return submissions.find(s => s.assignment_id === assignmentId) ?? null;
  }, [submissions]);

  // 🔧 STUB — replace with POST /api/submissions (idempotent — returns existing if already open)
  const openSubmission = useCallback(async (assignmentId: number): Promise<StudentSubmission> => {
    const existing = submissions.find(s => s.assignment_id === assignmentId);
    if (existing) return existing;
    const newSub: StudentSubmission = {
      id: Date.now(),
      assignment_id: assignmentId,
      status: "in_progress",
      started_at: new Date().toISOString(),
      submitted_at: null,
      score: null,
    };
    setSubmissions(prev => [...prev, newSub]);
    return newSub;
  }, [submissions]);

  // 🔧 STUB — replace with POST /api/submissions/:id/submit
  const submitWork = useCallback(async (submissionId: number): Promise<StudentSubmission> => {
    let updated!: StudentSubmission;
    setSubmissions(prev => prev.map(s => {
      if (s.id !== submissionId) return s;
      updated = { ...s, status: "submitted", submitted_at: new Date().toISOString() };
      return updated;
    }));
    return updated;
  }, []);

  // ── Workspace files ───────────────────────────────────────────────────────

  // 🔧 STUB — replace with GET /api/submissions/:id/files
  const getFiles = useCallback(async (_submissionId: number): Promise<StudentWorkspaceFile[]> => {
    return [];
  }, []);

  // 🔧 STUB — replace with PUT /api/submissions/:id/files/:name
  const saveFile = useCallback(async (input: SaveFileInput): Promise<StudentWorkspaceFile> => {
    return {
      id: Date.now(),
      submission_id: input.submission_id,
      name: input.name,
      content: input.content,
      updated_at: new Date().toISOString(),
    };
  }, []);

  // ── Test answers ──────────────────────────────────────────────────────────

  // 🔧 STUB — replace with POST /api/submissions/:id/answers
  const submitAnswer = useCallback(async (input: SubmitAnswerInput): Promise<StudentAnswer> => {
    return {
      submission_id: input.submission_id,
      question_id: input.question_id,
      response: input.response,
      answered_at: new Date().toISOString(),
    };
  }, []);

  // ── Feedback ──────────────────────────────────────────────────────────────

  // 🔧 STUB — replace with GET /api/submissions/:id/feedback
  // Server only returns this when status = 'approved'; returns 404 otherwise.
  const getFeedback = useCallback(async (_submissionId: number): Promise<StudentFeedback | null> => {
    return null;
  }, []);

  // ── Chat ──────────────────────────────────────────────────────────────────

  // 🔧 STUB — replace with POST /api/chat
  const sendMessage = useCallback(async (input: SendMessageInput): Promise<StudentChatMessage> => {
    const userMsg: StudentChatMessage = {
      id: Date.now(),
      assignment_id: input.assignment_id,
      role: "user",
      content: input.content,
      assistant_mode: null,
      flagged: false,
      created_at: new Date().toISOString(),
    };
    const assistantMsg: StudentChatMessage = {
      id: Date.now() + 1,
      assignment_id: input.assignment_id,
      role: "assistant",
      content: "The AI assistant isn't connected yet. Your message was received.",
      assistant_mode: null,
      flagged: false,
      created_at: new Date().toISOString(),
    };
    setChatHistory(prev => [...prev, userMsg, assistantMsg]);
    return assistantMsg;
  }, []);

  const clearChat = useCallback(() => setChatHistory([]), []);

  // ── Course materials ──────────────────────────────────────────────────────

  // 🔧 STUB — replace with GET /api/courses/:id/materials
  const getMaterials = useCallback((courseId: number): StudentCourseMaterial[] => {
    return STUB_MATERIALS.filter(m => m.course_id === courseId);
  }, []);

  // ─────────────────────────────────────────────────────────────────────────

  return {
    profile: STUB_PROFILE,
    courses: STUB_COURSES,
    schedule,
    assignments: STUB_ASSIGNMENTS,
    getAssignmentsForCourse,
    getQuestions,
    openSubmission,
    submitWork,
    getSubmission,
    getFiles,
    saveFile,
    submitAnswer,
    getFeedback,
    chatHistory,
    sendMessage,
    clearChat,
    getMaterials,
  };
}
