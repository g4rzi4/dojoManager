export type Teacher = {
  id: number;
  name: string;
  email: string;
  /** Clave única, p. ej. "PROF-7K2M". Se escribe al registrar alumnos. */
  teacherCode: string | null;
  active: boolean;
  /** Cuántos alumnos tiene asignados. */
  alumnos: number;
  createdAt: string;
};
