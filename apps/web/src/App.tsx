import { penguinLogo, penguinClassrooms, penguinAssignments, penguinMaterials, penguinWorkspace, penguinScience } from "./brand-assets";
import { useEffect, useRef, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import "./App.css";
import Classrooms from "./features/classrooms/Classrooms";
import { useTeacherViewModel } from "./features/teacher/useTeacherViewModel";
import { useStudentViewModel } from "./features/student/useStudentViewModel";
import type { AssistantMode } from "./features/teacher/teacher.types";

type Page = "Overview" | "Classrooms" | "Assignments" | "Course materials" | "Student workspace";

const pages: Page[] = ["Overview", "Classrooms", "Assignments", "Course materials", "Student workspace"];

// Maps the DB assistant_mode values to human-readable labels shown in the UI.
const assistantModeLabels: Record<AssistantMode, string> = {
  hints: "Hints only",
  explain: "Explain concepts",
  open: "Open help",
  off: "Assistant off",
};
const assistantModes: AssistantMode[] = ["hints", "explain", "open", "off"];

function Icon({ name, size = 20 }: { name: string; size?: number }) {
  const mascots: Record<string, string> = {
    Overview: penguinLogo,
    Classrooms: penguinClassrooms,
    Assignments: penguinAssignments,
    "Course materials": penguinMaterials,
    "Student workspace": penguinWorkspace,
  };
  if (mascots[name]) return <img className="penguin-icon" src={mascots[name]} width={size} height={size} alt="" aria-hidden="true" />;
  const paths: Record<string, ReactNode> = {
    plus: <path d="M12 5v14M5 12h14" />,
    arrow: <path d="M5 12h14m-5-5 5 5-5 5" />,
    spark: <><path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5z" /><path d="m20 2 .5 1.5L22 4l-1.5.5L20 6l-.5-1.5L18 4l1.5-.5z" /></>,
    check: <path d="m5 12 4 4L19 6" />,
    menu: <path d="M4 6h16M4 12h16M4 18h16" />,
    close: <path d="m6 6 12 12M6 18 18 6" />,
    upload: <path d="M12 16V3m-5 5 5-5 5 5M4 15v6h16v-6" />,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name] ?? paths.spark}</svg>;
}

function ModalShell({ children, onClose }: { children: ReactNode; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    dialog.current?.showModal();
    return () => { opener?.focus(); };
  }, []);
  return <dialog ref={dialog} className="modal-backdrop" aria-labelledby="modal-title" onCancel={onClose} onClick={event => { if (event.target === event.currentTarget) onClose(); }}>{children}</dialog>;
}

