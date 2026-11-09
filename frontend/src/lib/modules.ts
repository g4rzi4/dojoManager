import {
  Bell,
  CalendarDays,
  CalendarRange,
  GraduationCap,
  IdCard,
  LayoutDashboard,
  Receipt,
  SlidersHorizontal,
  Users,
} from "lucide-react";

/**
 * El color de cada módulo del dojo.
 *
 * Cada área tiene el suyo y aparece igual en el menú, en el título de la
 * pantalla y en sus accesos, para ubicarse de un vistazo. Las clases van
 * completas porque Tailwind solo genera las que encuentra escritas tal cual.
 */
export const MODULES = {
  inicio: {
    icon: LayoutDashboard,
    tile: "border-violet-200 bg-violet-50 text-violet-600 [--tile-shadow:var(--color-violet-400)]",
  },
  profesores: {
    icon: GraduationCap,
    tile: "border-sky-200 bg-sky-50 text-sky-700 [--tile-shadow:var(--color-sky-400)]",
  },
  alumnos: {
    icon: Users,
    tile: "border-emerald-200 bg-emerald-50 text-emerald-700 [--tile-shadow:var(--color-emerald-400)]",
  },
  eventos: {
    icon: CalendarDays,
    tile: "border-rose-200 bg-rose-50 text-rose-600 [--tile-shadow:var(--color-rose-400)]",
  },
  horario: {
    icon: CalendarRange,
    tile: "border-orange-200 bg-orange-50 text-orange-700 [--tile-shadow:var(--color-orange-400)]",
  },
  pagos: {
    icon: Receipt,
    tile: "border-amber-200 bg-amber-50 text-amber-700 [--tile-shadow:var(--color-amber-400)]",
  },
  notificaciones: {
    icon: Bell,
    tile: "border-fuchsia-200 bg-fuchsia-50 text-fuchsia-700 [--tile-shadow:var(--color-fuchsia-400)]",
  },
  tarjeta: {
    icon: IdCard,
    tile: "border-lime-300 bg-lime-50 text-lime-700 [--tile-shadow:var(--color-lime-400)]",
  },
  preferencias: {
    icon: SlidersHorizontal,
    tile: "border-indigo-200 bg-indigo-50 text-indigo-700 [--tile-shadow:var(--color-indigo-400)]",
  },
} as const;

export type ModuleKey = keyof typeof MODULES;
