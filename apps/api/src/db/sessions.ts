import crypto from "node:crypto";
import { pool } from "../db.js";

export type Role = "teacher" | "student";
export const SESSION_DAYS = 7;

export async function createSession(role: Role, userId: number): Promise<string> {
  const id = crypto.randomBytes(32).toString("base64url");
  const column = role === "teacher" ? "teacher_id" : "student_id";
  await pool.query(
    `INSERT INTO sessions (id, ${column}, expires_at)
     VALUES ($1, $2, now() + interval '${SESSION_DAYS} days')`,
    [id, userId],
  );
  return id;
}

export async function getSession(id: string) {
  const result = await pool.query(
    "SELECT teacher_id, student_id FROM sessions WHERE id = $1 AND expires_at > now()",
    [id],
  );
  const row = result.rows[0];
  if (!row) return undefined;
  return row.teacher_id
    ? { id: row.teacher_id as number, role: "teacher" as const }
    : { id: row.student_id as number, role: "student" as const };
}

export async function deleteSession(id: string) {
  await pool.query("DELETE FROM sessions WHERE id = $1", [id]);
}
