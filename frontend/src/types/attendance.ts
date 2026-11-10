import type { Belt } from "./student";

export type AttendanceStudent = {
  id: number;
  firstName: string;
  lastName: string;
  currentBelt: Belt;
  teacherName: string | null;
  /** null mientras no se ha pasado lista. */
  present: boolean | null;
};
