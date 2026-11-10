import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { CircleCheck, Copy, TriangleAlert } from "lucide-react";

import DashboardLayout from "../layouts/DashboardLayout";
import Card from "../components/Card";
import PageHeading from "../components/PageHeading";
import {
  ApiError,
  getMyStudents,
  getSenseiStatus,
  getStudents,
  prepareReminders,
  recommendEquipment,
  requestRecoveryReport,
  reviewGroup,
  sendReminders,
  summarizeStudent,
  type EquipmentAdvice,
  type GroupReview,
  type RecoveryReport,
  type ReminderDraft,
} from "../services/api";
import { getUser } from "../services/session";
import { guardarSugerencia } from "../lib/senseiSugerencia";
import { getLocale, t } from "../i18n";
import { formatMoney } from "../utils/format";

const BOTON_PRIMARIO = `
  min-h-11 cursor-pointer rounded-2xl bg-violet-600 px-4 py-2 text-sm font-semibold
  text-white transition-colors duration-200 motion-reduce:transition-none
  hover:bg-violet-700
  focus-visible:ring-2 focus-visible:ring-violet-600 focus-visible:ring-offset-2 focus-visible:outline-none
  disabled:cursor-not-allowed disabled:opacity-50
`;

const BOTON_SECUNDARIO = `
  inline-flex min-h-9 cursor-pointer items-center gap-1.5 rounded-xl border border-neutral-300
  bg-surface px-3 py-1.5 text-xs font-semibold text-neutral-700
  transition-colors duration-200 motion-reduce:transition-none hover:bg-neutral-50
  focus-visible:ring-2 focus-visible:ring-violet-600 focus-visible:outline-none
`;

const CAMPO = `
  w-full rounded-2xl border border-neutral-300 bg-surface px-4 py-3 text-neutral-800
  outline-none transition-[border-color,box-shadow] motion-reduce:transition-none
  focus:border-violet-600 focus:ring-4 focus:ring-violet-100
`;

const ETIQUETA = "block text-sm font-medium text-neutral-700";

const PERIODOS = [7, 30, 90];

type Alumno = { id: number; firstName: string; lastName: string };

function mensajeDe(e: unknown, respaldo: string): string {
  return e instanceof ApiError ? e.message : respaldo;
}

/** "2026-10" -> "octubre de 2026", en el idioma de la persona. */
function nombreDelMes(mes: string): string {
  const [anio, numero] = mes.split("-").map(Number);

  return new Intl.DateTimeFormat(getLocale(), {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(anio, numero - 1, 1)));
}

