CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS teachers (
  id SERIAL PRIMARY KEY,
  first_name varchar(100) NOT NULL,
  last_name varchar(100) NOT NULL,
  email varchar(255) NOT NULL UNIQUE,
  password_hash text NOT NULL,

  is_admin boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);


CREATE TABLE IF NOT EXISTS students (
  id SERIAL PRIMARY KEY,
  teacher_id int NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  user_name varchar(100) NOT NULL UNIQUE,
  display_name varchar(100) NOT NULL, 
  email varchar(255),           
  password_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS courses (
  id SERIAL PRIMARY KEY,
  teacher_id int NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  name varchar(100) NOT NULL,
  grade smallint CHECK (grade IN (8, 9)),
  join_code varchar(12) NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sessions (
  id text PRIMARY KEY,
  teacher_id int REFERENCES teachers(id) ON DELETE CASCADE,
  student_id int REFERENCES students(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((teacher_id IS NULL) <> (student_id IS NULL))
);


CREATE TABLE IF NOT EXISTS course_material (
  id SERIAL PRIMARY KEY,
  teacher_id int NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  course_id int REFERENCES courses(id) ON DELETE CASCADE, -- NULL = teacher's general library
  file_name varchar(255) NOT NULL,
  mime_type varchar(100) NOT NULL,  
  storage_path text NOT NULL,      
  size_bytes bigint NOT NULL,
  unit varchar(100),               
  ingest_status varchar(20) NOT NULL DEFAULT 'pending'
    CHECK (ingest_status IN ('pending', 'processing', 'ready', 'failed')),
  uploaded_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS course_enrollments (
  student_id int NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  course_id int NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  enrolled_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (student_id, course_id)
);


-- Students' own private uploads
CREATE TABLE IF NOT EXISTS student_documents (
  id SERIAL PRIMARY KEY,
  student_id int NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  file_name varchar(255) NOT NULL,
  mime_type varchar(100) NOT NULL,
  storage_path text NOT NULL,
  size_bytes bigint NOT NULL,
  ingest_status varchar(20) NOT NULL DEFAULT 'pending'
    CHECK (ingest_status IN ('pending', 'processing', 'ready', 'failed')),
  uploaded_at timestamptz NOT NULL DEFAULT now()
);


CREATE TABLE IF NOT EXISTS document_chunks (
  id SERIAL PRIMARY KEY,
  material_id int REFERENCES course_material(id) ON DELETE CASCADE,
  student_document_id int REFERENCES student_documents(id) ON DELETE CASCADE,
  chunk_index int NOT NULL,
  page int,
  content text NOT NULL,
  embedding vector(768) NOT NULL,
  CHECK ((material_id IS NULL) <> (student_document_id IS NULL))
);



CREATE TABLE IF NOT EXISTS canvases (
  id SERIAL PRIMARY KEY,
  teacher_id int NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  course_id int REFERENCES courses(id) ON DELETE SET NULL,
  title varchar(200) NOT NULL,
  state jsonb NOT NULL DEFAULT '{}'::jsonb, -- canvas library scene JSON
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);




CREATE TABLE IF NOT EXISTS assignments (
  id SERIAL PRIMARY KEY,
  course_id int NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  canvas_id int REFERENCES canvases(id) ON DELETE SET NULL, -- where it was planned
  kind varchar(20) NOT NULL DEFAULT 'assignment'
    CHECK (kind IN ('assignment', 'test')),
  title varchar(200) NOT NULL,
  instructions text NOT NULL DEFAULT '',
  rubric jsonb,                       -- criteria x levels
  assistant_mode varchar(20) NOT NULL DEFAULT 'hints'
    CHECK (assistant_mode IN ('off', 'hints', 'explain', 'open')),
  time_limit_minutes int,             -- tests only
  due_at timestamptz,
  published_at timestamptz,           -- NULL = draft
  created_at timestamptz NOT NULL DEFAULT now()
);
 
CREATE TABLE IF NOT EXISTS questions (
  id SERIAL PRIMARY KEY,
  assignment_id int NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  position int NOT NULL,
  question_type varchar(20) NOT NULL
    CHECK (question_type IN ('multiple_choice', 'short_answer', 'long_answer')),
  prompt text NOT NULL,
  options jsonb,                      -- multiple choice options
  answer_key jsonb,                   -- never sent to students
  points numeric(6, 2) NOT NULL DEFAULT 1,
  UNIQUE (assignment_id, position)
);



CREATE TABLE IF NOT EXISTS submissions (
  id SERIAL PRIMARY KEY,
  assignment_id int NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  student_id int NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  status varchar(20) NOT NULL DEFAULT 'in_progress'
    CHECK (status IN ('in_progress', 'submitted', 'returned')),
  started_at timestamptz NOT NULL DEFAULT now(),
  submitted_at timestamptz,
  score numeric(6, 2),                -- teacher-confirmed only
  UNIQUE (assignment_id, student_id)
);
 
-- Workspace files (IDE-style editor), stored as editor JSON
CREATE TABLE IF NOT EXISTS workspace_files (
  id SERIAL PRIMARY KEY,
  submission_id int NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  name varchar(255) NOT NULL,
  content jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (submission_id, name)
);
 
CREATE TABLE IF NOT EXISTS workspace_file_versions (
  id SERIAL PRIMARY KEY,
  file_id int NOT NULL REFERENCES workspace_files(id) ON DELETE CASCADE,
  content jsonb NOT NULL,
  saved_at timestamptz NOT NULL DEFAULT now()
);
 
-- Test answers
CREATE TABLE IF NOT EXISTS answers (
  submission_id int NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  question_id int NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  response jsonb NOT NULL,
  answered_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (submission_id, question_id)
);
 
-- ---------------------------------------------------------------
-- AI assistant and analysis
-- ---------------------------------------------------------------
 

CREATE TABLE IF NOT EXISTS chat_messages (
  id SERIAL PRIMARY KEY,
  student_id int NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  assignment_id int REFERENCES assignments(id) ON DELETE CASCADE,
  role varchar(20) NOT NULL CHECK (role IN ('user', 'assistant')),
  content text NOT NULL,
  assistant_mode varchar(20),         -- mode in effect when sent
  flagged boolean NOT NULL DEFAULT false, -- tripped moderation
  created_at timestamptz NOT NULL DEFAULT now()
);
 

CREATE TABLE IF NOT EXISTS feedback (
  id SERIAL PRIMARY KEY,
  submission_id int NOT NULL UNIQUE REFERENCES submissions(id) ON DELETE CASCADE,
  ai_draft text,
  teacher_final text,
  misconception_tags text[] NOT NULL DEFAULT '{}',
  status varchar(20) NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'approved')),
  approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
 

CREATE TABLE IF NOT EXISTS class_analyses (
  id SERIAL PRIMARY KEY,
  assignment_id int NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  summary jsonb NOT NULL,             -- clusters, weak outcomes, students needing help
  created_at timestamptz NOT NULL DEFAULT now()
);




CREATE INDEX IF NOT EXISTS idx_students_teacher ON students(teacher_id);
CREATE INDEX IF NOT EXISTS idx_courses_teacher ON courses(teacher_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_course ON course_enrollments(course_id);
CREATE INDEX IF NOT EXISTS idx_material_course ON course_material(course_id);
CREATE INDEX IF NOT EXISTS idx_student_docs_student ON student_documents(student_id);
CREATE INDEX IF NOT EXISTS idx_chunks_material ON document_chunks(material_id);
CREATE INDEX IF NOT EXISTS idx_chunks_student_doc ON document_chunks(student_document_id);
CREATE INDEX IF NOT EXISTS idx_chunks_embedding ON document_chunks USING hnsw (embedding vector_cosine_ops);
CREATE INDEX IF NOT EXISTS idx_assignments_course ON assignments(course_id);
CREATE INDEX IF NOT EXISTS idx_submissions_student ON submissions(student_id);
CREATE INDEX IF NOT EXISTS idx_chat_student_assignment ON chat_messages(student_id, assignment_id, created_at);