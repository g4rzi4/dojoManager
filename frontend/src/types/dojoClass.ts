/**
 * Horario de clases del dojo.
 *
 * Adaptado del trabajo de fernandosfn06 en la rama `Interfaces`, que tenía
 * la idea y la estructura de la pantalla. Aquí va migrado a la paleta y los
 * componentes del proyecto, y con los tipos que espera el backend.
 *
 * ⚠️ TODAVÍA NO SE GUARDA EN LA BASE. Falta, en este orden:
 *
 *   1. Modelo en backend/prisma/schema.prisma:
 *
 *        model DojoClass {
 *          id          Int      @id @default(autoincrement())
 *          title       String
 *          discipline  Discipline
 *          dayOfWeek   Int        // 0 = lunes ... 6 = domingo
 *          startTime   String     // "16:00"
 *          endTime     String     // "17:30"
 *          location    String
 *          level       Level
 *          capacity    Int
 *          teacherId   Int?
 *          teacher     User?      @relation(fields: [teacherId], references: [id], onDelete: SetNull)
 *          createdAt   DateTime   @default(now())
 *          updatedAt   DateTime   @updatedAt
 *          @@index([dayOfWeek])
 *        }
 *
 *   2. GET /classes con requirePermission("events:read")
 *      POST y DELETE /classes con requirePermission("events:write")
 *   3. Reemplazar el estado local de Classes.tsx por esas llamadas
 *
 * Reusamos los permisos de eventos a propósito: el horario es parte del
 * calendario del dojo, así que no hace falta un permiso nuevo ni migrar la
 * matriz de roles.
 */

export type Discipline =
  | "KARATE"
  | "JUDO"
  | "TAEKWONDO"
  | "DEFENSA_PERSONAL"
  | "ACONDICIONAMIENTO";

export type Level = "PRINCIPIANTES" | "INTERMEDIOS" | "AVANZADOS" | "MIXTO";

export type DojoClass = {
  id: string;
  title: string;
  discipline: Discipline;
  /** 0 = lunes, 6 = domingo. Como en el resto de la app, la semana empieza en lunes. */
  dayOfWeek: number;
  /** "16:00" */
  startTime: string;
  /** "17:30" */
  endTime: string;
  instructor: string;
  location: string;
  level: Level;
  capacity: number;
};

export const DISCIPLINE_LABELS: Record<Discipline, string> = {
  KARATE: "Karate",
  JUDO: "Judo",
  TAEKWONDO: "Taekwondo",
  DEFENSA_PERSONAL: "Defensa personal",
  ACONDICIONAMIENTO: "Acondicionamiento",
};

/** Un color por disciplina, con contraste suficiente del texto sobre su fondo. */
export const DISCIPLINE_STYLES: Record<
  Discipline,
  { card: string; dot: string }
> = {
  KARATE: {
    card: "bg-blue-50 border-blue-200 text-blue-900",
    dot: "bg-blue-600",
  },
  JUDO: {
    card: "bg-violet-50 border-violet-200 text-violet-900",
    dot: "bg-violet-600",
  },
  TAEKWONDO: {
    card: "bg-emerald-50 border-emerald-200 text-emerald-900",
    dot: "bg-emerald-600",
  },
  DEFENSA_PERSONAL: {
    card: "bg-amber-50 border-amber-200 text-amber-900",
    dot: "bg-amber-600",
  },
  ACONDICIONAMIENTO: {
    card: "bg-slate-100 border-slate-300 text-slate-900",
    dot: "bg-slate-600",
  },
};

export const LEVEL_LABELS: Record<Level, string> = {
  PRINCIPIANTES: "Principiantes",
  INTERMEDIOS: "Intermedios",
  AVANZADOS: "Avanzados",
  MIXTO: "Mixto",
};

export const DAY_NAMES = [
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
  "Domingo",
];

/** Lunes = 0, para que coincida con dayOfWeek. */
export function todayIndex(): number {
  return (new Date().getDay() + 6) % 7;
}
