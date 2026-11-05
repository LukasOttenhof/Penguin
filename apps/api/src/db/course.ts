import { pool } from "../db.js";



export async function getCoursesForTeacher(teacherId: number) {
    const result = await pool.query(
    "SELECT * FROM courses WHERE teacher_id = $1 ORDER BY created_at",
    [teacherId],
  );
  return result.rows;
}