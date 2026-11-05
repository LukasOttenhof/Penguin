// Teacher domain types — matched 1-to-1 with the DB schema in apps/api/src/db/init.sql.
// Each type only exposes what a teacher is allowed to see.
// Fields that are never sent to any client (password_hash, answer_key) are omitted entirely.

// ─── Auth ────────────────────────────────────────────────────────────────────

/** The authenticated teacher. Returned by GET /api/me (teacher session). */
export interface Teacher {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  created_at: string; // ISO-8601
}

// ─── Courses (= classrooms) ───────────────────────────────────────────────────

/** A course owned by this teacher. join_code is shown so the teacher can share it. */
export interface Course {
  id: number;
  teacher_id: number;
  name: string;
  grade: 8 | 9;
  join_code: string; // teacher shares this; students use it to enroll
  created_at: string;
}

// ─── Students ────────────────────────────────────────────────────────────────

/**
 * A student as seen by the teacher.
 * - password_hash is never included.
 * - email is omitted: the spec says students 13-15 provide display name only.
 */
export interface CourseStudent {
  id: number;
  display_name: string;
  username: string;
  created_at: string;
  /** When this student joined this specific course. From course_enrollments. */
  enrolled_at: string;
}

// ─── Course material ─────────────────────────────────────────────────────────

export type IngestStatus = "pending" | "processing" | "ready" | "failed";

/** A document uploaded by the teacher for a course (or their general library). */
export interface CourseMaterial {
  id: number;
  teacher_id: number;
  /** null means the file belongs to the teacher's general library, not a specific course. */
  course_id: number | null;
  file_name: string;
  mime_type: string;
  storage_path: string;
  size_bytes: number;
  /** Tag grouping material into a curriculum unit, e.g. "Gr 8 cells". */
  unit: string | null;
  ingest_status: IngestStatus;
  uploaded_at: string;
}

// ─── Assignments ─────────────────────────────────────────────────────────────

export type AssistantMode = "off" | "hints" | "explain" | "open";
export type AssignmentKind = "assignment" | "test";

/**
 * A question as the teacher sees it.
 * answer_key is intentionally excluded — it lives only on the server
 * and is never sent to the browser (teacher or student).
 */
export interface Question {
  id: number;
  assignment_id: number;
  position: number;
  question_type: "multiple_choice" | "short_answer" | "long_answer";
  prompt: string;
  /** Multiple-choice options, null for other types. */
  options: string[] | null;
  points: number;
}

/** A single rubric criterion with scored levels. Stored as jsonb in the DB. */
export interface RubricCriterion {
  id: string; // client-generated UUID
  label: string; // e.g. "Scientific reasoning"
  levels: Array<{
    score: number;       // e.g. 4, 3, 2, 1
    descriptor: string;  // e.g. "Clearly supported with evidence"
  }>;
}

export interface Assignment {
  id: number;
  course_id: number;
  /** Which canvas session spawned this assignment, if any. */
  canvas_id: number | null;
  kind: AssignmentKind;
  title: string;
  instructions: string;
  /** Rubric criteria table. null until the teacher builds one. */
  rubric: RubricCriterion[] | null;
  assistant_mode: AssistantMode;
  /** Tests only: maximum allowed minutes. */
  time_limit_minutes: number | null;
  due_at: string | null;   // ISO-8601 or null
  /** null = draft (not visible to students). Set when teacher publishes. */
  published_at: string | null;
  created_at: string;
}

// ─── Submissions ─────────────────────────────────────────────────────────────

export type SubmissionStatus = "in_progress" | "submitted" | "returned";

/** A student's submission for an assignment. */
export interface Submission {
  id: number;
  assignment_id: number;
  student_id: number;
  status: SubmissionStatus;
  started_at: string;
  submitted_at: string | null;
  /** Teacher-confirmed score only. Never set automatically by AI. */
  score: number | null;
}

// ─── Workspace files (teacher read-only view) ─────────────────────────────────

/**
 * A file in a student's workspace.
 * Teachers have read-only access per spec; there is no write action here.
 */
export interface WorkspaceFile {
  id: number;
  submission_id: number;
  name: string;
  /** TipTap / ProseMirror editor JSON stored as jsonb. */
  content: Record<string, unknown>;
  updated_at: string;
}

// ─── Feedback ────────────────────────────────────────────────────────────────

export type FeedbackStatus = "draft" | "approved";

/**
 * AI-generated feedback draft that the teacher edits and approves before
 * students ever see it. No AI-assigned grade is released automatically.
 */
export interface Feedback {
  id: number;
  submission_id: number;
  /** Raw AI draft. Teacher reads this, then writes teacher_final. */
  ai_draft: string | null;
  /** What actually gets shown to the student — only set after teacher edits. */
  teacher_final: string | null;
  misconception_tags: string[];
  status: FeedbackStatus;
  approved_at: string | null;
  created_at: string;
}

// ─── Chat messages (teacher audit view) ──────────────────────────────────────

export type ChatRole = "user" | "assistant";

/**
 * A single message in a student–assistant conversation.
 * Every conversation is logged and visible to the teacher per spec.
 */
export interface ChatMessage {
  id: number;
  student_id: number;
  assignment_id: number | null;
  role: ChatRole;
  content: string;
  /** The assistant_mode that was active when this message was sent. */
  assistant_mode: AssistantMode | null;
  /** true if this message tripped the content moderation filter. */
  flagged: boolean;
  created_at: string;
}

// ─── Class analysis ──────────────────────────────────────────────────────────

/** Shape of the jsonb summary stored in class_analyses. */
export interface ClassAnalysisSummary {
  misconception_clusters: Array<{
    tag: string;
    student_ids: number[];
    example_evidence: string;
  }>;
  rubric_distribution: Array<{
    criterion_label: string;
    scores: Record<string, number>; // score → count
  }>;
  chat_insights: {
    most_asked_questions: string[];
    stuck_student_ids: number[];
    over_reliance_student_ids: number[];
  };
}

export interface ClassAnalysis {
  id: number;
  assignment_id: number;
  summary: ClassAnalysisSummary;
  created_at: string;
}

// ─── Canvas ───────────────────────────────────────────────────────────────────

/**
 * A teacher's infinite canvas session.
 * Teachers only ever see their own canvases — course_id scopes it to a class.
 */
export interface Canvas {
  id: number;
  teacher_id: number;
  course_id: number | null;
  title: string;
  /** Excalidraw (or equivalent) scene JSON, stored as jsonb. */
  state: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}
