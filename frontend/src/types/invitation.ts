export type InvitationKind = "TUTOR" | "ALUMNO";

export const INVITATION_KIND_LABELS: Record<InvitationKind, string> = {
  ALUMNO: "Alumno",
  TUTOR: "Tutor",
};

/** Invitación recién generada, como la devuelve POST /invitations. */
export type NewInvitation = {
  id: number;
  kind: InvitationKind;
  token: string;
  /** La URL completa que se comparte o se vuelve QR. */
  url: string;
  expiresAt: string;
  note: string | null;
  diasDeVigencia: number;
};

/** Invitación en la lista del profesor. */
export type InvitationRow = {
  id: number;
  kind: InvitationKind;
  token: string;
  url: string;
  note: string | null;
  expiresAt: string;
  createdAt: string;
  usada: boolean;
  caducada: boolean;
  alumnoLigado: string | null;
};

/** Lo que ve quien abre el enlace, antes de llenar nada. */
export type PublicInvitation = {
  kind: InvitationKind;
  /** Nombre del profesor o admin que la generó. */
  invitadoPor: string;
  expiresAt: string;
  /** Si la invitación es para sumar un tutor a un alumno que ya existe. */
  alumnoLigado: string | null;
};

/** Datos que manda el formulario del alumno. */
export type EnrollStudentPayload = {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  birthDate?: string;
  phone?: string;
  guardianName?: string;
  guardianPhone?: string;
  medicalNotes?: string;
};

export type ChildPayload = {
  firstName: string;
  lastName: string;
  birthDate?: string;
  medicalNotes?: string;
};

/** Datos que manda el formulario del tutor: los suyos y los de sus hijos. */
export type EnrollGuardianPayload = {
  email: string;
  password: string;
  name: string;
  phone?: string;
  relationship?: "MADRE" | "PADRE" | "TUTOR";
  children: ChildPayload[];
};
