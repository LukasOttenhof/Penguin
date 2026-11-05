// Adds our own fields to Express's Request type so TypeScript knows about
// req.user (set by login/session) and req.teacher (set by requireTeacher).
import type { Teacher } from "../db/teachers.js";

declare global {
  namespace Express {
    interface Request {
      user?: { id: number; role: "teacher" | "student" };
      teacher?: Teacher;
    }
  }
}

export {};