function App() {
  const vm = useTeacherViewModel();
  const svm = useStudentViewModel();

  const [page, setPage] = useState<Page>("Overview");
  const [menuOpen, setMenuOpen] = useState(false);
  const [modal, setModal] = useState<"assignment" | null>(null);
  const [activeClassroomId, setActiveClassroomId] = useState<number | null>(null);
  const [activeAssignmentId, setActiveAssignmentId] = useState<number>(vm.assignments[0]?.id ?? 0);
  const [selectedCourseId, setSelectedCourseId] = useState<number | "all">("all");
  const [search, setSearch] = useState("");
  const [notice, setNotice] = useState("");
  const [chatInput, setChatInput] = useState("");

  // Teacher view — which assignment is open in teacher assignments list
  const currentTeacherAssignment = vm.assignments.find(a => a.id === activeAssignmentId) ?? vm.assignments[0];

  // Student view — the same assignment looked up from the student VM (published only, no canvas_id etc.)
  const currentStudentAssignment = svm.assignments.find(a => a.id === activeAssignmentId) ?? svm.assignments[0];
  const studentSubmission = svm.getSubmission(currentStudentAssignment?.id ?? 0);

  const visibleAssignments = vm.assignments.filter(a =>
    (selectedCourseId === "all" || a.course_id === selectedCourseId) &&
    a.title.toLowerCase().includes(search.toLowerCase()),
  );

  const getCourse = (id: number) => vm.courses.find(c => c.id === id);

  function navigate(next: Page) { setPage(next); setMenuOpen(false); setSearch(""); setNotice(""); if (next === "Classrooms") setActiveClassroomId(null); }
  function openClassroom(id: number) { navigate("Classrooms"); setActiveClassroomId(id); }
  function openWorkspace(id: number) { setActiveAssignmentId(id); navigate("Student workspace"); }

  async function handleSubmitWork() {
    if (!currentStudentAssignment) return;
    let sub = svm.getSubmission(currentStudentAssignment.id);
    if (!sub) sub = await svm.openSubmission(currentStudentAssignment.id);
    if (sub.status === "submitted") return; // already submitted
    await svm.submitWork(sub.id);
  }

  async function handleSendChat() {
    const msg = chatInput.trim();
    if (!msg || !currentStudentAssignment) return;
    setChatInput("");
    await svm.sendMessage({ assignment_id: currentStudentAssignment.id, content: msg });
  }

  async function saveForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const title = String(data.get("title") ?? "").trim();
    if (!title) return;
    const courseId = Number(data.get("courseId"));
    if (!vm.courses.some(c => c.id === courseId)) return;
    await vm.createAssignment({
      course_id: courseId,
      kind: "assignment",
      title,
      instructions: String(data.get("instructions") ?? "").trim(),
      assistant_mode: String(data.get("assistant_mode")) as AssistantMode,
      due_at: String(data.get("due_at") || "") || null,
      rubric: null,
      time_limit_minutes: null,
    });
    setSelectedCourseId("all");
    navigate("Assignments");
    setModal(null);
  }

  // Adapt vm.courses → the shape Classrooms.tsx expects (string ids, students array)
  const classroomsForLegacyComponent = vm.courses.map(c => ({
    id: String(c.id),
    name: c.name,
    grade: c.grade,
    unit: `Grade ${c.grade} Science`,
    students: vm.getStudents(c.id).map(s => ({
      id: String(s.id),
      displayName: s.display_name,
      username: s.username,
    })),
  }));

  function assignmentList(items: typeof vm.assignments) {
    return items.length
      ? <div className="assignment-list">{items.map(item => {
          const course = getCourse(item.course_id);
          return <button className="assignment-row" key={item.id} onClick={() => openWorkspace(item.id)}>
            <span className={`subject-icon ${item.course_id === 2 ? "amber" : ""}`}><Icon name="Assignments" /></span>
            <span className="row-title"><strong>{item.title}</strong><small>{course?.name} · Grade {course?.grade}</small></span>
            <span className="pill">{assistantModeLabels[item.assistant_mode]}</span>
            <span className="due">{item.due_at ? new Date(item.due_at).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "No due date"}</span>
            <Icon name="arrow" size={18} />
          </button>;
        })}</div>
      : <div className="empty-state"><Icon name="Assignments" size={30} /><h3>No assignments found</h3><p>Create an assignment or change your filters.</p></div>;
  }

  // Wait for /api/teachers/info_teacher before drawing anything that needs the teacher.
  if (!vm.teacher) return <p style={{ padding: 40 }}>Loading…</p>;

  const initials = `${vm.teacher.first_name[0]}${vm.teacher.last_name[0]}`;

  return <div className="app-shell">
    <aside className={`sidebar ${menuOpen ? "is-open" : ""}`} aria-label="Main navigation">
      <a className="brand" href="#" onClick={event => { event.preventDefault(); navigate("Overview"); }}><img className="brand-logo" src={penguinLogo} width="100" height="100" alt="" />penguin<span className="brand-dot">.</span></a>
      <div className="workspace-label">YOUR WORKSPACE <span>DEMO</span></div>
      <nav>{pages.map(item => <button key={item} className={`nav-item ${page === item ? "active" : ""}`} aria-current={page === item ? "page" : undefined} onClick={() => navigate(item)}><Icon name={item} size={30} />{item}{item === "Classrooms" && <span className="nav-count">{vm.courses.length}</span>}</button>)}</nav>
      <div className="sidebar-bottom"><div className="sidebar-note"><Icon name="spark" /><strong>Every learner<br />belongs in the huddle.</strong><p>A little support. A big world to explore together.</p></div><div className="profile"><span className="avatar">{initials}</span><div><strong>{vm.teacher.first_name} {vm.teacher.last_name}</strong><small>Teacher</small></div></div></div>
    </aside>
    <div className="main-shell">
      <header className="topbar"><div className="breadcrumb"><button className="icon-button mobile-menu" aria-label="Toggle navigation" aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}><Icon name="menu" /></button><span>Workspace</span><span className="slash">/</span><strong>{page}</strong></div><span className="demo-label"><span /> Synthetic classroom demo</span></header>
      <main id="main-content">
        <div className="page-heading"><div><div className="eyebrow">WELCOME TO YOUR COLONY</div><h1>{page === "Overview" ? "Big discoveries start with a little curiosity." : page === "Classrooms" && activeClassroomId ? getCourse(activeClassroomId)?.name ?? "Classrooms" : page}</h1><p>{page === "Overview" ? "Gather your learners. Share ideas. Explore science together." : page === "Classrooms" ? "Your assigned classrooms and student rosters, all in one place." : page === "Assignments" ? "Give every investigation a clear starting point." : page === "Course materials" ? "Keep your classroom knowledge in one place." : "A place to think, investigate, and make connections."}</p></div>{page !== "Classrooms" && <button className="button primary" disabled={!vm.courses.length} onClick={() => setModal("assignment")}><Icon name="plus" size={18} />New assignment</button>}</div>
        <div className="demo-banner"><Icon name="check" size={16} /><span>Sample classrooms and students are shown for this teacher demo. Live administrator assignments are not connected yet.</span></div>
        {notice && <div role="status" className="notice">{notice}<button className="icon-button" aria-label="Dismiss notification" onClick={() => setNotice("")}><Icon name="close" size={16} /></button></div>}

        {page === "Overview" && <>
          <section className="welcome-card"><div className="welcome-copy"><span className="pill light">SMALL STEPS. BIG DISCOVERIES.</span><h2>Learning is better<br /><em>in a huddle.</em></h2><p>A curious penguin. A classroom of explorers.<br />Bring your colony together and explore something new.</p><button className="button dark" onClick={() => navigate("Classrooms")}>View classrooms <Icon name="arrow" size={18} /></button></div><div className="penguin-scene" aria-hidden="true" /></section>
          <section className="stats" aria-label="Workspace totals">{[{ label: "Your classrooms", value: vm.courses.length, icon: "Classrooms", caption: "Spaces to learn together" }, { label: "Assignments", value: vm.assignments.length, icon: "Assignments", caption: "Questions worth exploring" }, { label: "Course materials", value: vm.materials.length, icon: "Course materials", caption: "Resources for discovery" }].map(stat => <button className="stat-card" key={stat.label} onClick={() => navigate(stat.icon as Page)}><div><span>{stat.label}</span><strong>{stat.value.toString().padStart(2, "0")}</strong><small>{stat.caption}</small></div><span className="stat-icon"><Icon name={stat.icon} /></span></button>)}</section>
          <div className="overview-grid"><section className="panel"><div className="section-heading"><div><h2>Your classrooms</h2><p>Your learning colonies. Ready to explore.</p></div><button className="text-button" onClick={() => navigate("Classrooms")}>View all <Icon name="arrow" size={16} /></button></div><div className="class-grid">{vm.courses.slice(0, 2).map((item, index) => <button className={`class-card tone-${index % 2}`} key={item.id} onClick={() => openClassroom(item.id)}><div className="class-card-top"><span className="class-mark"><img src={penguinScience} width="32" height="32" alt="" /></span><span className="pill">{vm.getStudents(item.id).length} students</span></div><h3>{item.name}</h3><p>Grade {item.grade} Science</p><div className="class-card-footer">Open classroom <Icon name="arrow" size={18} /></div></button>)}</div></section><section className="idea-card"><img className="idea-mascot" src={penguinLogo} width="64" height="64" alt="" /><div className="eyebrow">A LITTLE HELP FROM PENGUIN</div><h2>A helpful nudge.<br />A new discovery.</h2><p>Choose how much help students get, from gentle hints to deeper explanations.</p><button className="text-button" onClick={() => setModal("assignment")}>Set up an assignment <Icon name="arrow" size={17} /></button></section></div>
          <section className="panel"><div className="section-heading"><div><h2>Ready for exploration</h2><p>Pick up an investigation in the student demo.</p></div><button className="text-button" onClick={() => { setSelectedCourseId("all"); navigate("Assignments"); }}>All assignments <Icon name="arrow" size={16} /></button></div>{assignmentList(vm.assignments.slice(0, 3))}</section>
        </>}

        {page === "Classrooms" && <Classrooms classrooms={classroomsForLegacyComponent} activeClassroomId={activeClassroomId !== null ? String(activeClassroomId) : null} onOpenClassroom={id => openClassroom(Number(id))} onBack={() => setActiveClassroomId(null)} />}

        {page === "Assignments" && <section className="panel"><div className="filters"><label className="search-label">Search assignments<input placeholder="Search by title…" value={search} onChange={event => setSearch(event.target.value)} /></label><label>Class<select value={selectedCourseId} onChange={event => setSelectedCourseId(event.target.value === "all" ? "all" : Number(event.target.value))}><option value="all">All classes</option>{vm.courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label><span className="result-count">{visibleAssignments.length} assignments</span></div>{assignmentList(visibleAssignments)}</section>}

        {page === "Course materials" && <section className="panel"><div className="section-heading"><div><h2>Your resource library</h2><p>Organize course materials by class.</p></div></div><div className="upload-area"><span className="stat-icon"><Icon name="upload" size={26} /></span><h3>A starting point for every discovery</h3><p>Add PDF, DOCX, PPTX, TXT, or Markdown files.</p><label className="upload-class">Class<select value={selectedCourseId === "all" ? vm.courses[0]?.id : selectedCourseId} onChange={event => setSelectedCourseId(Number(event.target.value))}>{vm.courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label><label className="button primary upload-button"><Icon name="plus" size={18} />Choose files<input aria-label="Choose course material files" type="file" multiple accept=".pdf,.docx,.pptx,.txt,.md,.markdown" onChange={async event => { const files = Array.from(event.target.files ?? []); const allowed = files.filter(file => /\.(pdf|docx|pptx|txt|md|markdown)$/i.test(file.name)); const courseId = selectedCourseId === "all" ? (vm.courses[0]?.id ?? null) : selectedCourseId; await Promise.all(allowed.map(file => vm.uploadMaterial({ course_id: courseId, file, unit: null }))); setNotice(`${allowed.length} file reference(s) added. Only names and sizes are saved; document contents are not uploaded or available to AI.${allowed.length < files.length ? " Unsupported files were skipped." : ""}`); event.target.value = ""; }} /></label><small>Demo: stores file references only. Document ingestion is not connected.</small></div>{vm.materials.map(item => { const course = getCourse(item.course_id ?? 0); return <div className="material-row" key={item.id}><Icon name="Course materials" /><div><strong>{item.file_name}</strong><small>{course?.name ?? "General library"} · {Math.max(1, Math.round(item.size_bytes / 1024))} KB · Reference only</small></div><button className="text-button" onClick={() => vm.deleteMaterial(item.id)} aria-label={`Remove ${item.file_name}`}>Remove</button></div>; })}</section>}

        {page === "Student workspace" && <>
          <div className="workspace-toolbar">
            <label>Assignment<select value={currentStudentAssignment?.id ?? ""} onChange={event => setActiveAssignmentId(Number(event.target.value))}>
              {svm.assignments.map(a => <option key={a.id} value={a.id}>{a.title}</option>)}
            </select></label>
            <span className="pill">{svm.profile.display_name}</span>
            {studentSubmission?.status === "submitted" && <span className="pill">Submitted</span>}
            {studentSubmission?.score !== null && studentSubmission?.score !== undefined && <span className="pill">Score: {studentSubmission.score}</span>}
          </div>
          {currentStudentAssignment && <div className="student-layout">
            {/* Explorer panel — student sees instructions, materials, schedule */}
            <aside className="workspace-panel">
              <div className="eyebrow">EXPLORER</div>
              <h3>{currentStudentAssignment.title}</h3>
              <span className="pill">{svm.courses.find(c => c.id === currentStudentAssignment.course_id)?.name}</span>
              <h4>Teacher</h4>
              <p>{svm.courses.find(c => c.id === currentStudentAssignment.course_id)?.teacher.first_name} {svm.courses.find(c => c.id === currentStudentAssignment.course_id)?.teacher.last_name}</p>
              <h4>Assignment instructions</h4>
              <p>{currentStudentAssignment.instructions}</p>
              {currentStudentAssignment.rubric && <>
                <h4>Rubric</h4>
                {currentStudentAssignment.rubric.map(c => <div key={c.id}><strong>{c.label}</strong></div>)}
              </>}
              <h4>Course material</h4>
              {svm.getMaterials(currentStudentAssignment.course_id).map(m => (
                <div key={m.id} className="material-row"><Icon name="Course materials" size={16} /><small>{m.file_name}{m.unit ? ` · ${m.unit}` : ""}</small></div>
              ))}
              {svm.getMaterials(currentStudentAssignment.course_id).length === 0 && <p className="small-copy">No materials yet.</p>}
              <h4>Upcoming</h4>
              {svm.schedule.length === 0
                ? <p className="small-copy">Nothing due.</p>
                : svm.schedule.map(item => <div key={item.assignment_id} className="material-row"><small><strong>{item.assignment_title}</strong><br />{new Date(item.due_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</small></div>)
              }
            </aside>
            {/* Editor panel — student writes their work */}
            <section className="editor-panel">
              <div className="editor-header">
                <span><Icon name="Assignments" size={17} /> Investigation notes</span>
                <small>{studentSubmission?.status === "submitted" ? "Submitted · Locked" : "In progress"}</small>
              </div>
              <label className="sr-only" htmlFor="investigation">Investigation notes</label>
              <textarea
                id="investigation"
                disabled={studentSubmission?.status === "submitted"}
                placeholder={"Start with a question…\n\nHypothesis\nWhat do you think will happen?\n\nObservations\nWhat did you notice?\n\nConclusion\nWhat does the evidence tell you?"}
              />
              <div className="editor-footer">
                <button
                  className="button primary"
                  disabled={studentSubmission?.status === "submitted"}
                  onClick={handleSubmitWork}
                >
                  {studentSubmission?.status === "submitted" ? "Submitted" : "Submit work"}
                  <Icon name="check" size={16} />
                </button>
              </div>
            </section>
            {/* Assistant panel — student sees only what's allowed by assistant_mode */}
            <aside className="workspace-panel assistant-panel">
              <span className="idea-icon"><Icon name="spark" size={28} /></span>
              <div className="eyebrow">PENGUIN ASSISTANT</div>
              <h3>Ask a question</h3>
              {currentStudentAssignment.assistant_mode === "off"
                ? <p>The assistant is switched off for this assignment.</p>
                : <>
                  <p className="small-copy">Mode: <strong>{assistantModeLabels[currentStudentAssignment.assistant_mode]}</strong></p>
                  <div className="chat-history">
                    {svm.chatHistory.length === 0 && <p className="small-copy">No messages yet. Ask a question below.</p>}
                    {svm.chatHistory.map(msg => (
                      <div key={msg.id} className={`chat-msg chat-msg--${msg.role}`}>
                        <strong>{msg.role === "user" ? svm.profile.display_name : "Penguin"}</strong>
                        <p>{msg.content}</p>
                        {msg.flagged && <small className="flagged-notice">This message was reviewed.</small>}
                      </div>
                    ))}
                  </div>
                  <div className="chat-input-row">
                    <label className="sr-only" htmlFor="chat-input">Your question</label>
                    <input
                      id="chat-input"
                      value={chatInput}
                      onChange={e => setChatInput(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void handleSendChat(); } }}
                      placeholder="Ask a question…"
                      disabled={studentSubmission?.status === "submitted"}
                    />
                    <button className="button primary" onClick={() => void handleSendChat()} disabled={!chatInput.trim() || studentSubmission?.status === "submitted"}>
                      Send
                    </button>
                  </div>
                </>
              }
            </aside>
          </div>}
        </>}

        <footer className="page-footer"><span>penguin<span className="brand-dot">.</span> <span>Curious minds. One happy colony.</span></span><span>Made for curious minds · Grades 8–9</span></footer>
      </main>
    </div>
    {modal && <ModalShell onClose={() => setModal(null)}><section className="modal"><div className="section-heading"><div><div className="eyebrow">START SOMETHING GOOD</div><h2 id="modal-title">Create an assignment</h2></div><button className="icon-button" aria-label="Close dialog" onClick={() => setModal(null)}><Icon name="close" /></button></div><form onSubmit={saveForm}><label>Assignment title<input name="title" autoFocus required maxLength={100} placeholder="e.g. Exploring plant cells" /></label><label>Classroom<select name="courseId" required defaultValue={selectedCourseId === "all" ? vm.courses[0]?.id : selectedCourseId}>{vm.courses.map(c => <option key={c.id} value={c.id}>{c.name} · Grade {c.grade}</option>)}</select></label><label>Instructions<textarea name="instructions" required rows={4} placeholder="What should students investigate?" /></label><div className="form-grid"><label>Due date (optional)<input type="date" name="due_at" /></label><label>AI help level<select name="assistant_mode">{assistantModes.map(m => <option key={m} value={m}>{assistantModeLabels[m]}</option>)}</select></label></div><p className="small-copy">Saved as a local demo. Publishing and AI settings require backend integration.</p><div className="modal-actions"><button type="button" className="button secondary" onClick={() => setModal(null)}>Cancel</button><button className="button primary" type="submit" disabled={!vm.courses.length}>Create assignment<Icon name="arrow" size={17} /></button></div></form></section></ModalShell>}
  </div>;
}

export default App;
