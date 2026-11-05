import express from "express";
import { teachersRouter } from "./routes/teachers.js";
import cookieParser from "cookie-parser";
import { loadUser } from "./middleware/auth.js";
import {coursesRouter} from "./routes/courses.js";
const app = express();
const port = process.env.PORT ?? 3000;


app.use(express.json());
app.use(cookieParser());
app.use(loadUser);


app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/teachers", teachersRouter);

// TODO: re-enable once login exists (sets req.user) and db/course.ts has createCourse.
// app.post("/courses", requireTeacher, async (req, res) => {
//   const course = await createCourse(req.teacher!.id, req.body.name);
//   res.status(201).json(course);
// });

app.use("/courses", coursesRouter)

app.get("/auth/me", (req, res) => {
  if (!req.user) return res.status(401).json({ error: "Not logged in" });
  res.json(req.user);
});
app.listen(port, () => {
  console.log(`API server listening on port ${port}`);
});