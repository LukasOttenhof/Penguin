import { penguinClassrooms, penguinScience } from "../../brand-assets";
import { useState } from "react";
import type { Classroom } from "./classroom-data";
import "./Classrooms.css";

type Props = {
  classrooms: Classroom[];
  activeClassroomId: string | null;
  onOpenClassroom: (id: string) => void;
  onBack: () => void;
};

function EmptyClassroom({ title, children }: { title: string; children: string }) {
  return <div className="classroom-empty">
    <img src={penguinClassrooms} alt="" width="72" height="72" />
    <h2>{title}</h2>
    <p>{children}</p>
  </div>;
}

function StudentRoster({ classroom }: { classroom: Classroom }) {
  const [search, setSearch] = useState("");
  const query = search.trim().toLocaleLowerCase();
  const students = classroom.students.filter(student =>
    student.displayName.toLocaleLowerCase().includes(query) || student.username.toLocaleLowerCase().includes(query),
  ).toSorted((a, b) => a.displayName.localeCompare(b.displayName));

  return <section className="panel roster-panel" aria-labelledby="roster-title">
    <div className="classroom-section-header">
      <div><h2 id="roster-title">Students <span className="student-count">{classroom.students.length}</span></h2><p>Your administrator manages this classroom’s roster.</p></div>
      <label className="roster-search">Search students<input type="search" placeholder="Search by name or username…" value={search} onChange={event => setSearch(event.target.value)} /></label>
    </div>
    {classroom.students.length === 0 ? <EmptyClassroom title="Your huddle is on its way">Your administrator hasn’t assigned students to this classroom yet. They’ll appear here once assigned.</EmptyClassroom>
      : students.length === 0 ? <div className="classroom-empty" role="status"><h3>No students found</h3><p>Try a different name or username.</p><button className="button secondary" onClick={() => setSearch("")}>Clear search</button></div>
        : <div className="roster-table-wrap"><table className="roster-table">
          <caption className="sr-only">Students assigned to {classroom.name}</caption>
          <thead><tr><th scope="col">Student name</th><th scope="col">Username</th></tr></thead>
          <tbody>{students.map(student => <tr key={student.id}>
            <td><div className="student-name"><span className="student-avatar" aria-hidden="true">{student.displayName.split(" ").map(part => part[0]).join("")}</span><span>{student.displayName}</span></div></td>
            <td><span className="student-username">{student.username}</span></td>
          </tr>)}</tbody>
        </table></div>}
    {classroom.students.length > 0 && <p className="roster-results" role="status">Showing {students.length} of {classroom.students.length} students</p>}
  </section>;
}

export default function Classrooms({ classrooms, activeClassroomId, onOpenClassroom, onBack }: Props) {
  const classroom = classrooms.find(item => item.id === activeClassroomId);
  if (classrooms.length === 0) return <section className="panel"><EmptyClassroom title="Your classroom is on its way">Your administrator hasn’t assigned a classroom yet. Your classrooms and students will appear here once assigned.</EmptyClassroom></section>;

  if (classroom) return <>
    <button className="text-button classroom-back" onClick={onBack}><span aria-hidden="true">←</span> All classrooms</button>
    <section className="classroom-summary" aria-label="Classroom overview">
      <div className="classroom-badge" aria-hidden="true"><img src={penguinScience} width="64" height="64" alt="" /></div>
      <div><span className="pill">Grade {classroom.grade}</span><h2>{classroom.name}</h2><p>{classroom.unit}</p></div>
      <div className="classroom-total"><strong>{classroom.students.length}</strong><span>assigned students</span></div>
    </section>
    <div className="classroom-section-label">Students</div>
    <StudentRoster key={classroom.id} classroom={classroom} />
  </>;

  return <>
    <div className="classroom-list-heading"><h2>Your classrooms <span className="student-count">{classrooms.length}</span></h2><p>Assigned by your administrator. Ready for your next discovery.</p></div>
    <div className="classroom-cards">{classrooms.map((item, index) => <article className={`assigned-classroom ${index % 2 ? "gold" : ""}`} key={item.id}>
      <div className="assigned-classroom-top"><span className="classroom-badge" aria-hidden="true"><img src={penguinScience} width="48" height="48" alt="" /></span><span className="pill">Grade {item.grade}</span></div>
      <h3>{item.name}</h3><p>{item.unit}</p>
      <div className="assigned-classroom-count"><strong>{item.students.length}</strong> {item.students.length === 1 ? "student" : "students"}</div>
      <button className="button dark" onClick={() => onOpenClassroom(item.id)} aria-label={`Open classroom: ${item.name}, Grade ${item.grade}`}>Open classroom <span aria-hidden="true">→</span></button>
    </article>)}</div>
    <p className="classroom-admin-note">Missing a classroom or student? Contact your administrator to update your assignments.</p>
  </>;
}
