export type NotificationKind = "AUTOMATICA" | "AVISO";

export type NotificationTopic =
  | "PAGO"
  | "GRADUACION"
  | "ASISTENCIA"
  | "EVENTO"
  | "GENERAL";

export type AppNotification = {
  id: number;
  kind: NotificationKind;
  topic: NotificationTopic;
  title: string;
  body: string;
  /** Ruta del frontend a la que lleva, si aplica. */
  link: string | null;
  read: boolean;
  createdAt: string;
  /** Quién la redactó, si es un AVISO. */
  author: string | null;
};

export const TOPIC_LABELS: Record<NotificationTopic, string> = {
  PAGO: "Pagos",
  GRADUACION: "Graduación",
  ASISTENCIA: "Asistencia",
  EVENTO: "Eventos",
  GENERAL: "Aviso del dojo",
};

/** Colores por tema, con contraste suficiente del texto sobre su fondo. */
export const TOPIC_STYLES: Record<NotificationTopic, string> = {
  PAGO: "bg-amber-50 text-amber-900 border-amber-200",
  GRADUACION: "bg-violet-50 text-violet-800 border-violet-200",
  ASISTENCIA: "bg-red-50 text-red-800 border-red-200",
  EVENTO: "bg-blue-50 text-blue-800 border-blue-200",
  GENERAL: "bg-neutral-100 text-neutral-800 border-neutral-300",
};

/** A quiénes se le puede mandar un aviso. Coincide con el backend. */
export const AUDIENCES = [
  { value: "alumnos-y-tutores", label: "Alumnos y tutores" },
  { value: "alumnos", label: "Solo alumnos" },
  { value: "tutores", label: "Solo tutores" },
  { value: "profesores", label: "Solo profesores" },
  { value: "todos", label: "Todos, incluido el administrador" },
] as const;

export type Audience = (typeof AUDIENCES)[number]["value"];
