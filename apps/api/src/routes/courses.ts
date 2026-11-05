import { Router } from "express";
import { findTeacherByEmail, createTeacher } from "../db/teachers.js";
import bcrypt from "bcryptjs";

import { requireTeacher } from "../middleware/auth.js";
import {getCoursesForTeacher} from "../db/course.js"

export const coursesRouter = Router()


coursesRouter.get("/", requireTeacher, async (req, res) => {
  res.json(await getCoursesForTeacher(req.teacher!.id));
});
