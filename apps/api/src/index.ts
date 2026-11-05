import express from "express";
import { teachersRouter } from "./routes/teachers.js";

const app = express();
const port = process.env.PORT ?? 3000;

app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/teachers", teachersRouter);

// TODO: re-enable once login exists (sets req.user) and db/course.ts has createCourse.
// app.post("/courses", requireTeacher, async (req, res) => {
//   const course = await createCourse(req.teacher!.id, req.body.name);
//   res.status(201).json(course);
// });

app.listen(port, () => {
  console.log(`API server listening on port ${port}`);
});
