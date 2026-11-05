import { pool } from "../db.js";

// A teacher as returned to the app. Deliberately excludes password_hash.
export interface Teacher {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  is_admin: boolean;
  created_at: Date;
}

export async function createTeacher(
  firstName: string,
  lastName: string,
  email: string,
  passwordHash: string,
): Promise<Teacher> {
  const result = await pool.query<Teacher>(
    `INSERT INTO teachers (first_name, last_name, email, password_hash)
     VALUES ($1, $2, $3, $4)
     RETURNING id, first_name, last_name, email, is_admin, created_at`,
    [firstName, lastName, email, passwordHash],
  );
  return result.rows[0];
}

export async function getTeacherById(id: number): Promise<Teacher | undefined> {
  const result = await pool.query<Teacher>(
    "SELECT id, first_name, last_name, email, is_admin, created_at FROM teachers WHERE id = $1",
    [id],
  );
  return result.rows[0]; // undefined if no teacher has that id
}




export async function findTeacherByEmail(email: string) {
  const result = await pool.query(
    "SELECT id, first_name, last_name, email, password_hash FROM teachers WHERE email = $1",
    [email.toLowerCase()],
  );
  return result.rows[0];
}