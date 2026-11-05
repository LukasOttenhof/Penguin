// Admin domain types — the admin sees everything a teacher sees, plus cross-teacher
// visibility across the whole platform.
//
// Rules enforced here:
//   • password_hash — NEVER included, not even for admins
//   • answer_key    — NEVER included (stays server-side only)
//   • Everything else is visible: all teachers, all students, all courses,
//     all submissions, all chat logs, all documents, version history, audit stats
//
// Admins share the teacher login; is_admin === true on their Teacher record.
// The frontend checks is_admin and instantiates useAdminViewModel instead of
// useTeacherViewModel.

// ─── Re-export teacher types that admins also use ────────────────────────────
// Admins see all Teacher, Course, Assignment, etc. records — same shape, wider scope.
export type {
  Teacher,
  Course,
  Assignment,
  AssistantMode,
  AssignmentKind,
  Question,
  RubricCriterion,
  CourseMaterial,
  IngestStatus,
  Submission,
  SubmissionStatus,
  WorkspaceFile,
  Feedback,
  FeedbackStatus,
  ChatMessage,
  ChatRole,
  ClassAnalysis,
  ClassAnalysisSummary,
  Canvas,
} from "../teacher/teacher.types";

// ─── Admin-only: full teacher roster ─────────────────────────────────────────

/**
 * A teacher record as seen by an admin.
 * password_hash is still never included.
 * is_admin is visible so admins can see who else has admin access.
 */
export interface AdminTeacherRecord {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  is_admin: boolean;
  created_at: string;
  /** Convenience counts — computed by the server, not stored columns. */
  course_count: number;
  student_count: number;
}

// ─── Admin-only: full student roster ─────────────────────────────────────────

/**
 * A student record as seen by an admin — cross-teacher visibility.
 * email is included here (nullable) since admins need it for support/GDPR requests.
 * password_hash is still never included.
 */
export interface AdminStudentRecord {
  id: number;
  teacher_id: number; // which teacher created this student
  display_name: string;
  username: string;
  email: string | null; // nullable per schema; admins can see it for GDPR/support
  created_at: string;
}

// ─── Admin-only: student documents ───────────────────────────────────────────

/**
 * A student's private upload — admins can see these for privacy oversight/audit.
 * Teachers cannot see another teacher's students' documents.
 * storage_path is included for admins (needed for deletion/recovery).
 */
export interface AdminStudentDocument {
  id: number;
  student_id: number;
  file_name: string;
  mime_type: string;
  storage_path: string; // admins need this for storage management
  size_bytes: number;
  ingest_status: "pending" | "processing" | "ready" | "failed";
  uploaded_at: string;
}

// ─── Admin-only: document chunk stats ────────────────────────────────────────

/**
 * Aggregate chunk statistics — admins monitor vector store health.
 * Raw chunk content is NOT exposed (privacy); only counts and status.
 */
export interface ChunkStats {
  material_id: number | null;
  student_document_id: number | null;
  total_chunks: number;
  failed_chunks: number;
}

// ─── Admin-only: workspace file versions ─────────────────────────────────────

/** A historical version of a student's workspace file. Admins can access for audit/recovery. */
export interface WorkspaceFileVersion {
  id: number;
  file_id: number;
  content: Record<string, unknown>;
  saved_at: string;
}

// ─── Admin-only: answers (test responses) ────────────────────────────────────

/** A student's answer to a test question — full cross-class visibility for admins. */
export interface AdminAnswer {
  submission_id: number;
  question_id: number;
  response: unknown;
  answered_at: string;
}

// ─── Admin-only: platform audit log ──────────────────────────────────────────

/**
 * A rolled-up platform audit event.
 * Admins see all AI interactions across every teacher and student.
 * This is a view/derived type — built from chat_messages + moderation flags.
 */
export interface PlatformAuditEntry {
  id: number;
  student_id: number;
  teacher_id: number; // resolved via course → assignment → teacher
  assignment_id: number | null;
  role: "user" | "assistant";
  content: string;
  assistant_mode: "off" | "hints" | "explain" | "open" | null;
  flagged: boolean;
  created_at: string;
}

// ─── Admin-only: platform stats ──────────────────────────────────────────────

/**
 * High-level platform summary shown on the admin dashboard.
 * All counts are server-computed — not stored in any single table.
 */
export interface PlatformStats {
  total_teachers: number;
  total_students: number;
  total_courses: number;
  total_assignments: number;
  total_submissions: number;
  total_chat_messages: number;
  flagged_messages_last_7_days: number;
  storage_bytes_used: number;
}

// ─── Admin identity ───────────────────────────────────────────────────────────

/**
 * The authenticated admin.
 * Same shape as Teacher but is_admin is guaranteed true.
 */
export interface AdminProfile {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  is_admin: true; // always true — narrowed from Teacher
  created_at: string;
}
