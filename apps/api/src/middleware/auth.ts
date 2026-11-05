import type { Request, Response, NextFunction } from "express";
import { getTeacherById } from "../db/teachers.js";
import { getSession } from "../db/sessions.js";

// Only lets the request through if it comes from a logged-in teacher who
// still exists in the database. Relies on req.user being set by the login /
// session step, which isn't built yet — until then every request gets 403.
export async function requireTeacher(req: Request, res: Response, next: NextFunction) {
  if (req.user?.role !== "teacher") {
    return res.status(403).json({ error: "Teachers only" });
  }

  const teacher = await getTeacherById(req.user.id);
  if (!teacher) {
    return res.status(401).json({ error: "Account not found" });
  }

  req.teacher = teacher;
  next();
}


export async function loadUser(req: Request, _res: Response, next: NextFunction) {
  const sessionId = req.cookies?.session;
  if (sessionId) {
    req.user = await getSession(sessionId);
  }
  next();
}