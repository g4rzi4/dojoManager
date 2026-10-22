import type { DojoEvent } from "../types/event";

/**
 * ⚠️ DATOS DE EJEMPLO — PENDIENTE DE CONECTAR AL BACKEND
 *
 * El backend YA tiene el modelo Event en prisma/schema.prisma y su migración
 * aplicada, pero todavía no existe el endpoint. Estos datos son un
 * placeholder para que el calendario se pueda ver y maquetar.
 *
 * Quien tome el módulo de eventos (feature/events) debe:
 *   1. Crear GET /events en el backend, con requirePermission("events:read")
 *   2. Reemplazar el cuerpo de getEvents() por el fetch real
 *
 * Las categorías de types/event.ts ya coinciden con el enum EventCategory del
 * schema, así que la respuesta del backend encaja sin traducción.
 *
 * La firma ya es async a propósito, para que al cambiarla no haya que tocar
 * ningún componente.
 */

function dateInCurrentMonth(day: number): string {
  const today = new Date();
  const d = new Date(today.getFullYear(), today.getMonth(), day);

  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const dayStr = String(d.getDate()).padStart(2, "0");

  return `${year}-${month}-${dayStr}`;
}

const SAMPLE_EVENTS: DojoEvent[] = [
  { id: "1", title: "Clase de karate infantil", date: dateInCurrentMonth(3), time: "17:00", category: "CLASE" },
  { id: "2", title: "Clase de adultos", date: dateInCurrentMonth(3), time: "19:00", category: "CLASE" },
  { id: "3", title: "Cobro de mensualidades", date: dateInCurrentMonth(5), category: "PAGO" },
  { id: "4", title: "Examen de cinturón amarillo", date: dateInCurrentMonth(12), time: "10:00", category: "EXAMEN" },
  { id: "5", title: "Clase de adultos", date: dateInCurrentMonth(12), time: "19:00", category: "CLASE" },
  { id: "6", title: "Torneo regional", date: dateInCurrentMonth(18), time: "09:00", category: "TORNEO" },
  { id: "7", title: "Clase de karate infantil", date: dateInCurrentMonth(21), time: "17:00", category: "CLASE" },
  { id: "8", title: "Examen de cinturón verde", date: dateInCurrentMonth(26), time: "11:00", category: "EXAMEN" },
  { id: "9", title: "Junta de profesores", date: dateInCurrentMonth(28), time: "18:00", category: "CLASE" },
];

export async function getEvents(): Promise<DojoEvent[]> {
  // TODO(feature/events): reemplazar por
  // const res = await fetch(`${API_URL}/events`); return res.json();
  return SAMPLE_EVENTS;
}
