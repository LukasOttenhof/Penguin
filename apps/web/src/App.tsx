import { penguinLogo, penguinClassrooms, penguinAssignments, penguinMaterials, penguinWorkspace, penguinScience } from "./brand-assets";
import { useEffect, useRef, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import "./App.css";
import Classrooms from "./features/classrooms/Classrooms";
import { assignedClassrooms } from "./features/classrooms/classroom-data";

type Page = "Overview" | "Classrooms" | "Assignments" | "Course materials" | "Student workspace";
type HelpLevel = "Hints only" | "Explain concepts" | "Open help" | "Assistant off";

type Assignment = { id: string; title: string; classId: string; due: string; help: HelpLevel; instructions: string };
type Material = { id: string; name: string; classId: string; size: string };
type Workspace = { text: string; submitted: boolean };

const initialAssignments: Assignment[] = [
  { id: "cell-lab", title: "A closer look at cells", classId: "cells", due: "", help: "Hints only", instructions: "Compare plant and animal cells. Write a hypothesis, describe your observations, and explain how each structure supports the cell. Use evidence from your class material." },
  { id: "circuit-lab", title: "Build a better circuit", classId: "electricity", due: "", help: "Explain concepts", instructions: "Investigate how adding a bulb changes a series circuit. Record your prediction, procedure, observations, and conclusion." },
];
const pages: Page[] = ["Overview", "Classrooms", "Assignments", "Course materials", "Student workspace"];
const helpLevels: HelpLevel[] = ["Hints only", "Explain concepts", "Open help", "Assistant off"];

function useStoredState<T,>(key: string, fallback: T) {
  const [value, setValue] = useState<T>(() => {
    try { const stored = localStorage.getItem(key); return stored ? JSON.parse(stored) as T : fallback; }
    catch { return fallback; }
  });
  const [saveError, setSaveError] = useState(false);
  function update(next: T) {
    setValue(next);
    try { localStorage.setItem(key, JSON.stringify(next)); setSaveError(false); }
    catch { setSaveError(true); }
  }
  return [value, update, saveError] as const;
}

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
  const [page, setPage] = useState<Page>("Classrooms");
  const [menuOpen, setMenuOpen] = useState(false);
  const [modal, setModal] = useState<"assignment" | null>(null);
  const classes = assignedClassrooms;
  const [activeClassroomId, setActiveClassroomId] = useState<string | null>(null);
  const [assignments, setAssignments, assignmentError] = useStoredState("penguin.assignments.v1", initialAssignments);
  const [materials, setMaterials, materialError] = useStoredState<Material[]>("penguin.materials.v1", []);
  const [workspaces, setWorkspaces, workspaceError] = useStoredState<Record<string, Workspace>>("penguin.workspaces.v1", {});
  const [activeAssignment, setActiveAssignment] = useState("cell-lab");
  const [selectedClass, setSelectedClass] = useState("all");
  const [search, setSearch] = useState("");
  const [notice, setNotice] = useState("");
  const currentAssignment = assignments.find(item => item.id === activeAssignment) ?? assignments[0];
  const workspace = workspaces[currentAssignment?.id ?? ""] ?? { text: "", submitted: false };
  const visibleAssignments = assignments.filter(item => (selectedClass === "all" || item.classId === selectedClass) && item.title.toLowerCase().includes(search.toLowerCase()));
  const getClass = (id: string) => classes.find(item => item.id === id);

  function navigate(next: Page) { setPage(next); setMenuOpen(false); setSearch(""); setNotice(""); if (next === "Classrooms") setActiveClassroomId(null); }
  function openClassroom(id: string) { navigate("Classrooms"); setActiveClassroomId(id); }
  function openWorkspace(id: string) { setActiveAssignment(id); navigate("Student workspace"); }
  function saveForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const title = String(data.get("title") ?? "").trim();
    if (!title) return;
    const id = crypto.randomUUID();
    if (!classes.some(item => item.id === String(data.get("classId")))) return;
    setAssignments([...assignments, { id, title, classId: String(data.get("classId")), due: String(data.get("due")), help: String(data.get("help")) as HelpLevel, instructions: String(data.get("instructions")).trim() }]);
    setSelectedClass("all"); navigate("Assignments");
    setModal(null);
  }
  function updateWorkspace(next: Workspace) {
    if (currentAssignment) setWorkspaces({ ...workspaces, [currentAssignment.id]: next });
  }
  function assignmentList(items: Assignment[]) {
    return items.length ? <div className="assignment-list">{items.map(item => <button className="assignment-row" key={item.id} onClick={() => openWorkspace(item.id)}>
      <span className={`subject-icon ${item.classId === "electricity" ? "amber" : ""}`}><Icon name="Assignments" /></span>
      <span className="row-title"><strong>{item.title}</strong><small>{getClass(item.classId)?.name} · {getClass(item.classId)?.unit}</small></span>
      <span className="pill">{item.help}</span><span className="due">{item.due ? new Date(`${item.due}T12:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "No due date"}</span><Icon name="arrow" size={18} />
    </button>)}</div> : <div className="empty-state"><Icon name="Assignments" size={30} /><h3>No assignments found</h3><p>Create an assignment or change your filters.</p></div>;
  }

  return <div className="app-shell">
    <aside className={`sidebar ${menuOpen ? "is-open" : ""}`} aria-label="Main navigation">
      <a className="brand" href="#" onClick={event => { event.preventDefault(); navigate("Overview"); }}><img className="brand-logo" src={penguinLogo} width="100" height="100" alt="" />penguin<span className="brand-dot">.</span></a>
      <div className="workspace-label">YOUR WORKSPACE <span>DEMO</span></div>
      <nav>{pages.map(item => <button key={item} className={`nav-item ${page === item ? "active" : ""}`} aria-current={page === item ? "page" : undefined} onClick={() => navigate(item)}><Icon name={item} size={30} />{item}{item === "Classrooms" && <span className="nav-count">{classes.length}</span>}</button>)}</nav>
      <div className="sidebar-bottom"><div className="sidebar-note"><Icon name="spark" /><strong>Every learner<br />belongs in the huddle.</strong><p>A little support. A big world to explore together.</p></div><div className="profile"><span className="avatar">AT</span><div><strong>Alex Taylor</strong><small>Teacher · Demo account</small></div></div></div>
    </aside>
    <div className="main-shell">
      <header className="topbar"><div className="breadcrumb"><button className="icon-button mobile-menu" aria-label="Toggle navigation" aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}><Icon name="menu" /></button><span>Workspace</span><span className="slash">/</span><strong>{page}</strong></div><span className="demo-label"><span /> Synthetic classroom demo</span></header>
      <main id="main-content">
        <div className="page-heading"><div><div className="eyebrow">WELCOME TO YOUR COLONY</div><h1>{page === "Overview" ? "Big discoveries start with a little curiosity." : page === "Classrooms" && activeClassroomId ? classes.find(item => item.id === activeClassroomId)?.name ?? "Classrooms" : page}</h1><p>{page === "Overview" ? "Gather your learners. Share ideas. Explore science together." : page === "Classrooms" ? "Your assigned classrooms and student rosters, all in one place." : page === "Assignments" ? "Give every investigation a clear starting point." : page === "Course materials" ? "Keep your classroom knowledge in one place." : "A place to think, investigate, and make connections."}</p></div>{page !== "Classrooms" && <button className="button primary" disabled={!classes.length} onClick={() => setModal("assignment")}><Icon name="plus" size={18} />New assignment</button>}</div>
        <div className="demo-banner"><Icon name="check" size={16} /><span>Sample classrooms and students are shown for this teacher demo. Live administrator assignments are not connected yet.</span></div>
        {(assignmentError || materialError || workspaceError) && <p role="alert" className="error-banner">Browser storage is unavailable or full. Your latest changes are only saved for this session.</p>}
        {notice && <div role="status" className="notice">{notice}<button className="icon-button" aria-label="Dismiss notification" onClick={() => setNotice("")}><Icon name="close" size={16} /></button></div>}

        {page === "Overview" && <>
          <section className="welcome-card"><div className="welcome-copy"><span className="pill light">SMALL STEPS. BIG DISCOVERIES.</span><h2>Learning is better<br /><em>in a huddle.</em></h2><p>A curious penguin. A classroom of explorers.<br />Bring your colony together and explore something new.</p><button className="button dark" onClick={() => navigate("Classrooms")}>View classrooms <Icon name="arrow" size={18} /></button></div><div className="penguin-scene" aria-hidden="true" /></section>
          <section className="stats" aria-label="Workspace totals">{[{ label: "Your classrooms", value: classes.length, icon: "Classrooms", caption: "Spaces to learn together" }, { label: "Assignments", value: assignments.length, icon: "Assignments", caption: "Questions worth exploring" }, { label: "Course materials", value: materials.length, icon: "Course materials", caption: "Resources for discovery" }].map(stat => <button className="stat-card" key={stat.label} onClick={() => navigate(stat.icon as Page)}><div><span>{stat.label}</span><strong>{stat.value.toString().padStart(2, "0")}</strong><small>{stat.caption}</small></div><span className="stat-icon"><Icon name={stat.icon} /></span></button>)}</section>
          <div className="overview-grid"><section className="panel"><div className="section-heading"><div><h2>Your classrooms</h2><p>Your learning colonies. Ready to explore.</p></div><button className="text-button" onClick={() => navigate("Classrooms")}>View all <Icon name="arrow" size={16} /></button></div><div className="class-grid">{classes.slice(0, 2).map((item, index) => <button className={`class-card tone-${index % 2}`} key={item.id} onClick={() => openClassroom(item.id)}><div className="class-card-top"><span className="class-mark"><img src={penguinScience} width="32" height="32" alt="" /></span><span className="pill">{item.students.length} students</span></div><h3>{item.name}</h3><p>{item.unit}</p><div className="class-card-footer">Open classroom <Icon name="arrow" size={18} /></div></button>)}</div></section><section className="idea-card"><img className="idea-mascot" src={penguinLogo} width="64" height="64" alt="" /><div className="eyebrow">A LITTLE HELP FROM PENGUIN</div><h2>A helpful nudge.<br />A new discovery.</h2><p>Choose how much help students get, from gentle hints to deeper explanations.</p><button className="text-button" onClick={() => setModal("assignment")}>Set up an assignment <Icon name="arrow" size={17} /></button></section></div>
          <section className="panel"><div className="section-heading"><div><h2>Ready for exploration</h2><p>Pick up an investigation in the student demo.</p></div><button className="text-button" onClick={() => { setSelectedClass("all"); navigate("Assignments"); }}>All assignments <Icon name="arrow" size={16} /></button></div>{assignmentList(assignments.slice(0, 3))}</section>
        </>}

        {page === "Classrooms" && <Classrooms classrooms={classes} activeClassroomId={activeClassroomId} onOpenClassroom={openClassroom} onBack={() => setActiveClassroomId(null)} />}

        {page === "Assignments" && <section className="panel"><div className="filters"><label className="search-label">Search assignments<input placeholder="Search by title…" value={search} onChange={event => setSearch(event.target.value)} /></label><label>Class<select value={selectedClass} onChange={event => setSelectedClass(event.target.value)}><option value="all">All classes</option>{classes.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><span className="result-count">{visibleAssignments.length} assignments</span></div>{assignmentList(visibleAssignments)}</section>}

        {page === "Course materials" && <section className="panel"><div className="section-heading"><div><h2>Your resource library</h2><p>Organize course materials by class.</p></div></div><div className="upload-area"><span className="stat-icon"><Icon name="upload" size={26} /></span><h3>A starting point for every discovery</h3><p>Add PDF, DOCX, PPTX, TXT, or Markdown files.</p><label className="upload-class">Class<select value={selectedClass === "all" ? classes[0]?.id : selectedClass} onChange={event => setSelectedClass(event.target.value)}>{classes.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label className="button primary upload-button"><Icon name="plus" size={18} />Choose files<input aria-label="Choose course material files" type="file" multiple accept=".pdf,.docx,.pptx,.txt,.md,.markdown" onChange={event => { const files = Array.from(event.target.files ?? []); const allowed = files.filter(file => /\.(pdf|docx|pptx|txt|md|markdown)$/i.test(file.name)); setMaterials([...materials, ...allowed.map(file => ({ id: crypto.randomUUID(), name: file.name, classId: selectedClass === "all" ? classes[0].id : selectedClass, size: `${Math.max(1, Math.round(file.size / 1024))} KB` }))]); setNotice(`${allowed.length} file reference(s) added. Only names and sizes are saved; document contents are not uploaded or available to AI.${allowed.length < files.length ? " Unsupported files were skipped." : ""}`); event.target.value = ""; }} /></label><small>Demo: stores file references only. Document ingestion is not connected.</small></div>{materials.map(item => <div className="material-row" key={item.id}><Icon name="Course materials" /><div><strong>{item.name}</strong><small>{getClass(item.classId)?.name} · {item.size} · Reference only</small></div><button className="text-button" onClick={() => setMaterials(materials.filter(material => material.id !== item.id))} aria-label={`Remove ${item.name}`}>Remove</button></div>)}</section>}

        {page === "Student workspace" && <><div className="workspace-toolbar"><label>Assignment<select value={currentAssignment?.id ?? ""} onChange={event => setActiveAssignment(event.target.value)}>{assignments.map(item => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label><span className="pill">Student demo</span></div>{currentAssignment && <div className="student-layout"><aside className="workspace-panel"><div className="eyebrow">EXPLORER</div><h3>{currentAssignment.title}</h3><span className="pill">{getClass(currentAssignment.classId)?.name}</span><h4>Assignment instructions</h4><p>{currentAssignment.instructions}</p><h4>Course material</h4><p>{materials.filter(item => item.classId === currentAssignment.classId).length} file references. Document content is not connected yet.</p></aside><section className="editor-panel"><div className="editor-header"><span><Icon name="Assignments" size={17} /> Investigation notes</span><small>{workspace.submitted ? "Submitted · Locked" : workspaceError ? "Not saved to browser" : "Saved in this browser"}</small></div><label className="sr-only" htmlFor="investigation">Investigation notes</label><textarea id="investigation" value={workspace.text} disabled={workspace.submitted} placeholder={"Start with a question…\n\nHypothesis\nWhat do you think will happen?\n\nObservations\nWhat did you notice?\n\nConclusion\nWhat does the evidence tell you?"} onChange={event => updateWorkspace({ text: event.target.value, submitted: false })} /><div className="editor-footer"><span>{workspace.text.trim() ? workspace.text.trim().split(/\s+/).length : 0} words</span><button className="button primary" disabled={!workspace.text.trim()} onClick={() => updateWorkspace({ ...workspace, submitted: !workspace.submitted })}>{workspace.submitted ? "Reopen as teacher" : "Submit demo work"}<Icon name="check" size={16} /></button></div></section><aside className="workspace-panel assistant-panel"><span className="idea-icon"><Icon name="spark" /></span><h3>Your thinking partner</h3><span className="pill">{currentAssignment.help}</span><p>{currentAssignment.help === "Assistant off" ? "The assistant is switched off for this assignment." : "A little guidance to help you reach your own conclusions."}</p><div className="assistant-placeholder"><strong>AI assistant coming next</strong><p>Course-grounded chat and document citations need the server integration. No messages are sent from this demo.</p></div></aside></div>}</>}
        <footer className="page-footer"><span>penguin<span className="brand-dot">.</span> <span>Curious minds. One happy colony.</span></span><span>Made for curious minds · Grades 8–9</span></footer>
      </main>
    </div>
    {modal && <ModalShell onClose={() => setModal(null)}><section className="modal"><div className="section-heading"><div><div className="eyebrow">START SOMETHING GOOD</div><h2 id="modal-title">Create an assignment</h2></div><button className="icon-button" aria-label="Close dialog" onClick={() => setModal(null)}><Icon name="close" /></button></div><form onSubmit={saveForm}><label>Assignment title<input name="title" autoFocus required maxLength={100} placeholder="e.g. Exploring plant cells" /></label><label>Classroom<select name="classId" required defaultValue={selectedClass === "all" ? classes[0]?.id : selectedClass}>{classes.map(item => <option key={item.id} value={item.id}>{item.name} · Grade {item.grade}</option>)}</select></label><label>Instructions<textarea name="instructions" required rows={4} placeholder="What should students investigate?" /></label><div className="form-grid"><label>Due date (optional)<input type="date" name="due" /></label><label>AI help level<select name="help">{helpLevels.map(level => <option key={level}>{level}</option>)}</select></label></div><p className="small-copy">Saved as a local demo. Publishing and AI settings require backend integration.</p><div className="modal-actions"><button type="button" className="button secondary" onClick={() => setModal(null)}>Cancel</button><button className="button primary" type="submit" disabled={!classes.length}>Create assignment<Icon name="arrow" size={17} /></button></div></form></section></ModalShell>}
  </div>;
}

export default App;

