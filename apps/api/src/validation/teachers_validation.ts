import { z } from "zod";

// Shape of the JSON body for POST /teachers.
export const createTeacherSchema = z.object({
  first_name: z.string().trim().min(1).max(100),
  last_name: z.string().trim().min(1).max(100),
  email: z.email().max(255),
  password: z.string().min(8).max(200),
});

export type CreateTeacherInput = z.infer<typeof createTeacherSchema>;
