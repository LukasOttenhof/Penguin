import { Link } from "react-router";
import {
  penguinLogo,
  penguinWorkspace,
  penguinAssignments,
  penguinMaterials,
  penguinClassrooms,
  penguinScience,
  penguinMath,
} from "../brand-assets";
import "./Landing.css";

const steps = [
  {
    title: "Set up your class",
    text: "Create a class, upload your course material and tag it by unit — Gr 8 cells, Gr 9 electricity, and so on.",
  },
  {
    title: "Students join with a code",
    text: "Share the class join code and a username. No student email, birthdate or photo needed.",
  },
  {
    title: "Learn with a guide, not a shortcut",
    text: "Students work in their own workspace with an AI assistant that's grounded in your material and follows your rules.",
  },
];

const features = [
  {
    icon: penguinWorkspace,
    title: "A thinking partner, not an answer key",
    text: "The student assistant answers from your course material and cites the document and page. It knows the open assignment and its rubric, and pitches every reply at a Grade 8–9 reading level.",
  },
  {
    icon: penguinAssignments,
    title: "A real workspace for real investigations",
    text: "An editor-style layout with instructions and files on the left, writing in the centre and the assistant on the right. Separate files for hypothesis, procedure, data and conclusion, with tables, charts, equations and chemical formulas.",
  },
  {
    icon: penguinScience,
    title: "Plan units on an infinite canvas",
    text: "Brainstorm with sticky notes, shapes and document cards. Ask the AI for lab activities, question sets and misconceptions to target — then select notes and turn them into a draft assignment with a rubric.",
  },
  {
    icon: penguinMaterials,
    title: "Your material, your source of truth",
    text: "Upload PDF, Word, PowerPoint, text or Markdown files. The AI only draws on what's been shared with that class, and students never see each other's documents.",
  },
  {
    icon: penguinMath,
    title: "See where the class is stuck",
    text: "Rubric-aligned feedback drafts, misconception clusters with example evidence, score distributions, and the questions students ask the assistant most.",
  },
  {
    icon: penguinClassrooms,
    title: "Built for real classrooms",
    text: "Students can join several classes. Reset passwords, remove students, reopen submitted work, and see late flags after the due date.",
  },
];

const helpLevels = [
  { name: "Hints only", text: "Socratic questions that guide students toward their own answer. Never hands over answers to assessed questions." },
  { name: "Explain concepts", text: "Clarifies the science behind the task without doing the task." },
  { name: "Open help", text: "Full support for practice work and review." },
  { name: "Off", text: "Switch the assistant off entirely — for a quiz or test." },
];

const safety = [
  "Students give a display name only — first name and last initial",
  "Every AI conversation is logged and visible to the teacher",
  "Moderation on everything students send and receive",
  "Teachers approve all feedback; no AI grades are released automatically",
  "Student data is never used to train AI models",
  "Teachers can view, export or delete any student's data",
];

export default function Landing() {
  return (
    <div className="lp">
      <header className="lp-nav">
        <Link to="/" className="lp-brand">
          <img src={penguinLogo} alt="" />
          Penguin<span>.</span>
        </Link>
        <nav className="lp-nav-links" aria-label="Page sections">
          <a href="#how">How it works</a>
          <a href="#features">Features</a>
          <a href="#safety">Safety</a>
        </nav>
        <div className="lp-nav-actions">
          <Link to="/app" className="lp-btn lp-btn-ghost">Log in</Link>
          <Link to="/app" className="lp-btn lp-btn-primary">Get started</Link>
        </div>
      </header>

      <section className="lp-hero">
        <div className="lp-hero-copy">
          <p className="lp-eyebrow">AI SCIENCE PLATFORM FOR GRADES 8–9</p>
          <h1>Big discoveries start with a little curiosity.</h1>
          <p className="lp-lead">
            Penguin gives every student an AI thinking partner grounded in <em>your</em> course material —
            and gives you the tools to plan units, set the rules and see exactly where your class needs help.
          </p>
          <div className="lp-hero-actions">
            <Link to="/app" className="lp-btn lp-btn-primary lp-btn-lg">Create a teacher account</Link>
            <Link to="/app" className="lp-btn lp-btn-ghost lp-btn-lg">I'm a student</Link>
          </div>
        </div>
        <div className="lp-hero-art" aria-hidden="true" />
      </section>

      <section id="how" className="lp-section">
        <p className="lp-eyebrow">HOW IT WORKS</p>
        <h2>Up and running in one class period</h2>
        <ol className="lp-steps">
          {steps.map((step, i) => (
            <li key={step.title}>
              <span className="lp-step-num">{i + 1}</span>
              <h3>{step.title}</h3>
              <p>{step.text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section id="features" className="lp-section">
        <p className="lp-eyebrow">FEATURES</p>
        <h2>Everything a science class needs, in one place</h2>
        <div className="lp-features">
          {features.map(feature => (
            <article key={feature.title} className="lp-card">
              <img src={feature.icon} alt="" />
              <h3>{feature.title}</h3>
              <p>{feature.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="lp-section lp-band">
        <p className="lp-eyebrow">YOU'RE IN CONTROL</p>
        <h2>You decide how much help the AI gives</h2>
        <p className="lp-section-lead">
          Set the help level for each assignment. A second check blocks any reply that would give away the answer.
        </p>
        <div className="lp-levels">
          {helpLevels.map(level => (
            <div key={level.name} className="lp-level">
              <strong>{level.name}</strong>
              <p>{level.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="lp-section lp-split">
        <div className="lp-card lp-audience">
          <p className="lp-eyebrow">FOR TEACHERS</p>
          <h3>Less prep, more insight</h3>
          <ul>
            <li>Turn brainstorms into assignments and rubrics in minutes</li>
            <li>Get feedback drafts you edit and approve</li>
            <li>See misconceptions across the whole class at a glance</li>
            <li>Read-only view of any student's workspace</li>
            <li>Export results as CSV or PDF</li>
          </ul>
        </div>
        <div className="lp-card lp-audience">
          <p className="lp-eyebrow">FOR STUDENTS</p>
          <h3>Help that makes you think</h3>
          <ul>
            <li>Highlight part of your work and ask about it</li>
            <li>Answers come from your class notes, with page references</li>
            <li>Autosave and version history — never lose your work</li>
            <li>One place for every file in an investigation</li>
            <li>Explanations written for your grade level</li>
          </ul>
        </div>
      </section>

      <section id="safety" className="lp-section">
        <p className="lp-eyebrow">SAFETY AND PRIVACY</p>
        <h2>Designed for students aged 13–15</h2>
        <ul className="lp-safety">
          {safety.map(item => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <section className="lp-cta">
        <h2>Ready to bring Penguin to your classroom?</h2>
        <p>Create your class and share a join code with your students today.</p>
        <Link to="/app" className="lp-btn lp-btn-primary lp-btn-lg">Get started — it's free</Link>
      </section>

      <footer className="lp-footer">
        <span>© {new Date().getFullYear()} Penguin</span>
        <span>Built for Grade 8–9 science classrooms</span>
      </footer>
    </div>
  );
}
