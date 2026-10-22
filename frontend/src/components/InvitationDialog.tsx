import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Check, Copy, QrCode, TriangleAlert } from "lucide-react";

import Card from "./Card";
import { ApiError, createInvitation } from "../services/api";
import {
  INVITATION_KIND_LABELS,
  type InvitationKind,
  type NewInvitation,
} from "../types/invitation";

type Props = {
  /** Si viene, la invitación de tutor se liga a este alumno. */
  studentId?: number;
  /** Nombre del alumno, solo para el texto. */
  studentName?: string;
  /** Si se fija, no se puede elegir el tipo. */
  soloTipo?: InvitationKind;
  onCerrar: () => void;
};

/**
 * Genera una invitación y muestra su QR y su enlace.
 *
 * El QR se dibuja en el navegador con la librería `qrcode`, que devuelve una
 * imagen en data URL. No hace falta que el backend genere imágenes ni que
 * salgamos a un servicio externo: el enlace nunca sale del dispositivo.
 */
function InvitationDialog({
  studentId,
  studentName,
  soloTipo,
  onCerrar,
}: Props) {
  const [kind, setKind] = useState<InvitationKind>(soloTipo ?? "ALUMNO");
  const [note, setNote] = useState("");
  const [invitacion, setInvitacion] = useState<NewInvitation | null>(null);
  const [qr, setQr] = useState<string | null>(null);
  const [generando, setGenerando] = useState(false);
  const [error, setError] = useState("");
  const [copiado, setCopiado] = useState(false);

  // Dibuja el QR cuando ya hay invitación.
  useEffect(() => {
    if (!invitacion) return;

    let activo = true;

    QRCode.toDataURL(invitacion.url, {
      width: 320,
      margin: 2,
      // Contraste alto: el QR se lee desde la pantalla de otro teléfono.
      color: { dark: "#0f172a", light: "#ffffff" },
    })
      .then((url) => {
        if (activo) setQr(url);
      })
      .catch(() => {
        // Sin QR el enlace sigue sirviendo; no vale romper la pantalla.
      });

    return () => {
      activo = false;
    };
  }, [invitacion]);

  async function generar() {
    setGenerando(true);
    setError("");

    try {
      const res = await createInvitation({
        kind,
        studentId,
        note: note.trim() || undefined,
      });

      setInvitacion(res.invitation);
    } catch (e: unknown) {
      setError(
        e instanceof ApiError
          ? e.message
          : "No fue posible generar la invitación."
      );
    } finally {
      setGenerando(false);
    }
  }

  async function copiar() {
    if (!invitacion) return;

    try {
      await navigator.clipboard.writeText(invitacion.url);
      setCopiado(true);
      window.setTimeout(() => setCopiado(false), 1500);
    } catch {
      // Sin permiso de portapapeles, el enlace se puede seleccionar a mano.
    }
  }

  const inputClase = `
    w-full rounded-xl border border-slate-300 bg-white px-4 py-3
    outline-none transition-all
    focus:border-blue-600 focus:ring-4 focus:ring-blue-100
  `;

  // -------------------------------------------------------------------------
  // Ya generada: QR + enlace
  // -------------------------------------------------------------------------
  if (invitacion) {
    const caduca = new Date(invitacion.expiresAt).toLocaleDateString("es-MX", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

    return (
      <Card className="p-5 sm:p-6">
        <h2 className="font-bold text-slate-900">
          Invitación para {INVITATION_KIND_LABELS[invitacion.kind].toLowerCase()}
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          Comparte el QR o el enlace. Al llenar el formulario queda registrado
          en tu grupo.
        </p>

        <div className="mt-5 flex flex-col items-center gap-5 sm:flex-row sm:items-start">
          {qr ? (
            <img
              src={qr}
              alt={`Código QR del enlace de inscripción para ${INVITATION_KIND_LABELS[invitacion.kind].toLowerCase()}`}
              className="h-44 w-44 shrink-0 rounded-xl border border-slate-200"
            />
          ) : (
            <div className="flex h-44 w-44 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-400">
              <QrCode size={32} aria-hidden="true" />
            </div>
          )}

          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
              Enlace
            </p>

            {/* break-all para que una URL larga no desborde en móvil */}
            <p className="mt-2 rounded-xl border border-slate-200 bg-slate-50 p-3 font-mono text-xs break-all text-slate-800">
              {invitacion.url}
            </p>

            <button
              type="button"
              onClick={copiar}
              className="
                mt-3 flex cursor-pointer items-center gap-2 rounded-xl border
                border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold
                text-slate-700 transition-colors duration-200
                motion-reduce:transition-none
                hover:bg-slate-50
                focus:ring-2 focus:ring-blue-600 focus:outline-none
              "
            >
              {copiado ? (
                <>
                  <Check size={16} aria-hidden="true" className="text-emerald-700" />
                  Copiado
                </>
              ) : (
                <>
                  <Copy size={16} aria-hidden="true" />
                  Copiar enlace
                </>
              )}
            </button>
          </div>
        </div>

        <div className="mt-5 flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <TriangleAlert
            size={18}
            aria-hidden="true"
            className="mt-0.5 shrink-0 text-amber-700"
          />
          <div className="text-sm text-amber-900">
            <p className="font-semibold">Sirve una sola vez</p>
            <p className="mt-1">
              Al llenarse queda inservible, y caduca el {caduca}. Mándaselo
              solo a la persona que se va a inscribir: cualquiera con el
              enlace puede llenar el formulario.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onCerrar}
          className="
            mt-5 cursor-pointer rounded-xl border border-slate-300 bg-white px-5 py-3
            font-semibold text-slate-700 transition-colors duration-200
            motion-reduce:transition-none
            hover:bg-slate-50
            focus:ring-2 focus:ring-blue-600 focus:outline-none
          "
        >
          Listo
        </button>
      </Card>
    );
  }

  // -------------------------------------------------------------------------
  // Antes de generar
  // -------------------------------------------------------------------------
  return (
    <Card className="p-5 sm:p-6">
      <h2 className="font-bold text-slate-900">
        Generar invitación de inscripción
      </h2>
      <p className="mt-1 text-sm text-slate-600">
        {studentName
          ? `Para sumar un tutor al expediente de ${studentName}.`
          : "La persona llena sus datos y queda registrada en tu grupo, sin que tú captures nada."}
      </p>

      <div className="mt-5 space-y-5">
        {!soloTipo && (
          <fieldset>
            <legend className="text-sm font-medium text-slate-700">
              ¿Para quién es?
            </legend>

            <div className="mt-2 grid gap-3 sm:grid-cols-2">
              {(["ALUMNO", "TUTOR"] as InvitationKind[]).map((k) => (
                <label
                  key={k}
                  className={`
                    flex cursor-pointer gap-3 rounded-xl border p-4
                    transition-colors duration-200
                    motion-reduce:transition-none
                    ${
                      kind === k
                        ? "border-blue-600 bg-blue-50"
                        : "border-slate-300 bg-white hover:bg-slate-50"
                    }
                  `}
                >
                  <input
                    type="radio"
                    name="tipo-invitacion"
                    value={k}
                    checked={kind === k}
                    onChange={() => setKind(k)}
                    className="mt-0.5 cursor-pointer"
                  />
                  <span>
                    <span className="block text-sm font-semibold text-slate-900">
                      {INVITATION_KIND_LABELS[k]}
                    </span>
                    <span className="mt-0.5 block text-xs text-slate-600">
                      {k === "ALUMNO"
                        ? "Llena sus propios datos: nombre, fecha de nacimiento, correo y celular."
                        : "Llena sus datos y los de sus hijos."}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
        )}

        <div className="space-y-2">
          <label
            htmlFor="inv-nota"
            className="block text-sm font-medium text-slate-700"
          >
            Nota para ti{" "}
            <span className="font-normal text-slate-500">(opcional)</span>
          </label>
          <input
            id="inv-nota"
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Familia Pérez, hermano de Ana"
            aria-describedby="inv-nota-ayuda"
            className={inputClase}
          />
          <p id="inv-nota-ayuda" className="text-xs text-slate-500">
            Solo tú la ves. Sirve para recordar a quién le mandaste cada
            enlace.
          </p>
        </div>

        {error && (
          <p className="text-sm font-medium text-red-700" role="alert">
            {error}
          </p>
        )}

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={generar}
            disabled={generando}
            className="
              flex cursor-pointer items-center gap-2 rounded-xl bg-blue-600 px-5 py-3
              font-semibold text-white transition-colors duration-200
              motion-reduce:transition-none
              hover:bg-blue-700
              focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 focus:outline-none
              disabled:cursor-not-allowed disabled:opacity-50
            "
          >
            <QrCode size={17} aria-hidden="true" />
            {generando ? "Generando..." : "Generar QR y enlace"}
          </button>

          <button
            type="button"
            onClick={onCerrar}
            className="
              cursor-pointer rounded-xl border border-slate-300 bg-white px-5 py-3
              font-semibold text-slate-700 transition-colors duration-200
              motion-reduce:transition-none
              hover:bg-slate-50
              focus:ring-2 focus:ring-blue-600 focus:outline-none
            "
          >
            Cancelar
          </button>
        </div>
      </div>
    </Card>
  );
}

export default InvitationDialog;
