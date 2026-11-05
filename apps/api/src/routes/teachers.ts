import { Router } from "express";
import bcrypt from "bcryptjs";
import { createTeacherSchema } from "../validation/teachers.js";
import { createTeacher } from "../db/teachers.js";

export const teachersRouter = Router();

// POST /teachers — create a teacher account.
teachersRouter.post("/", async (req, res) => {
  // 1. Check the input
  const parsed = createTeacherSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid input", issues: parsed.error.issues });
  }
  const { first_name, last_name, email, password } = parsed.data;

  // 2. Hash the password — the raw password is never stored
  const passwordHash = await bcrypt.hash(password, 12);

  // 3. Insert, turning "email already used" into a clear 409
  try {
    const teacher = await createTeacher(first_name, last_name, email.toLowerCase(), passwordHash);
    return res.status(201).json(teacher);
  } catch (err) {
    if ((err as { code?: string }).code === "23505") {
      // Postgres error code for a UNIQUE violation
      return res.status(409).json({ error: "Email already registered" });
    }
    throw err;
  }
});
