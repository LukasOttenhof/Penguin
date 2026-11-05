// Student workspace — driven entirely by useStudentViewModel.
// The teacher workspace (App.tsx) is a separate route at /app.
import { useState } from "react";
import { Link } from "react-router";
import { penguinLogo, penguinAssignments, penguinMaterials } from "../brand-assets";
import { useStudentViewModel } from "../features/student/useStudentViewModel";
import type { AssistantMode } from "../features/student/student.types";
import "../App.css";

const assistantModeLabels: Record<AssistantMode, string> = {
  hints: "Hints only",
  explain: "Explain concepts",
  open: "Open help",
  off: "Assistant off",
};

function Icon({ name, size = 20 }: { name: string; size?: number }) {
  const imgs: Record<string, string> = {
    Assignments: penguinAssignments,
    Materials: penguinMaterials,
    Logo: penguinLogo,
  };
  if (imgs[name]) return <img src={imgs[name]} width={size} height={size} alt="" aria-hidden="true" />;
  const paths: Record<string, React.ReactNode> = {
    spark: <><path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5z" /><path d="m20 2 .5 1.5L22 4l-1.5.5L20 6l-.5-1.5L18 4l1.5-.5z" /></>,
    check: <path d="m5 12 4 4L19 6" />,
    arrow: <path d="M5 12h14m-5-5 5 5-5 5" />,
    menu: <path d="M4 6h16M4 12h16M4 18h16" />,
    close: <path d="m6 6 12 12M6 18 18 6" />,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name] ?? paths.spark}</svg>;
}