function Sensei() {
  const user = getUser();
  const esPersonal = user?.role === "ADMIN" || user?.role === "PROFESOR";

  const [estado, setEstado] = useState<{ disponible: boolean; enlace: string } | null>(null);
  const [alumnos, setAlumnos] = useState<Alumno[]>([]);

  useEffect(() => {
    let activo = true;

    Promise.all([
      getSenseiStatus(),
      esPersonal
        ? getStudents().then((lista) => lista.filter((a) => a.active))
        : getMyStudents(),
    ])
      .then(([s, lista]) => {
        if (!activo) return;
        setEstado({ disponible: s.disponible, enlace: s.enlaceDePago });
        setAlumnos(lista);
      })
      .catch(() => {
        if (activo) setEstado({ disponible: false, enlace: "" });
      });

    return () => {
      activo = false;
    };
  }, [esPersonal]);

  return (
    <DashboardLayout>
      <header>
        <PageHeading module="asistente">
          <h1 className="text-3xl leading-tight font-bold break-words text-neutral-800 sm:text-[2.5rem]">
            Sensei
          </h1>
          <p className="mt-1 max-w-2xl text-pretty text-neutral-600 sm:text-lg">
            {esPersonal
              ? t("Tu asistente con Claude: cobra, revisa tu grupo y redacta avisos. Tú decides qué se envía.")
              : t("Tu asistente con Claude: te ayuda a elegir equipo y a ver cómo va tu entrenamiento.")}
          </p>
        </PageHeading>
      </header>

      {estado === null ? (
        <Card className="mt-8 h-48 animate-pulse motion-reduce:animate-none" />
      ) : !estado.disponible ? (
        <Card className="mt-8 border-amber-200 p-6">
          <p className="font-semibold text-amber-900">{t("Sensei no está disponible")}</p>
          <p className="mt-1 text-sm text-amber-900">
            {t("Falta configurar la llave de Claude en el servidor. Las demás funciones de la app siguen igual.")}
          </p>
        </Card>
      ) : esPersonal ? (
        <>
          <Recordatorios enlace={estado.enlace} />
          <Reporte />
          <RevisionGrupo />
          <ResumenAlumno alumnos={alumnos} />
          <Card className="mt-6 p-5 text-sm text-neutral-600">
            {t("También redacta avisos: en")}{" "}
            <Link
              to="/notificaciones"
              className="font-semibold text-violet-700 underline-offset-2 hover:underline focus-visible:ring-2 focus-visible:ring-violet-600 focus-visible:outline-none"
            >
              {t("Notificaciones")}
            </Link>
            {", "}
            {t("escribe la idea del aviso y elige Redactar con Sensei.")}
          </Card>
        </>
      ) : (
        <>
          <AsesorEquipo alumnos={alumnos} />
          <ResumenAlumno alumnos={alumnos} />
        </>
      )}
    </DashboardLayout>
  );
}

function SelectorDeAlumno({
  id,
  alumnos,
  valor,
  onCambiar,
}: {
  id: string;
  alumnos: Alumno[];
  valor: number | "";
  onCambiar: (id: number | "") => void;
}) {
  if (alumnos.length <= 1) return null;

  return (
    <div className="space-y-2">
      <label htmlFor={id} className={ETIQUETA}>
        {t("Alumno")}
      </label>
      <select
        id={id}
        value={valor}
        onChange={(e) => onCambiar(e.target.value === "" ? "" : Number(e.target.value))}
        className={`${CAMPO} cursor-pointer sm:max-w-sm`}
      >
        <option value="">{t("Elige un alumno")}</option>
        {alumnos.map((a) => (
          <option key={a.id} value={a.id}>
            {a.firstName} {a.lastName}
          </option>
        ))}
      </select>
    </div>
  );
}

function MensajeDeError({ texto }: { texto: string }) {
  return texto ? (
    <p className="mt-4 text-sm font-medium text-red-700" role="alert">
      {texto}
    </p>
  ) : null;
}

// ---------------------------------------------------------------------------
// Familias: asesor de equipo
// ---------------------------------------------------------------------------

