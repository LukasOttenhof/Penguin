// Frontend demo data only. Replace this with the teacher's assigned classrooms
// when the authenticated API is available; enrollment is managed by an admin.
export type ClassroomStudent = {
  id: string;
  displayName: string;
  username: string;
};

export type Classroom = {
  id: string;
  name: string;
  grade: 8 | 9;
  unit: string;
  students: ClassroomStudent[];
};

export const assignedClassrooms: Classroom[] = [
  {
    id: "cells",
    name: "Science · Period 2",
    grade: 8,
    unit: "Cells & systems",
    students: [
      { id: "s-1", displayName: "Amelia B.", username: "amelia.b8" },
      { id: "s-2", displayName: "Ethan C.", username: "ethan.c8" },
      { id: "s-3", displayName: "Isla D.", username: "isla.d8" },
      { id: "s-4", displayName: "Liam K.", username: "liam.k8" },
      { id: "s-5", displayName: "Maya L.", username: "maya.l8" },
      { id: "s-6", displayName: "Noah M.", username: "noah.m8" },
      { id: "s-7", displayName: "Oliver R.", username: "oliver.r8" },
      { id: "s-8", displayName: "Sofia T.", username: "sofia.t8" },
    ],
  },
  {
    id: "electricity",
    name: "Science · Period 4",
    grade: 9,
    unit: "Electricity & circuits",
    students: [
      { id: "s-9", displayName: "Aiden H.", username: "aiden.h9" },
      { id: "s-10", displayName: "Chloe J.", username: "chloe.j9" },
      { id: "s-11", displayName: "Emma N.", username: "emma.n9" },
      { id: "s-12", displayName: "Lucas P.", username: "lucas.p9" },
      { id: "s-13", displayName: "Mateo S.", username: "mateo.s9" },
      { id: "s-14", displayName: "Zoe W.", username: "zoe.w9" },
    ],
  },
];