export default function StudentApp() {
  const svm = useStudentViewModel();

  const [activeAssignmentId, setActiveAssignmentId] = useState<number>(
    svm.assignments[0]?.id ?? 0,
  );
  const [chatInput, setChatInput] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);

  const assignment = svm.assignments.find(a => a.id === activeAssignmentId) ?? svm.assignments[0];
  const course = svm.courses.find(c => c.id === assignment?.course_id);
  const submission = svm.getSubmission(assignment?.id ?? 0);
  const materials = svm.getMaterials(assignment?.course_id ?? 0);

  async function handleSubmitWork() {
    if (!assignment) return;
    let sub = svm.getSubmission(assignment.id);
    if (!sub) sub = await svm.openSubmission(assignment.id);
    if (sub.status !== "submitted") await svm.submitWork(sub.id);
  }

  async function handleSendChat() {
    const msg = chatInput.trim();
    if (!msg || !assignment) return;
    setChatInput("");
    await svm.sendMessage({ assignment_id: assignment.id, content: msg });
  }

  return (
    <div className="app-shell">
      {/* Sidebar */}
      <aside className={`sidebar ${menuOpen ? "is-open" : ""}`} aria-label="Main navigation">
        <Link to="/" className="brand" style={{ textDecoration: "none" }}>
          <img className="brand-logo" src={penguinLogo} width="100" height="100" alt="" />
          penguin<span className="brand-dot">.</span>
        </Link>
        <div className="workspace-label">STUDENT WORKSPACE</div>

        {/* Course list */}
        <nav>
          {svm.courses.map(c => (
            <div key={c.id} className="nav-item" style={{ cursor: "default" }}>
              <Icon name="Logo" size={22} />
              <span style={{ fontSize: 13 }}>{c.name}</span>
              <span className="nav-count">Gr {c.grade}</span>
            </div>
          ))}
        </nav>

        {/* Schedule */}
        {svm.schedule.length > 0 && (
          <div style={{ padding: "12px 16px", borderTop: "1px solid var(--line, #dbe7f5)", marginTop: "auto" }}>
            <div className="eyebrow" style={{ fontSize: 10, marginBottom: 8 }}>UPCOMING</div>
            {svm.schedule.slice(0, 3).map(item => (
              <div key={item.assignment_id} style={{ fontSize: 12, marginBottom: 6 }}>
                <strong>{item.assignment_title}</strong>
                <br />
                <span style={{ color: "var(--muted, #526b89)" }}>
                  Due {new Date(item.due_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                </span>
              </div>
            ))}
          </div>
        )}

        <div className="sidebar-bottom">
          <div className="profile">
            <span className="avatar">{svm.profile.display_name.split(" ").map(p => p[0]).join("")}</span>
            <div>
              <strong>{svm.profile.display_name}</strong>
              <small>Student · {course?.name ?? "—"}</small>
            </div>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumb">
            <button className="icon-button mobile-menu" aria-label="Toggle navigation" aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}>
              <Icon name="menu" />
            </button>
            <span>Student workspace</span>
            <span className="slash">/</span>
            <strong>{assignment?.title ?? "—"}</strong>
          </div>
          <Link to="/login" className="demo-label" style={{ textDecoration: "none" }}>
            <span /> Sign out
          </Link>
        </header>

        <main id="main-content">
          {/* Toolbar */}
          <div className="workspace-toolbar">
            <label>
              Assignment
              <select value={assignment?.id ?? ""} onChange={e => setActiveAssignmentId(Number(e.target.value))}>
                {svm.assignments.map(a => <option key={a.id} value={a.id}>{a.title}</option>)}
              </select>
            </label>
            <span className="pill">{course?.name}</span>
            {submission?.status === "submitted" && <span className="pill">Submitted</span>}
            {submission?.score != null && <span className="pill">Score: {submission.score}</span>}
          </div>

          {assignment && (
            <div className="student-layout">
              {/* Explorer — instructions, rubric, materials */}
              <aside className="workspace-panel">
                <div className="eyebrow">EXPLORER</div>
                <h3>{assignment.title}</h3>

                <h4>Teacher</h4>
                <p>{course?.teacher.first_name} {course?.teacher.last_name}</p>

                <h4>Instructions</h4>
                <p>{assignment.instructions}</p>

                {assignment.rubric && assignment.rubric.length > 0 && (
                  <>
                    <h4>Rubric</h4>
                    {assignment.rubric.map(c => (
                      <div key={c.id} style={{ marginBottom: 8 }}>
                        <strong style={{ fontSize: 13 }}>{c.label}</strong>
                        <ul style={{ margin: "4px 0 0", paddingLeft: 16, fontSize: 12, color: "var(--muted, #526b89)" }}>
                          {c.levels.map(l => <li key={l.score}>{l.score} — {l.descriptor}</li>)}
                        </ul>
                      </div>
                    ))}
                  </>
                )}

                <h4>Course material</h4>
                {materials.length === 0
                  ? <p style={{ fontSize: 13, color: "var(--muted, #526b89)" }}>No materials yet.</p>
                  : materials.map(m => (
                    <div key={m.id} className="material-row">
                      <Icon name="Materials" size={16} />
                      <div>
                        <strong style={{ fontSize: 13 }}>{m.file_name}</strong>
                        {m.unit && <small> · {m.unit}</small>}
                      </div>
                    </div>
                  ))}
              </aside>

              {/* Editor — student writes their work */}
              <section className="editor-panel">
                <div className="editor-header">
                  <span><Icon name="Assignments" size={17} /> Investigation notes</span>
                  <small>{submission?.status === "submitted" ? "Submitted · Locked" : "In progress · Autosave coming soon"}</small>
                </div>
                <label className="sr-only" htmlFor="investigation">Investigation notes</label>
                <textarea
                  id="investigation"
                  disabled={submission?.status === "submitted"}
                  placeholder={"Start with a question…\n\nHypothesis\nWhat do you think will happen?\n\nObservations\nWhat did you notice?\n\nConclusion\nWhat does the evidence tell you?"}
                />
                <div className="editor-footer">
                  <button
                    className="button primary"
                    disabled={submission?.status === "submitted"}
                    onClick={handleSubmitWork}
                  >
                    {submission?.status === "submitted" ? "Submitted" : "Submit work"}
                    <Icon name="check" size={16} />
                  </button>
                </div>
              </section>

              {/* Assistant — scoped by assistant_mode */}
              <aside className="workspace-panel assistant-panel">
                <span className="idea-icon"><Icon name="spark" size={28} /></span>
                <div className="eyebrow">PENGUIN ASSISTANT</div>
                <h3>Ask a question</h3>

                {assignment.assistant_mode === "off" ? (
                  <p style={{ fontSize: 14, color: "var(--muted, #526b89)" }}>
                    The assistant is switched off for this assignment.
                  </p>
                ) : (
                  <>
                    <p className="small-copy">
                      Mode: <strong>{assistantModeLabels[assignment.assistant_mode]}</strong>
                    </p>

                    <div className="chat-history" style={{ flex: 1, overflowY: "auto", marginTop: 12, display: "flex", flexDirection: "column", gap: 10 }}>
                      {svm.chatHistory.length === 0 && (
                        <p className="small-copy">No messages yet. Ask a question below.</p>
                      )}
                      {svm.chatHistory.map(msg => (
                        <div key={msg.id} className={`chat-msg chat-msg--${msg.role}`}>
                          <strong style={{ fontSize: 12 }}>
                            {msg.role === "user" ? svm.profile.display_name : "Penguin"}
                          </strong>
                          <p style={{ fontSize: 14, marginTop: 3 }}>{msg.content}</p>
                          {msg.flagged && (
                            <small className="flagged-notice" style={{ color: "var(--muted, #526b89)", fontSize: 11 }}>
                              This message was reviewed.
                            </small>
                          )}
                        </div>
                      ))}
                    </div>

                    <div className="chat-input-row" style={{ display: "flex", gap: 8, marginTop: 12 }}>
                      <label className="sr-only" htmlFor="chat-input">Your question</label>
                      <input
                        id="chat-input"
                        value={chatInput}
                        onChange={e => setChatInput(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            void handleSendChat();
                          }
                        }}
                        placeholder="Ask a question…"
                        disabled={submission?.status === "submitted"}
                        style={{ flex: 1 }}
                      />
                      <button
                        className="button primary"
                        onClick={() => void handleSendChat()}
                        disabled={!chatInput.trim() || submission?.status === "submitted"}
                        style={{ whiteSpace: "nowrap" }}
                      >
                        Send <Icon name="arrow" size={16} />
                      </button>
                    </div>
                  </>
                )}
              </aside>
            </div>
          )}

          <footer className="page-footer">
            <span>penguin<span className="brand-dot">.</span> <span>Curious minds. One happy colony.</span></span>
            <span>Student workspace · Grades 8–9</span>
          </footer>
        </main>
      </div>
    </div>
  );
}