function AsesorEquipo({ alumnos }: { alumnos: Alumno[] }) {
  const navigate = useNavigate();
  const [alumnoId, setAlumnoId] = useState<number | "">(alumnos.length === 1 ? alumnos[0].id : "");
  const [necesidad, setNecesidad] = useState("");
  const [consejo, setConsejo] = useState<EquipmentAdvice | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");

  const elegido = alumnos.length === 1 ? alumnos[0].id : alumnoId;
  const valido = elegido !== "" && necesidad.trim().length >= 5;

  async function pedir(e: React.FormEvent) {
    e.preventDefault();
    if (!valido || cargando) return;

    setCargando(true);
    setError("");

    try {
      setConsejo(await recommendEquipment(Number(elegido), necesidad.trim()));
    } catch (err: unknown) {
      setError(mensajeDe(err, t("No fue posible pedir la recomendación.")));
    } finally {
      setCargando(false);
    }
  }

  function solicitar() {
    if (!consejo) return;

    guardarSugerencia({
      studentId: consejo.studentId,
      items: consejo.items.map(({ productId, modelId, talla, color }) => ({
        productId,
        modelId,
        talla,
        color,
      })),
    });
    navigate("/uniformes");
  }

  return (
    <section className="mt-8" aria-labelledby="titulo-equipo">
      <Card className="p-5 sm:p-6">
        <h2 id="titulo-equipo" className="text-lg font-bold text-neutral-800">
          {t("Asesor de equipo")}
        </h2>
        <p className="mt-1 max-w-2xl text-sm text-neutral-600">
          {t("Cuéntale qué necesitas y te recomienda uniforme y protecciones del catálogo del dojo, con talla y modelo.")}
        </p>

        <form onSubmit={pedir} className="mt-5 space-y-4">
          <SelectorDeAlumno id="equipo-alumno" alumnos={alumnos} valor={alumnoId} onCambiar={setAlumnoId} />

          <div className="space-y-2">
            <label htmlFor="equipo-necesidad" className={ETIQUETA}>
              {t("¿Para qué lo necesitas?")}
            </label>
            <textarea
              id="equipo-necesidad"
              value={necesidad}
              rows={3}
              maxLength={400}
              onChange={(e) => setNecesidad(e.target.value)}
              placeholder={t("Va a su primer torneo de kumite y no tiene protecciones…")}
              className={`${CAMPO} text-sm`}
            />
          </div>

          <button type="submit" disabled={!valido || cargando} className={BOTON_PRIMARIO}>
            {cargando ? t("Sensei está pensando…") : t("Pedir recomendación")}
          </button>
        </form>

        <MensajeDeError texto={error} />

        {consejo && (
          <div className="mt-6 border-t border-neutral-200 pt-5">
            {consejo.resumen && <p className="text-sm leading-relaxed text-neutral-800">{consejo.resumen}</p>}

            {consejo.items.length === 0 ? (
              <p className="mt-3 text-sm text-neutral-600">
                {t("Sensei no encontró en el catálogo algo que cuadre. Prueba a describirlo de otra forma.")}
              </p>
            ) : (
              <>
                <ul className="mt-4 divide-y divide-neutral-200 rounded-3xl border border-neutral-200 bg-neutral-50">
                  {consejo.items.map((i) => (
                    <li key={i.productId} className="flex flex-wrap items-start justify-between gap-3 p-4">
                      <div className="min-w-0">
                        <p className="font-semibold text-neutral-800">{i.producto}</p>
                        <p className="text-sm text-neutral-600">
                          {i.marca} · {i.modelo}
                          {i.talla && ` · ${t("Talla {talla}", { talla: i.talla })}`}
                          {i.color && ` · ${i.color === "AMBOS" ? t("Ambos colores") : i.color}`}
                        </p>
                        {i.razon && <p className="mt-1 text-sm text-neutral-700">{i.razon}</p>}
                      </div>
                      <p className="shrink-0 text-right font-bold text-neutral-800">
                        {formatMoney(i.precioCents)}
                        {i.esEjemplo && (
                          <span className="mt-1 block rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-900">
                            {t("Precio de ejemplo")}
                          </span>
                        )}
                      </p>
                    </li>
                  ))}
                </ul>

                <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm text-neutral-600">
                    {t("Total aproximado")}:{" "}
                    <span className="font-bold text-neutral-800">{formatMoney(consejo.totalCents)}</span>
                  </p>
                  <button type="button" onClick={solicitar} className={BOTON_PRIMARIO}>
                    {t("Revisar y solicitar")}
                  </button>
                </div>
                <p className="mt-2 text-xs text-neutral-600">
                  {t("Se llena tu solicitud en Uniformes y protecciones para que confirmes tallas antes de enviarla.")}
                </p>
              </>
            )}
          </div>
        )}
      </Card>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Todos: resumen del alumno
// ---------------------------------------------------------------------------

function ResumenAlumno({ alumnos }: { alumnos: Alumno[] }) {
  const user = getUser();
  const esAlumno = user?.role === "ALUMNO";
  const [alumnoId, setAlumnoId] = useState<number | "">(alumnos.length === 1 ? alumnos[0].id : "");
  const [resumen, setResumen] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");

  const elegido = alumnos.length === 1 ? alumnos[0].id : alumnoId;

  async function generar() {
    if (elegido === "" || cargando) return;

    setCargando(true);
    setError("");

    try {
      setResumen(await summarizeStudent(Number(elegido)));
    } catch (e: unknown) {
      setError(mensajeDe(e, t("No fue posible generar el resumen.")));
    } finally {
      setCargando(false);
    }
  }

  if (alumnos.length === 0) return null;

  return (
    <section className="mt-6" aria-labelledby="titulo-resumen">
      <Card className="p-5 sm:p-6">
        <h2 id="titulo-resumen" className="text-lg font-bold text-neutral-800">
          {esAlumno ? t("Mi mes en el dojo") : t("Resumen del alumno")}
        </h2>
        <p className="mt-1 max-w-2xl text-sm text-neutral-600">
          {t("Asistencia, cinta, observaciones del profesor, lo pendiente y lo que viene, en pocas líneas.")}
        </p>

        <div className="mt-5 flex flex-wrap items-end gap-3">
          <SelectorDeAlumno id="resumen-alumno" alumnos={alumnos} valor={alumnoId} onCambiar={setAlumnoId} />
          <button
            type="button"
            onClick={generar}
            disabled={elegido === "" || cargando}
            className={BOTON_PRIMARIO}
          >
            {cargando ? t("Sensei está pensando…") : t("Generar resumen")}
          </button>
        </div>

        <MensajeDeError texto={error} />

        {resumen && (
          <div className="mt-5 rounded-3xl border border-neutral-200 bg-neutral-50 p-4">
            <p className="text-xs font-semibold text-neutral-600">{t("Redactado por Claude con los datos del expediente")}</p>
            <p className="mt-2 text-sm leading-relaxed whitespace-pre-line text-neutral-800">{resumen}</p>
          </div>
        )}
      </Card>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Admin y profesores: revisión del grupo
// ---------------------------------------------------------------------------

function RevisionGrupo() {
  const [revision, setRevision] = useState<GroupReview | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");
  const [copiado, setCopiado] = useState<number | null>(null);

  async function revisar() {
    setCargando(true);
    setError("");

    try {
      setRevision(await reviewGroup());
    } catch (e: unknown) {
      setError(mensajeDe(e, t("No fue posible revisar el grupo.")));
    } finally {
      setCargando(false);
    }
  }

  async function copiar(alumnoId: number, mensaje: string) {
    try {
      await navigator.clipboard.writeText(mensaje);
      setCopiado(alumnoId);
    } catch {
      setCopiado(null);
    }
  }

  return (
    <section className="mt-6" aria-labelledby="titulo-grupo">
      <Card className="p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-xl">
            <h2 id="titulo-grupo" className="text-lg font-bold text-neutral-800">
              {t("Revisión del grupo")}
            </h2>
            <p className="mt-1 text-sm text-neutral-600">
              {t("Quién podría presentar examen de cinta y quién podría estar por dejar el dojo. Sensei sugiere; tú decides.")}
            </p>
          </div>
          <button type="button" onClick={revisar} disabled={cargando} className={BOTON_PRIMARIO}>
            {cargando ? t("Sensei está pensando…") : revision ? t("Revisar de nuevo") : t("Revisar mi grupo")}
          </button>
        </div>

        <MensajeDeError texto={error} />

        {revision && (
          <div className="mt-5 space-y-5">
            {revision.revisados === 0 ? (
              <p className="text-sm text-neutral-600">{t("No tienes alumnos activos para revisar.")}</p>
            ) : (
              revision.resumen && <p className="text-sm leading-relaxed text-neutral-800">{revision.resumen}</p>
            )}

            {revision.revisados > 0 && (
              <div className="grid gap-4 lg:grid-cols-2">
                <div>
                  <h3 className="text-sm font-bold text-neutral-800">{t("Candidatos a examen")}</h3>
                  {revision.examen.length === 0 ? (
                    <p className="mt-2 text-sm text-neutral-600">{t("Nadie por ahora.")}</p>
                  ) : (
                    <ul className="mt-2 space-y-2">
                      {revision.examen.map((e) => (
                        <li key={e.alumnoId} className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3">
                          <p className="font-semibold text-emerald-900">
                            {e.alumno} · {e.cinta}
                          </p>
                          <p className="text-sm text-emerald-900">{e.razon}</p>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div>
                  <h3 className="text-sm font-bold text-neutral-800">{t("En riesgo de dejar el dojo")}</h3>
                  {revision.riesgo.length === 0 ? (
                    <p className="mt-2 text-sm text-neutral-600">{t("Nadie por ahora.")}</p>
                  ) : (
                    <ul className="mt-2 space-y-2">
                      {revision.riesgo.map((r) => (
                        <li key={r.alumnoId} className="rounded-2xl border border-amber-200 bg-amber-50 p-3">
                          <p className="font-semibold text-amber-900">{r.alumno}</p>
                          <p className="text-sm text-amber-900">{r.razon}</p>
                          {r.mensaje && (
                            <div className="mt-2 rounded-xl bg-surface p-3">
                              <p className="text-sm text-neutral-800">{r.mensaje}</p>
                              <button
                                type="button"
                                onClick={() => copiar(r.alumnoId, r.mensaje)}
                                className={`${BOTON_SECUNDARIO} mt-2`}
                              >
                                <Copy size={13} aria-hidden="true" />
                                {copiado === r.alumnoId ? t("Copiado") : t("Copiar mensaje")}
                              </button>
                            </div>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </Card>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Admin y profesores: cobranza
// ---------------------------------------------------------------------------

type Borrador = ReminderDraft & { elegido: boolean; texto: string };

function Recordatorios({ enlace }: { enlace: string }) {
  const [borradores, setBorradores] = useState<Borrador[] | null>(null);
  const [sinBorrador, setSinBorrador] = useState(0);
  const [redactando, setRedactando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");
  const [resultado, setResultado] = useState("");

  async function preparar() {
    setRedactando(true);
    setError("");
    setResultado("");

    try {
      const res = await prepareReminders();

      setBorradores(
        res.borradores.map((b) => ({
          ...b,
          texto: b.mensaje ?? "",
          // Solo se marcan solos los que pasaron la revisión de montos.
          elegido: b.mensaje !== null && b.montosVerificados,
        }))
      );
      setSinBorrador(res.familiasSinBorrador);
    } catch (e: unknown) {
      setError(mensajeDe(e, t("No fue posible preparar los recordatorios.")));
    } finally {
      setRedactando(false);
    }
  }

  async function enviar() {
    if (!borradores) return;

    const elegidos = borradores.filter((b) => b.elegido && b.texto.trim());

    setEnviando(true);
    setError("");

    try {
      const res = await sendReminders(elegidos.map((b) => ({ alumnoId: b.alumnoId, mensaje: b.texto })));

      setResultado(
        t("Se enviaron {n} recordatorios.", { n: res.enviados }) +
          (res.sinAdeudo > 0 ? " " + t("{n} ya no tenían adeudo.", { n: res.sinAdeudo }) : "") +
          (res.sinDestinatario > 0
            ? " " + t("{n} no tienen cuenta ni tutor con cuenta.", { n: res.sinDestinatario })
            : "")
      );
      setBorradores(null);
    } catch (e: unknown) {
      setError(mensajeDe(e, t("No fue posible enviar los recordatorios.")));
    } finally {
      setEnviando(false);
    }
  }

  function actualizar(alumnoId: number, cambios: Partial<Borrador>) {
    setBorradores((actuales) =>
      actuales ? actuales.map((b) => (b.alumnoId === alumnoId ? { ...b, ...cambios } : b)) : actuales
    );
  }

  const elegidos = borradores?.filter((b) => b.elegido && b.texto.trim()).length ?? 0;

  return (
    <section className="mt-8" aria-labelledby="titulo-recordatorios">
      <Card className="p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-xl">
            <h2 id="titulo-recordatorios" className="text-lg font-bold text-neutral-800">
              {t("Recordatorios de pago")}
            </h2>
            <p className="mt-1 text-sm text-neutral-600">
              {t("Un borrador por cada familia con mensualidades pendientes o vencidas. Nada se envía hasta que lo apruebes.")}
            </p>
          </div>

          <button type="button" onClick={preparar} disabled={redactando || enviando} className={BOTON_PRIMARIO}>
            {redactando
              ? t("Claude está redactando…")
              : borradores
                ? t("Volver a redactar")
                : t("Preparar recordatorios")}
          </button>
        </div>

        <MensajeDeError texto={error} />

        {resultado && (
          <p className="mt-4 flex items-center gap-2 text-sm font-medium text-emerald-700" role="status">
            <CircleCheck size={16} aria-hidden="true" />
            {resultado}
          </p>
        )}

        {borradores && borradores.length === 0 && (
          <p className="mt-4 text-sm text-neutral-600">
            {t("Nadie de tu alcance tiene mensualidades pendientes. No hay nada que recordar.")}
          </p>
        )}

        {borradores && borradores.length > 0 && (
          <>
            <ul className="mt-5 space-y-3">
              {borradores.map((b) => (
                <li key={b.alumnoId} className="rounded-3xl border border-neutral-200 bg-neutral-50 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <label className="flex min-w-0 cursor-pointer items-start gap-3">
                      <input
                        type="checkbox"
                        checked={b.elegido}
                        disabled={b.mensaje === null}
                        onChange={(e) => actualizar(b.alumnoId, { elegido: e.target.checked })}
                        className="mt-1 h-5 w-5 cursor-pointer accent-violet-600"
                      />
                      <span className="min-w-0">
                        <span className="block font-semibold break-words text-neutral-800">{b.alumno}</span>
                        <span className="block text-sm break-words text-neutral-600">
                          {b.tutor ? t("Para {tutor}", { tutor: b.tutor }) : t("Sin tutor registrado")}
                          {" · "}
                          {b.pagos.map((p) => nombreDelMes(p.mes)).join(", ")}
                        </span>
                      </span>
                    </label>

                    <span className="shrink-0 font-bold text-neutral-800">{formatMoney(b.montoAdeudado * 100)}</span>
                  </div>

                  {b.mensaje === null ? (
                    <p className="mt-3 text-sm font-medium text-red-700">
                      {b.error ?? t("No se pudo redactar este mensaje.")}
                    </p>
                  ) : (
                    <>
                      <label htmlFor={`mensaje-${b.alumnoId}`} className="sr-only">
                        {t("Mensaje para {alumno}", { alumno: b.alumno })}
                      </label>
                      <textarea
                        id={`mensaje-${b.alumnoId}`}
                        value={b.texto}
                        rows={7}
                        maxLength={1200}
                        onChange={(e) => actualizar(b.alumnoId, { texto: e.target.value })}
                        className={`${CAMPO} mt-3 min-h-40 text-sm leading-relaxed [field-sizing:content]`}
                      />

                      <p
                        className={`mt-2 flex items-center gap-1.5 text-xs font-semibold ${
                          b.montosVerificados ? "text-emerald-700" : "text-amber-800"
                        }`}
                      >
                        {b.montosVerificados ? (
                          <CircleCheck size={14} aria-hidden="true" />
                        ) : (
                          <TriangleAlert size={14} aria-hidden="true" />
                        )}
                        {b.montosVerificados
                          ? t("Los montos coinciden con lo que se debe.")
                          : t("Revisa los montos antes de enviarlo: no coinciden con lo que se debe.")}
                      </p>
                    </>
                  )}
                </li>
              ))}
            </ul>

            {sinBorrador > 0 && (
              <p className="mt-3 text-sm text-neutral-600">
                {t("{n} familias más quedaron para la siguiente tanda. Envía estas y vuelve a preparar.", { n: sinBorrador })}
              </p>
            )}

            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-neutral-200 pt-4">
              <p className="max-w-lg text-sm text-neutral-600">
                {t("Llega como notificación al alumno y a sus tutores, con este enlace para pagar: {enlace}", { enlace })}
              </p>
              <button type="button" onClick={enviar} disabled={elegidos === 0 || enviando || redactando} className={BOTON_PRIMARIO}>
                {enviando ? t("Enviando…") : t("Enviar {n} recordatorios", { n: elegidos })}
              </button>
            </div>
          </>
        )}
      </Card>
    </section>
  );
}

function Reporte() {
  const [dias, setDias] = useState(30);
  const [reporte, setReporte] = useState<RecoveryReport | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");

  async function generar() {
    setCargando(true);
    setError("");

    try {
      setReporte(await requestRecoveryReport(dias));
    } catch (e: unknown) {
      setError(mensajeDe(e, t("No fue posible generar el reporte.")));
    } finally {
      setCargando(false);
    }
  }

  const datos = reporte?.datos;

  return (
    <section className="mt-6" aria-labelledby="titulo-reporte">
      <Card className="p-5 sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="max-w-xl">
            <h2 id="titulo-reporte" className="text-lg font-bold text-neutral-800">
              {t("Reporte de recuperación")}
            </h2>
            <p className="mt-1 text-sm text-neutral-600">{t("Cuánto se pagó después de cada recordatorio enviado.")}</p>
          </div>

          <div className="flex flex-wrap items-end gap-2">
            <div>
              <label htmlFor="periodo-reporte" className={ETIQUETA}>
                {t("Periodo")}
              </label>
              <select
                id="periodo-reporte"
                value={dias}
                onChange={(e) => setDias(Number(e.target.value))}
                className={`${CAMPO} mt-1 cursor-pointer py-2.5`}
              >
                {PERIODOS.map((d) => (
                  <option key={d} value={d}>
                    {t("Últimos {n} días", { n: d })}
                  </option>
                ))}
              </select>
            </div>

            <button type="button" onClick={generar} disabled={cargando} className={BOTON_PRIMARIO}>
              {cargando ? t("Claude está redactando…") : t("Generar reporte")}
            </button>
          </div>
        </div>

        <MensajeDeError texto={error} />

        {reporte && datos && (
          <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_18rem]">
            <div className="rounded-3xl border border-neutral-200 bg-neutral-50 p-4">
              <p className="text-xs font-semibold text-neutral-600">{t("Redactado por Claude a partir de estas cifras")}</p>
              <p className="mt-2 text-sm leading-relaxed whitespace-pre-line text-neutral-800">{reporte.resumen}</p>
            </div>

            <dl className="grid grid-cols-2 gap-3 self-start lg:grid-cols-1">
              <Cifra etiqueta={t("Tasa de recuperación")} valor={`${datos.tasaRecuperacion}%`} />
              <Cifra etiqueta={t("Recuperado")} valor={formatMoney(datos.montoRecuperado * 100)} />
              <Cifra etiqueta={t("Pendiente")} valor={formatMoney(datos.montoPendiente * 100)} />
              <Cifra etiqueta={t("Cobros recordados")} valor={String(datos.pagosRecordados)} />
            </dl>
          </div>
        )}
      </Card>
    </section>
  );
}

function Cifra({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-surface p-3">
      <dt className="text-xs font-semibold text-neutral-600">{etiqueta}</dt>
      <dd className="mt-0.5 text-xl font-bold text-neutral-800">{valor}</dd>
    </div>
  );
}

export default Sensei;
