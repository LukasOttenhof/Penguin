// Student domain types — matched to the DB schema in apps/api/src/db/init.sql.
// These are DIFFERENT from teacher.types.ts — not a subset, but genuinely
// different shapes that reflect what the server will actually send a student.
//
// Rules enforced here:
//   • No password_hash on any type (same as teacher)
//   • No answer_key on questions (same as teacher)
//   • No join_code on courses — students never see this
//   • No ai_draft on feedback — students only see teacher_final after approval
//   • No canvas, class_analyses, or other teacher-only tables
//   • Assignments: published only (published_at always present), no canvas_id
//   • Other students are invisible — a student never sees a peer's data
//   • Teacher is visible by first+last name only, not email

// ─── Identity ─────────────────────────────────────────────────────────────────

/** The logged-in student's own profile. */
export interface StudentProfile {
  id: number;
  /** First name + last initial only, e.g. "Amelia B." — no full surname collected. */
  display_name: string;
  username: string;
  created_at: string; // ISO-8601
}

/** A teacher as a student sees them — name only, no email. */
export interface TeacherSummary {
  id: number;
  first_name: string;
  last_name: string;
}

// ─── Courses ─────────────────────────────────────────────────────────────────

/**
 * A course as seen by an enrolled student.
 * join_code is intentionally absent — students already joined; they must not
 * be able to share or re-use it.
 */
export interface StudentCourse {
  id: number;
  name: string;
  grade: 8 | 9;
  teacher: TeacherSummary;
  enrolled_at: string;
}

// ─── Assignments ─────────────────────────────────────────────────────────────

export type AssistantMode = "off" | "hints" | "explain" | "open";

/**
 * An assignment as seen by a student.
 * - Only published assignments are ever returned (published_at is always set).
 * - canvas_id is omitted — that's internal teacher tooling.
 * - rubric is read-only; students see it to understand expectations.
 */
export interface StudentAssignment {
  id: number;
  course_id: number;
  kind: "assignment" | "test";
  title: string;
  instructions: string;
  /** Rubric shown so students understand the marking criteria. Read-only. */
  rubric: StudentRubricCriterion[] | null;
  assistant_mode: AssistantMode;
  /** Tests only. */
  time_limit_minutes: number | null;
  due_at: string | null;
  published_at: string; // always set — drafts are never sent to students
}

/** Rubric criterion as a student sees it — score labels and descriptors only. */
export interface StudentRubricCriterion {
  id: string;
  label: string;
  levels: Array<{
    score: number;
    descriptor: string;
  }>;
}

// ─── Questions ───────────────────────────────────────────────────────────────

/**
 * A question as seen by a student.
 * answer_key is never included — that lives server-side only.
 */
export interface StudentQuestion {
  id: number;
  assignment_id: number;
  position: number;
  question_type: "multiple_choice" | "short_answer" | "long_answer";
  prompt: string;
  options: string[] | null; // multiple choice only
  points: number;
}

// ─── Submissions ─────────────────────────────────────────────────────────────

export type SubmissionStatus = "in_progress" | "submitted" | "returned";

/**
 * A student's own submission.
 * Students only ever see their own — other students' submissions are invisible.
 */
export interface StudentSubmission {
  id: number;
  assignment_id: number;
  status: SubmissionStatus;
  started_at: string;
  submitted_at: string | null;
  /**
   * Score shown only after the teacher confirms it.
   * Never set automatically by AI per spec.
   */
  score: number | null;
}

// ─── Workspace files ─────────────────────────────────────────────────────────

/** A file in the student's own workspace. Students can read and write their own files. */
export interface StudentWorkspaceFile {
  id: number;
  submission_id: number;
  name: string;
  /** TipTap / ProseMirror editor JSON. */
  content: Record<string, unknown>;
  updated_at: string;
}

// ─── Answers (tests) ─────────────────────────────────────────────────────────

/** A student's answer to a test question. */
export interface StudentAnswer {
  submission_id: number;
  question_id: number;
  /** Flexible jsonb — string for short/long answer, index for multiple choice. */
  response: unknown;
  answered_at: string;
}

// ─── Feedback ────────────────────────────────────────────────────────────────

/**
 * Feedback shown to a student.
 * - ai_draft is NEVER included — students only see what the teacher approved.
 * - Only returned when status === 'approved'; the server withholds draft feedback.
 */
export interface StudentFeedback {
  id: number;
  submission_id: number;
  /** The teacher-written final feedback. Only shown after approval. */
  teacher_final: string;
  /** Misconception tags the teacher confirmed — shown as learning hints. */
  misconception_tags: string[];
  approved_at: string;
}

// ─── Chat messages ────────────────────────────────────────────────────────────

export type ChatRole = "user" | "assistant";

/**
 * A message in the student's own assistant conversation.
 * Students only ever see their own messages — never another student's log.
 */
export interface StudentChatMessage {
  id: number;
  assignment_id: number | null;
  role: ChatRole;
  content: string;
  assistant_mode: AssistantMode | null;
  /**
   * flagged is included so the UI can show a "this message was reviewed" notice,
   * but the student cannot filter or act on it — that's teacher-only.
   */
  flagged: boolean;
  created_at: string;
}

// ─── Course material (read-only) ─────────────────────────────────────────────

export type IngestStatus = "pending" | "processing" | "ready" | "failed";

/**
 * A course material file visible to an enrolled student.
 * storage_path is omitted — students access files through a signed URL endpoint,
 * never via a raw path.
 * teacher_id and size_bytes are omitted — not relevant to the student.
 */
export interface StudentCourseMaterial {
  id: number;
  course_id: number;
  file_name: string;
  mime_type: string;
  /** Curriculum unit tag, e.g. "Gr 8 cells". */
  unit: string | null;
  ingest_status: IngestStatus;
  uploaded_at: string;
}

// ─── Schedule view ────────────────────────────────────────────────────────────

/**
 * A lightweight upcoming-item for the student's schedule/dashboard.
 * Derived from assignments across all enrolled courses — due_at + course name.
 */
export interface ScheduleItem {
  assignment_id: number;
  assignment_title: string;
  course_id: number;
  course_name: string;
  due_at: string; // only items WITH a due date appear in the schedule
  status: SubmissionStatus;
}
