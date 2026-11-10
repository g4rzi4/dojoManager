import { useState } from "react";
import { CircleCheck, CircleX } from "lucide-react";

import { ApiError, respondToEvent } from "../services/api";
import { t } from "../i18n";
import type { DojoEvent } from "../types/event";
import type { MyStudent } from "../types/payment";

type Props = {
  event: DojoEvent;
  misAlumnos: MyStudent[];
  onCambio: () => void | Promise<void>;
  /** Abre el panel de pago del evento. */
  onPagar: () => void;
};

const BOTON = `
  inline-flex min-h-10 cursor-pointer items-center gap-1.5 rounded-xl px-3 py-1.5
  text-sm font-semibold transition-colors duration-200 motion-reduce:transition-none
  focus-visible:ring-2 focus-visible:ring-violet-600 focus-visible:ring-offset-2 focus-visible:outline-none
  disabled:cursor-not-allowed disabled:opacity-50
`;
const PRIMARIO = `${BOTON} bg-violet-600 text-white hover:bg-violet-700`;
const SECUNDARIO = `${BOTON} border border-neutral-300 bg-surface text-neutral-700 hover:bg-neutral-50`;

type Estado =
  | "INSCRITO"
  | "PAGO_POR_CONFIRMAR"
  | "FALTA_PAGAR"
  | "NO_ASISTIRA"
  | "SIN_RESPUESTA";

const ETIQUETAS: Record<Estado, string> = {
  INSCRITO: "Inscrito",
  PAGO_POR_CONFIRMAR: "Pago por confirmar",
  FALTA_PAGAR: "Falta completar el pago",
  NO_ASISTIRA: "No asistirá",
  SIN_RESPUESTA: "Sin responder",
};

const ESTILOS: Record<Estado, string> = {
  INSCRITO: "border-emerald-200 bg-emerald-50 text-emerald-800",
  PAGO_POR_CONFIRMAR: "border-sky-200 bg-sky-50 text-sky-800",
  FALTA_PAGAR: "border-amber-200 bg-amber-50 text-amber-900",
  NO_ASISTIRA: "border-neutral-300 bg-neutral-100 text-neutral-700",
  SIN_RESPUESTA: "border-neutral-200 bg-surface text-neutral-600",
};

/**
 * Qué toca para un alumno en este evento. La inscripción pagada manda sobre
 * la respuesta: quien ya pagó está inscrito aunque nunca haya respondido.
 */
function estadoDe(event: DojoEvent, studentId: number): Estado {
  const inscripcion = event.misAlumnos?.find((i) => i.studentId === studentId);
  const respuesta = event.misRespuestas?.find((r) => r.studentId === studentId);

  if (inscripcion?.enrolled) return "INSCRITO";
  if (inscripcion?.status === "REPORTADO") return "PAGO_POR_CONFIRMAR";
  if (respuesta?.asistira === false) return "NO_ASISTIRA";

  if (inscripcion?.status === "PENDIENTE_PAGO") return "FALTA_PAGAR";

  if (respuesta?.asistira) {
    return event.requiresPayment ? "FALTA_PAGAR" : "INSCRITO";
  }

  return "SIN_RESPUESTA";
}

/** Inscribir o no a cada alumno de la familia en un evento. */
function EventResponse({ event, misAlumnos, onCambio, onPagar }: Props) {
  const [guardando, setGuardando] = useState<number | null>(null);
  const [error, setError] = useState("");

  if (misAlumnos.length === 0) return null;

  async function responder(studentId: number, asistira: boolean) {
    setGuardando(studentId);
    setError("");

    try {
      await respondToEvent(event.id, studentId, asistira);
      await onCambio();

      // En un evento con costo, inscribirse lleva directo a pagar.
      if (asistira && event.requiresPayment) onPagar();
    } catch (e: unknown) {
      setError(e instanceof ApiError ? e.message : t("No fue posible guardar tu respuesta."));
    } finally {
      setGuardando(null);
    }
  }

  return (
    <div className="w-full border-t border-neutral-200 pt-3">
      <ul className="space-y-2">
        {misAlumnos.map((alumno) => {
          const estado = estadoDe(event, alumno.id);
          const ocupado = guardando === alumno.id;

          return (
            <li key={alumno.id} className="flex flex-wrap items-center gap-x-3 gap-y-2">
              <span className="min-w-0 flex-1 basis-32 text-sm font-semibold break-words text-neutral-800">
                {alumno.firstName} {alumno.lastName}
              </span>

              <span className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-semibold ${ESTILOS[estado]}`}>
                {t(ETIQUETAS[estado])}
              </span>

              <div className="flex shrink-0 flex-wrap gap-2">
                {(estado === "SIN_RESPUESTA" || estado === "NO_ASISTIRA") && (
                  <button
                    type="button"
                    disabled={ocupado}
                    onClick={() => responder(alumno.id, true)}
                    className={PRIMARIO}
                  >
                    <CircleCheck size={15} aria-hidden="true" />
                    {t("Inscribir")}
                  </button>
                )}

                {estado === "FALTA_PAGAR" && (
                  <button type="button" onClick={onPagar} className={PRIMARIO}>
                    {t("Pagar")}
                  </button>
                )}

                {(estado === "SIN_RESPUESTA" || estado === "FALTA_PAGAR" || estado === "INSCRITO") &&
                  // Con el pago ya confirmado, bajarse lo resuelve el profesor.
                  !(estado === "INSCRITO" && event.requiresPayment) && (
                    <button
                      type="button"
                      disabled={ocupado}
                      onClick={() => responder(alumno.id, false)}
                      className={SECUNDARIO}
                    >
                      <CircleX size={15} aria-hidden="true" />
                      {t("No inscribir")}
                    </button>
                  )}
              </div>
            </li>
          );
        })}
      </ul>

      {error && (
        <p className="mt-2 text-sm font-medium text-red-700" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

export default EventResponse;
