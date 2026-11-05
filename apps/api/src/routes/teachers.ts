import { Router } from "express";
import { findTeacherByEmail, createTeacher } from "../db/teachers.js";
import bcrypt from "bcryptjs";
import {pool} from "../db.js";
import { createTeacherSchema } from "../validation/teachers_validation.js";
import { createSession, SESSION_DAYS } from "../db/sessions.js";
import { requireTeacher } from "../middleware/auth.js";



export const teachersRouter = Router()// POST /teachers — create a teacher account.


const cookieOptions = {
  httpOnly: true,                                   // JS can't read it
  sameSite: "lax" as const,                         // not sent from other sites' forms
  secure: process.env.NODE_ENV === "production",    // HTTPS-only once deployed
  maxAge: SESSION_DAYS * 24 * 60 * 60 * 1000,       // in milliseconds
  path: "/",
};



teachersRouter.post("/create_teacher", async (req, res) => {

  const parsed = createTeacherSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid input", issues: parsed.error.issues });
  }
  const { first_name, last_name, email, password } = parsed.data;

// ensure teacher dont exist
  const existing = await findTeacherByEmail(email);
  if (existing) {
    return res.status(409).json({ error: "This email is already registered" });
  }

  try {
    const passwordHash = await bcrypt.hash(password, 12);
    const teacher = await createTeacher(first_name, last_name, email.toLowerCase(), passwordHash);
    const sessionId = await createSession("teacher", teacher.id);
    res.cookie("session", sessionId, cookieOptions);
    return res.status(201).json(teacher);
  } 
  catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Error registering" });
  }

});

teachersRouter.post("/login_teacher", async (req, res) => {
  const teacher = await findTeacherByEmail(req.body.email); // ensure teacher is real
  if (!teacher) {
    return res.status(401).json({ error: "Wrong email or password" });
  }

  const passwordOk = await bcrypt.compare(req.body.password, teacher.password_hash);
  if (!passwordOk) {
    return res.status(401).json({ error: "Wrong email or password" });
  }
  const sessionId = await createSession("teacher", teacher.id);
  res.cookie("session", sessionId, cookieOptions);
  res.json({ id: teacher.id, first_name: teacher.first_name });
});


// GET /teachers/info_teacher — the logged-in teacher.
// requireTeacher checks the session cookie and loads req.teacher (or replies 401/403).
teachersRouter.get("/info_teacher", requireTeacher, (req, res) => {
  res.json(req.teacher);
});




// teachersRouter.post("/delete_teacher", async (req, res) => {
//   const is_registered = pool.query{} // ensure teacher is real


// });
