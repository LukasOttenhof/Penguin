import { useEffect, useRef, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import "./App.css";

type Page = "Overview" | "Classes" | "Assignments" | "Course materials" | "Student workspace";
type HelpLevel = "Hints only" | "Explain concepts" | "Open help" | "Assistant off";
type Classroom = { id: string; name: string; unit: string; code: string };
type Assignment = { id: string; title: string; classId: string; due: string; help: HelpLevel; instructions: string };
type Material = { id: string; name: string; classId: string; size: string };
type Workspace = { text: string; submitted: boolean };
const initialClasses: Classroom[] = [
  { id: "cells", name: "Grade 8 · Science", unit: "Cells & systems", code: "CELL8A" },
  { id: "electricity", name: "Grade 9 · Science", unit: "Electricity & circuits", code: "VOLT9B" },
];
const initialAssignments: Assignment[] = [
  { id: "cell-lab", title: "A closer look at cells", classId: "cells", due: "", help: "Hints only", instructions: "Compare plant and animal cells. Write a hypothesis, describe your observations, and explain how each structure supports the cell. Use evidence from your class material." },
  { id: "circuit-lab", title: "Build a better circuit", classId: "electricity", due: "", help: "Explain concepts", instructions: "Investigate how adding a bulb changes a series circuit. Record your prediction, procedure, observations, and conclusion." },
];
const pages: Page[] = ["Overview", "Classes", "Assignments", "Course materials", "Student workspace"];
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
  const paths: Record<string, ReactNode> = {
    Overview: <><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></>,
    Classes: <><path d="M3 5h7l2 2h9v13H3z" /><path d="M8 12h8M8 16h5" /></>,
    Assignments: <><rect x="5" y="4" width="14" height="17" rx="2" /><path d="M9 3h6v4H9zM9 12h6M9 16h4" /></>,
    "Course materials": <path d="M12 5v16M12 5C8 2 3 4 3 4v15s5-2 9 2c4-4 9-2 9-2V4s-5-2-9 1z" />,
    "Student workspace": <><rect x="2" y="4" width="20" height="16" rx="2" /><path d="M7 4v16M17 4v16M10 9h4M10 13h4" /></>,
    plus: <path d="M12 5v14M5 12h14" />,
    arrow: <path d="M5 12h14m-5-5 5 5-5 5" />,
    spark: <><path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5z" /><path d="m20 2 .5 1.5L22 4l-1.5.5L20 6l-.5-1.5L18 4l1.5-.5z" /></>,
    check: <path d="m5 12 4 4L19 6" />,
    menu: <path d="M4 6h16M4 12h16M4 18h16" />,
    close: <path d="m6 6 12 12M6 18 18 6" />,
    upload: <path d="M12 16V3m-5 5 5-5 5 5M4 15v6h16v-6" />,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name] ?? paths.Assignments}</svg>;
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
  const [page, setPage] = useState<Page>("Overview");
  const [menuOpen, setMenuOpen] = useState(false);
  const [modal, setModal] = useState<"class" | "assignment" | null>(null);
  const [classes, setClasses, classError] = useStoredState("penguin.classes.v1", initialClasses);
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

  function navigate(next: Page) { setPage(next); setMenuOpen(false); setSearch(""); setNotice(""); }
  function openWorkspace(id: string) { setActiveAssignment(id); navigate("Student workspace"); }
  function saveForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const title = String(data.get("title") ?? "").trim();
    if (!title) return;
    const id = crypto.randomUUID();
    if (modal === "class") {
      setClasses([...classes, { id, name: title, unit: String(data.get("unit")).trim(), code: id.replaceAll("-", "").slice(0, 6).toUpperCase() }]);
      navigate("Classes");
    } else {
      setAssignments([...assignments, { id, title, classId: String(data.get("classId")), due: String(data.get("due")), help: String(data.get("help")) as HelpLevel, instructions: String(data.get("instructions")).trim() }]);
      setSelectedClass("all"); navigate("Assignments");
    }
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
      <a className="brand" href="#" onClick={event => { event.preventDefault(); navigate("Overview"); }}><span className="brand-symbol">p<span>°</span></span>penguin<span className="brand-dot">.</span></a>
      <div className="workspace-label">YOUR WORKSPACE <span>DEMO</span></div>
      <nav>{pages.map(item => <button key={item} className={`nav-item ${page === item ? "active" : ""}`} aria-current={page === item ? "page" : undefined} onClick={() => navigate(item)}><Icon name={item} />{item}{item === "Classes" && <span className="nav-count">{classes.length}</span>}</button>)}</nav>
      <div className="sidebar-bottom"><div className="sidebar-note"><Icon name="spark" /><strong>A little curiosity.<br />A lot of possibility.</strong><p>A space for the next generation of scientific thinkers.</p></div><div className="profile"><span className="avatar">AT</span><div><strong>Alex Taylor</strong><small>Teacher · Demo account</small></div></div></div>
    </aside>
    <div className="main-shell">
      <header className="topbar"><div className="breadcrumb"><button className="icon-button mobile-menu" aria-label="Toggle navigation" aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}><Icon name="menu" /></button><span>Workspace</span><span className="slash">/</span><strong>{page}</strong></div><span className="demo-label"><span /> Synthetic classroom demo</span></header>
      <main id="main-content">
        <div className="page-heading"><div><div className="eyebrow">LET CURIOSITY LEAD</div><h1>{page === "Overview" ? "Good things start with a question." : page}</h1><p>{page === "Overview" ? "Your science classroom, with a little more room to explore." : page === "Classes" ? "Bring your learners together. Make space for discovery." : page === "Assignments" ? "Give every investigation a clear starting point." : page === "Course materials" ? "Keep your classroom knowledge in one place." : "A place to think, investigate, and make connections."}</p></div><button className="button primary" onClick={() => setModal(page === "Classes" ? "class" : "assignment")}><Icon name="plus" size={18} />{page === "Classes" ? "Create class" : "New assignment"}</button></div>
        <div className="demo-banner"><Icon name="check" size={16} /><span>Explore with sample data. Changes save in this browser; accounts, uploads, and AI are not connected yet.</span></div>
        {(classError || assignmentError || materialError || workspaceError) && <p role="alert" className="error-banner">Browser storage is unavailable or full. Your latest changes are only saved for this session.</p>}
        {notice && <div role="status" className="notice">{notice}<button className="icon-button" aria-label="Dismiss notification" onClick={() => setNotice("")}><Icon name="close" size={16} /></button></div>}

        {page === "Overview" && <>
          <section className="welcome-card"><div className="welcome-copy"><span className="pill light">THE CLASSROOM, REIMAGINED</span><h2>More discovery.<br />More <em>“I get it.”</em></h2><p>Turn big questions into hands-on learning.<br />Set up a class and let the exploration begin.</p><button className="button dark" onClick={() => setModal("class")}>Create a class <Icon name="arrow" size={18} /></button></div><div className="science-art" aria-hidden="true"><div className="orbit orbit-one" /><div className="orbit orbit-two" /><div className="art-star">✳</div><div className="art-label label-one">What if…</div><div className="flask"><div className="flask-neck" /><div className="flask-body"><i /><i /><i /><div className="liquid" /></div></div><div className="art-label label-two">Let's find out.</div><div className="art-dot" /></div></section>
          <section className="stats" aria-label="Workspace totals">{[{ label: "Your classes", value: classes.length, icon: "Classes", caption: "Spaces to learn together" }, { label: "Assignments", value: assignments.length, icon: "Assignments", caption: "Questions worth exploring" }, { label: "Course materials", value: materials.length, icon: "Course materials", caption: "Resources for discovery" }].map(stat => <button className="stat-card" key={stat.label} onClick={() => navigate(stat.icon as Page)}><div><span>{stat.label}</span><strong>{stat.value.toString().padStart(2, "0")}</strong><small>{stat.caption}</small></div><span className="stat-icon"><Icon name={stat.icon} /></span></button>)}</section>
          <div className="overview-grid"><section className="panel"><div className="section-heading"><div><h2>Your classes</h2><p>Small communities. Big ideas.</p></div><button className="text-button" onClick={() => navigate("Classes")}>View all <Icon name="arrow" size={16} /></button></div><div className="class-grid">{classes.slice(0, 2).map((item, index) => <button className={`class-card tone-${index % 2}`} key={item.id} onClick={() => { setSelectedClass(item.id); navigate("Assignments"); }}><div className="class-card-top"><span className="class-mark">{index % 2 ? "ϟ" : "✳"}</span><span className="pill">{assignments.filter(assignment => assignment.classId === item.id).length} assignments</span></div><h3>{item.name}</h3><p>{item.unit}</p><div className="class-card-footer">Explore class <Icon name="arrow" size={18} /></div></button>)}</div></section><section className="idea-card"><span className="idea-icon"><Icon name="spark" size={26} /></span><div className="eyebrow">BUILT FOR BETTER QUESTIONS</div><h2>A guide.<br />Not an answer key.</h2><p>Choose how much help students get, from gentle hints to deeper explanations.</p><button className="text-button" onClick={() => setModal("assignment")}>Set up an assignment <Icon name="arrow" size={17} /></button></section></div>
          <section className="panel"><div className="section-heading"><div><h2>Ready for exploration</h2><p>Pick up an investigation in the student demo.</p></div><button className="text-button" onClick={() => { setSelectedClass("all"); navigate("Assignments"); }}>All assignments <Icon name="arrow" size={16} /></button></div>{assignmentList(assignments.slice(0, 3))}</section>
        </>}

        {page === "Classes" && <section className="class-grid full-grid">{classes.map((item, index) => <article className={`class-card tone-${index % 2}`} key={item.id}><div className="class-card-top"><span className="class-mark">{index % 2 ? "ϟ" : "✳"}</span><span className="pill">Demo class</span></div><h2>{item.name}</h2><p>{item.unit}</p><div className="join-code">Join code <strong>{item.code}</strong></div><p className="small-copy">Demo code only. Student enrollment is not connected.</p><button className="button secondary" onClick={() => { setSelectedClass(item.id); navigate("Assignments"); }}>View assignments <Icon name="arrow" size={17} /></button></article>)}</section>}

        {page === "Assignments" && <section className="panel"><div className="filters"><label className="search-label">Search assignments<input placeholder="Search by title…" value={search} onChange={event => setSearch(event.target.value)} /></label><label>Class<select value={selectedClass} onChange={event => setSelectedClass(event.target.value)}><option value="all">All classes</option>{classes.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><span className="result-count">{visibleAssignments.length} assignments</span></div>{assignmentList(visibleAssignments)}</section>}

        {page === "Course materials" && <section className="panel"><div className="section-heading"><div><h2>Your resource library</h2><p>Organize course materials by class.</p></div></div><div className="upload-area"><span className="stat-icon"><Icon name="upload" size={26} /></span><h3>A starting point for every discovery</h3><p>Add PDF, DOCX, PPTX, TXT, or Markdown files.</p><label className="upload-class">Class<select value={selectedClass === "all" ? classes[0]?.id : selectedClass} onChange={event => setSelectedClass(event.target.value)}>{classes.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label className="button primary upload-button"><Icon name="plus" size={18} />Choose files<input aria-label="Choose course material files" type="file" multiple accept=".pdf,.docx,.pptx,.txt,.md,.markdown" onChange={event => { const files = Array.from(event.target.files ?? []); const allowed = files.filter(file => /\.(pdf|docx|pptx|txt|md|markdown)$/i.test(file.name)); setMaterials([...materials, ...allowed.map(file => ({ id: crypto.randomUUID(), name: file.name, classId: selectedClass === "all" ? classes[0].id : selectedClass, size: `${Math.max(1, Math.round(file.size / 1024))} KB` }))]); setNotice(`${allowed.length} file reference(s) added. Only names and sizes are saved; document contents are not uploaded or available to AI.${allowed.length < files.length ? " Unsupported files were skipped." : ""}`); event.target.value = ""; }} /></label><small>Demo: stores file references only. Document ingestion is not connected.</small></div>{materials.map(item => <div className="material-row" key={item.id}><Icon name="Course materials" /><div><strong>{item.name}</strong><small>{getClass(item.classId)?.name} · {item.size} · Reference only</small></div><button className="text-button" onClick={() => setMaterials(materials.filter(material => material.id !== item.id))} aria-label={`Remove ${item.name}`}>Remove</button></div>)}</section>}

        {page === "Student workspace" && <><div className="workspace-toolbar"><label>Assignment<select value={currentAssignment?.id ?? ""} onChange={event => setActiveAssignment(event.target.value)}>{assignments.map(item => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label><span className="pill">Student demo</span></div>{currentAssignment && <div className="student-layout"><aside className="workspace-panel"><div className="eyebrow">EXPLORER</div><h3>{currentAssignment.title}</h3><span className="pill">{getClass(currentAssignment.classId)?.name}</span><h4>Assignment instructions</h4><p>{currentAssignment.instructions}</p><h4>Course material</h4><p>{materials.filter(item => item.classId === currentAssignment.classId).length} file references. Document content is not connected yet.</p></aside><section className="editor-panel"><div className="editor-header"><span><Icon name="Assignments" size={17} /> Investigation notes</span><small>{workspace.submitted ? "Submitted · Locked" : workspaceError ? "Not saved to browser" : "Saved in this browser"}</small></div><label className="sr-only" htmlFor="investigation">Investigation notes</label><textarea id="investigation" value={workspace.text} disabled={workspace.submitted} placeholder={"Start with a question…\n\nHypothesis\nWhat do you think will happen?\n\nObservations\nWhat did you notice?\n\nConclusion\nWhat does the evidence tell you?"} onChange={event => updateWorkspace({ text: event.target.value, submitted: false })} /><div className="editor-footer"><span>{workspace.text.trim() ? workspace.text.trim().split(/\s+/).length : 0} words</span><button className="button primary" disabled={!workspace.text.trim()} onClick={() => updateWorkspace({ ...workspace, submitted: !workspace.submitted })}>{workspace.submitted ? "Reopen as teacher" : "Submit demo work"}<Icon name="check" size={16} /></button></div></section><aside className="workspace-panel assistant-panel"><span className="idea-icon"><Icon name="spark" /></span><h3>Your thinking partner</h3><span className="pill">{currentAssignment.help}</span><p>{currentAssignment.help === "Assistant off" ? "The assistant is switched off for this assignment." : "A little guidance to help you reach your own conclusions."}</p><div className="assistant-placeholder"><strong>AI assistant coming next</strong><p>Course-grounded chat and document citations need the server integration. No messages are sent from this demo.</p></div></aside></div>}</>}
        <footer className="page-footer"><span>penguin<span className="brand-dot">.</span> <span>A little help. A world of discovery.</span></span><span>Made for curious minds · Grades 8–9</span></footer>
      </main>
    </div>
    {modal && <ModalShell onClose={() => setModal(null)}><section className="modal"><div className="section-heading"><div><div className="eyebrow">START SOMETHING GOOD</div><h2 id="modal-title">{modal === "class" ? "Create a class" : "Create an assignment"}</h2></div><button className="icon-button" aria-label="Close dialog" onClick={() => setModal(null)}><Icon name="close" /></button></div><form onSubmit={saveForm}><label>{modal === "class" ? "Class name" : "Assignment title"}<input name="title" autoFocus required maxLength={100} placeholder={modal === "class" ? "e.g. Grade 8 · Science B" : "e.g. Exploring plant cells"} /></label>{modal === "class" ? <label>Unit<input name="unit" required maxLength={100} placeholder="e.g. Cells & systems" /></label> : <><label>Class<select name="classId" defaultValue={selectedClass === "all" ? classes[0]?.id : selectedClass}>{classes.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label>Instructions<textarea name="instructions" required rows={4} placeholder="What should students investigate?" /></label><div className="form-grid"><label>Due date (optional)<input type="date" name="due" /></label><label>AI help level<select name="help">{helpLevels.map(level => <option key={level}>{level}</option>)}</select></label></div></>}<p className="small-copy">Saved as a local demo. Publishing, enrollment, and AI settings require backend integration.</p><div className="modal-actions"><button type="button" className="button secondary" onClick={() => setModal(null)}>Cancel</button><button className="button primary" type="submit">{modal === "class" ? "Create class" : "Create assignment"}<Icon name="arrow" size={17} /></button></div></form></section></ModalShell>}
  </div>;
}

export default App;

