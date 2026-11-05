import { z } from "zod";

export const UserRole = {
  instructor: "instructor",
  student: "student",
  admin: "admin",
} as const;
export type UserRole = (typeof UserRole)[keyof typeof UserRole];

export interface User {
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  role: UserRole;
  coursesRegistered: string[];
  settings: UserSettings;
  id: string;
  verified: boolean;
  practiceQuestionRecord: {
    seenIds: string[];
    attemptedIds: string[];
    solvedIds: string[];
  };
}

export const userSettingsSchema = z.object({
  lastSelectedCourse: z.string(),
});

export type UserSettings = z.infer<typeof userSettingsSchema>;

export const VerifiedStatus = {
  verified: "verified",
  unverified: "unverified",
  all: "all",
} as const;
export type VerifiedStatus = (typeof VerifiedStatus)[keyof typeof VerifiedStatus];
export const verifiedStatusSchema = z.enum([
  VerifiedStatus.verified,
  VerifiedStatus.unverified,
  VerifiedStatus.all,
]);
