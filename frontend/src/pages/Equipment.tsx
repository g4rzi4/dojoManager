import { useEffect, useState } from "react";
import { ExternalLink, Shirt } from "lucide-react";

import DashboardLayout from "../layouts/DashboardLayout";
import Card from "../components/Card";
import PageHeading from "../components/PageHeading";
import OpcionesDePago from "../components/OpcionesDePago";
import {
  ApiError,
  createEquipmentRequest,
  getEquipmentCatalog,
  getEquipmentRequests,
  getMyStudents,
  resolveCharge,
  updateEquipmentRequest,
} from "../services/api";
import { can, getUser } from "../services/session";
import type {
  EquipmentCategory,
  EquipmentProduct,
  EquipmentRequest,
  NewEquipmentItem,
} from "../types/equipment";
import {
  EQUIPMENT_STATUS_LABELS,
  EQUIPMENT_STATUS_STYLES,
} from "../types/equipment";
import { PAYMENT_METHOD_LABELS, type MyStudent } from "../types/payment";
import { formatMoney } from "../utils/format";

const OTRA_MARCA = "OTRA";
const AMBOS_COLORES = "AMBOS";

const CATEGORIAS: { value: EquipmentCategory; titulo: string }[] = [
  { value: "UNIFORME", titulo: "Uniformes" },
  { value: "PROTECCION", titulo: "Protecciones" },
];

const CAMPO = `
  w-full rounded-2xl border border-neutral-300 bg-white px-4 py-3 text-neutral-800
  outline-none transition-[border-color,box-shadow] motion-reduce:transition-none
  focus:border-violet-600 focus:ring-4 focus:ring-violet-100
`;

const ETIQUETA = "block text-sm font-medium text-neutral-700";

const BOTON_PRIMARIO = `
  min-h-11 cursor-pointer rounded-2xl bg-violet-600 px-4 py-2 text-sm font-semibold
  text-white transition-colors duration-200 motion-reduce:transition-none
  hover:bg-violet-700
  focus-visible:ring-2 focus-visible:ring-violet-600 focus-visible:ring-offset-2 focus-visible:outline-none
  disabled:cursor-not-allowed disabled:opacity-50
`;

const BOTON_SECUNDARIO = `
  min-h-11 cursor-pointer rounded-2xl border border-neutral-300 bg-white px-4 py-2
  text-sm font-semibold text-neutral-700 transition-colors duration-200
  motion-reduce:transition-none hover:bg-neutral-50
  focus-visible:ring-2 focus-visible:ring-violet-600 focus-visible:outline-none
  disabled:cursor-not-allowed disabled:opacity-50
`;

function mensajeDe(e: unknown, respaldo: string): string {
  return e instanceof ApiError ? e.message : respaldo;
}

function Equipment() {
  const user = getUser();
  const esPersonal = can(user, "events:write");

  const [solicitudes, setSolicitudes] = useState<EquipmentRequest[]>([]);
  const [productos, setProductos] = useState<EquipmentProduct[]>([]);
  const [alumnos, setAlumnos] = useState<MyStudent[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [recarga, setRecarga] = useState(0);

  useEffect(() => {
    let activo = true;

    Promise.all([
      getEquipmentRequests(),
      esPersonal ? Promise.resolve([]) : getEquipmentCatalog(),
      esPersonal ? Promise.resolve([]) : getMyStudents(),
    ])
      .then(([misSolicitudes, catalogo, misAlumnos]) => {
        if (!activo) return;

        setSolicitudes(misSolicitudes);
        setProductos(catalogo);
        setAlumnos(misAlumnos);
        setError("");
      })
      .catch((e: unknown) => {
        if (activo) setError(mensajeDe(e, "No fue posible cargar la información."));
      })
      .finally(() => {
        if (activo) setCargando(false);
      });

    return () => {
      activo = false;
    };
  }, [esPersonal, recarga]);

  const recargar = () => setRecarga((n) => n + 1);

  return (
    <DashboardLayout>
      <header>
        <PageHeading module="equipo">
          <h1 className="text-3xl leading-tight font-bold break-words text-neutral-800 sm:text-[2.5rem]">
            Uniformes y protecciones
          </h1>
          <p className="mt-1 max-w-2xl text-pretty text-neutral-600 sm:text-lg">
            {esPersonal
              ? "Confirma disponibilidad y precio de lo que piden tus alumnos."
              : "Elige lo que necesitas y tu profesor confirmará disponibilidad y precio."}
          </p>
        </PageHeading>
      </header>

      {error && (
        <Card className="mt-6 border-red-200 p-6">
          <p className="font-semibold text-red-800">
            No se pudo cargar la información
          </p>
          <p className="mt-1 text-sm text-red-700">{error}</p>
        </Card>
      )}

      {cargando ? (
        <Card className="mt-8 h-96 animate-pulse motion-reduce:animate-none" />
      ) : (
        <>
          {!esPersonal && !error && (
            <FormularioSolicitud
              productos={productos}
              alumnos={alumnos}
              onEnviada={recargar}
            />
          )}

          <section className="mt-10" aria-labelledby="titulo-solicitudes">
            <h2
              id="titulo-solicitudes"
              className="mb-4 text-lg font-bold text-neutral-800"
            >
              {esPersonal ? "Solicitudes" : "Mis solicitudes"}
            </h2>

            {solicitudes.length === 0 ? (
              <Card className="p-8 text-center">
                <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-3xl bg-neutral-100 text-neutral-500">
                  <Shirt size={26} aria-hidden="true" />
                </span>
                <p className="mt-4 font-bold text-neutral-800">
                  Todavía no hay solicitudes
                </p>
                <p className="mt-1 text-sm text-neutral-600">
                  {esPersonal
                    ? "Aquí aparecerá lo que pidan tus alumnos."
                    : "Aquí podrás seguir lo que le pidas a tu profesor."}
                </p>
              </Card>
            ) : (
              <ul className="space-y-3">
                {solicitudes.map((s) => (
                  <li key={s.id}>
                    <TarjetaSolicitud
                      solicitud={s}
                      esPersonal={esPersonal}
                      onCambio={recargar}
                    />
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </DashboardLayout>
  );
}

// ---------------------------------------------------------------------------
// Alumno o tutor: hacer la solicitud
// ---------------------------------------------------------------------------

type Seleccion = {
  modelo: string;
  marcaLibre: string;
  talla: string;
  color: string;
};

const SELECCION_VACIA: Seleccion = {
  modelo: "",
  marcaLibre: "",
  talla: "",
  color: "",
};

function estaCompleta(producto: EquipmentProduct, s: Seleccion): boolean {
  const conMarca =
    s.modelo === OTRA_MARCA ? s.marcaLibre.trim().length > 0 : s.modelo !== "";

  return (
    conMarca && s.talla !== "" && (producto.colors.length === 0 || s.color !== "")
  );
}

/** Lo que cuesta ese renglón, o null si el precio lo define el profesor. */
function precioDe(producto: EquipmentProduct, s: Seleccion): number | null {
  const modelo = producto.models.find((m) => String(m.id) === s.modelo);

  if (!modelo) return null;

  return s.color === AMBOS_COLORES ? modelo.priceCents * 2 : modelo.priceCents;
}

function FormularioSolicitud({
  productos,
  alumnos,
  onEnviada,
}: {
  productos: EquipmentProduct[];
  alumnos: MyStudent[];
  onEnviada: () => void;
}) {
  const [selecciones, setSelecciones] = useState<Record<number, Seleccion>>({});
  const [alumnoId, setAlumnoId] = useState<number | "">(
    alumnos.length === 1 ? alumnos[0].id : ""
  );
  const [nota, setNota] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");
  const [exito, setExito] = useState("");

  if (productos.length === 0) {
    return (
      <Card className="mt-8 p-8 text-center">
        <p className="font-bold text-neutral-800">
          El dojo todavía no tiene catálogo
        </p>
        <p className="mt-1 text-sm text-neutral-600">
          Cuando se carguen los productos, podrás pedirlos desde aquí.
        </p>
      </Card>
    );
  }

  const elegidos = productos.filter((p) => selecciones[p.id]);
  const completos = elegidos.every((p) => estaCompleta(p, selecciones[p.id]));
  const precios = elegidos.map((p) => precioDe(p, selecciones[p.id]));
  const total = precios.reduce<number>((suma, p) => suma + (p ?? 0), 0);
  const hayPorConfirmar = precios.some((p) => p === null);

  const puedeEnviar =
    elegidos.length > 0 && completos && alumnoId !== "" && !enviando;

  function alternar(id: number, elegido: boolean) {
    setSelecciones((actual) => {
      const copia = { ...actual };

      if (elegido) copia[id] = SELECCION_VACIA;
      else delete copia[id];

      return copia;
    });
  }

  function actualizar(id: number, cambios: Partial<Seleccion>) {
    setSelecciones((actual) => ({
      ...actual,
      [id]: { ...actual[id], ...cambios },
    }));
  }

  async function enviar(e: React.FormEvent) {
    e.preventDefault();

    if (!puedeEnviar) return;

    setEnviando(true);
    setError("");
    setExito("");

    const items: NewEquipmentItem[] = elegidos.map((p) => {
      const s = selecciones[p.id];

      return {
        productId: p.id,
        modelId: s.modelo === OTRA_MARCA ? undefined : Number(s.modelo),
        customBrand: s.modelo === OTRA_MARCA ? s.marcaLibre.trim() : undefined,
        size: s.talla,
        color: s.color || undefined,
      };
    });

    try {
      const res = await createEquipmentRequest({
        studentId: Number(alumnoId),
        items,
        note: nota.trim() || undefined,
      });

      setExito(res.message);
      setSelecciones({});
      setNota("");
      onEnviada();
    } catch (err: unknown) {
      setError(mensajeDe(err, "No fue posible enviar la solicitud."));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form onSubmit={enviar} className="mt-8 space-y-6">
      {alumnos.length > 1 && (
        <Card className="p-5">
          <label htmlFor="equipo-alumno" className={ETIQUETA}>
            ¿Para quién es?
          </label>
          <select
            id="equipo-alumno"
            value={alumnoId}
            onChange={(e) =>
              setAlumnoId(e.target.value === "" ? "" : Number(e.target.value))
            }
            className={`${CAMPO} mt-2 cursor-pointer sm:max-w-sm`}
          >
            <option value="">Elige un alumno</option>
            {alumnos.map((a) => (
              <option key={a.id} value={a.id}>
                {a.firstName} {a.lastName}
              </option>
            ))}
          </select>
        </Card>
      )}

      {CATEGORIAS.map(({ value, titulo }) => (
        <section key={value} aria-labelledby={`categoria-${value}`}>
          <h2
            id={`categoria-${value}`}
            className="mb-4 text-lg font-bold text-neutral-800"
          >
            {titulo}
          </h2>

          <Card className="divide-y divide-neutral-100">
            {productos
              .filter((p) => p.category === value)
              .map((p) => (
                <FilaProducto
                  key={p.id}
                  producto={p}
                  seleccion={selecciones[p.id]}
                  onAlternar={(elegido) => alternar(p.id, elegido)}
                  onCambiar={(cambios) => actualizar(p.id, cambios)}
                />
              ))}
          </Card>
        </section>
      ))}

      <Card className="p-5">
        <label htmlFor="equipo-nota" className={ETIQUETA}>
          Nota para el profesor{" "}
          <span className="font-normal text-neutral-500">(opcional)</span>
        </label>
        <input
          id="equipo-nota"
          type="text"
          autoComplete="off"
          value={nota}
          onChange={(e) => setNota(e.target.value)}
          className={`${CAMPO} mt-2`}
        />
      </Card>

      <Card className="sticky bottom-3 z-10 space-y-2 px-5 py-3 shadow-float">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-neutral-600">
              {elegidos.length}{" "}
              {elegidos.length === 1 ? "producto" : "productos"}
              {hayPorConfirmar && " · falta confirmar precio"}
            </p>
            <p className="text-xl font-bold text-neutral-800">
              {formatMoney(total)}
            </p>
          </div>

          <button
            type="submit"
            disabled={!puedeEnviar}
            className={BOTON_PRIMARIO}
          >
            {enviando ? "Enviando…" : "Enviar al profesor"}
          </button>
        </div>

        {error && (
          <p className="text-sm font-medium text-red-700" role="alert">
            {error}
          </p>
        )}

        {exito && (
          <p className="text-sm font-medium text-emerald-700" role="status">
            {exito}
          </p>
        )}
      </Card>
    </form>
  );
}

function FilaProducto({
  producto,
  seleccion,
  onAlternar,
  onCambiar,
}: {
  producto: EquipmentProduct;
  seleccion: Seleccion | undefined;
  onAlternar: (elegido: boolean) => void;
  onCambiar: (cambios: Partial<Seleccion>) => void;
}) {
  const id = `producto-${producto.id}`;
  const modelo = producto.models.find(
    (m) => String(m.id) === seleccion?.modelo
  );
  const precio = seleccion ? precioDe(producto, seleccion) : null;

  return (
    <div className="p-4 sm:p-5">
      <label className="flex cursor-pointer items-center gap-3">
        <input
          type="checkbox"
          checked={Boolean(seleccion)}
          onChange={(e) => onAlternar(e.target.checked)}
          className="h-5 w-5 cursor-pointer accent-violet-600"
        />
        <span className="font-semibold text-neutral-800">{producto.name}</span>
      </label>

      {seleccion && (
        <div className="mt-4 space-y-4 sm:pl-8">
          <div className="grid gap-4 sm:grid-cols-[2fr_1fr]">
            <div className="space-y-2">
              <label htmlFor={`${id}-modelo`} className={ETIQUETA}>
                Marca y modelo
              </label>
              <select
                id={`${id}-modelo`}
                value={seleccion.modelo}
                onChange={(e) => onCambiar({ modelo: e.target.value })}
                className={`${CAMPO} cursor-pointer`}
              >
                <option value="">Elige una opción</option>
                {producto.models.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.brandName} · {m.name} · {formatMoney(m.priceCents)}
                  </option>
                ))}
                <option value={OTRA_MARCA}>Otra marca (especificar)</option>
              </select>
            </div>

            <div className="space-y-2">
              <label htmlFor={`${id}-talla`} className={ETIQUETA}>
                Talla
              </label>
              <select
                id={`${id}-talla`}
                value={seleccion.talla}
                onChange={(e) => onCambiar({ talla: e.target.value })}
                className={`${CAMPO} cursor-pointer`}
              >
                <option value="">Elige</option>
                {producto.sizes.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {seleccion.modelo === OTRA_MARCA && (
            <div className="space-y-2">
              <label htmlFor={`${id}-marca`} className={ETIQUETA}>
                ¿Qué marca?
              </label>
              <input
                id={`${id}-marca`}
                type="text"
                autoComplete="off"
                maxLength={60}
                value={seleccion.marcaLibre}
                onChange={(e) => onCambiar({ marcaLibre: e.target.value })}
                className={CAMPO}
              />
            </div>
          )}

          {producto.colors.length > 0 && (
            <fieldset>
              <legend className={ETIQUETA}>Color</legend>
              <div className="mt-2 flex flex-wrap gap-2">
                {[
                  ...producto.colors.map((c) => ({ valor: c, etiqueta: c })),
                  { valor: AMBOS_COLORES, etiqueta: "Ambos (2 juegos)" },
                ].map(({ valor, etiqueta }) => (
                  <label
                    key={valor}
                    className={`
                      flex min-h-11 cursor-pointer items-center rounded-2xl border px-4 text-sm font-semibold
                      transition-colors duration-200 motion-reduce:transition-none
                      has-focus-visible:ring-2 has-focus-visible:ring-violet-600
                      ${
                        seleccion.color === valor
                          ? "border-violet-300 bg-violet-50 text-violet-700"
                          : "border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-50"
                      }
                    `}
                  >
                    <input
                      type="radio"
                      name={`${id}-color`}
                      checked={seleccion.color === valor}
                      onChange={() => onCambiar({ color: valor })}
                      className="sr-only"
                    />
                    {etiqueta}
                  </label>
                ))}
              </div>
            </fieldset>
          )}

          {(modelo || seleccion.modelo === OTRA_MARCA) && (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
              <span className="font-bold text-neutral-800">
                {precio === null ? "Precio por confirmar" : formatMoney(precio)}
              </span>

              {modelo?.isExample && (
                <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-900">
                  Precio de ejemplo
                </span>
              )}

              {modelo?.url && (
                <a
                  href={modelo.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="
                    inline-flex items-center gap-1.5 font-semibold text-violet-700
                    underline-offset-2 hover:underline
                    focus-visible:ring-2 focus-visible:ring-violet-600 focus-visible:outline-none
                  "
                >
                  Ver tienda de {modelo.brandName}
                  <ExternalLink size={14} aria-hidden="true" />
                </a>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Seguimiento: la familia paga, el profesor gestiona
// ---------------------------------------------------------------------------

function TarjetaSolicitud({
  solicitud,
  esPersonal,
  onCambio,
}: {
  solicitud: EquipmentRequest;
  esPersonal: boolean;
  onCambio: () => void;
}) {
  const [precios, setPrecios] = useState<Record<number, string>>(() =>
    Object.fromEntries(
      solicitud.items.map((i) => [
        i.id,
        i.priceCents === null ? "" : String(i.priceCents / 100),
      ])
    )
  );
  const [notaPersonal, setNotaPersonal] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  const editable = esPersonal && solicitud.status === "SOLICITADO";

  async function aplicar(body: Parameters<typeof updateEquipmentRequest>[1]) {
    setGuardando(true);
    setError("");

    try {
      await updateEquipmentRequest(solicitud.id, body);
      onCambio();
    } catch (e: unknown) {
      setError(mensajeDe(e, "No fue posible guardar el cambio."));
    } finally {
      setGuardando(false);
    }
  }

  async function resolver(confirmado: boolean) {
    setGuardando(true);
    setError("");

    try {
      await resolveCharge("EQUIPO", solicitud.id, confirmado);
      onCambio();
    } catch (e: unknown) {
      setError(mensajeDe(e, "No fue posible guardar el cambio."));
    } finally {
      setGuardando(false);
    }
  }

  function confirmar() {
    aplicar({
      accion: "confirmar",
      staffNote: notaPersonal.trim() || undefined,
      prices: solicitud.items.map((i) => ({
        itemId: i.id,
        priceCents: Math.round(Number(precios[i.id] || 0) * 100),
      })),
    });
  }

  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-bold break-words text-neutral-800">
            {solicitud.studentName}
          </p>
          <p className="text-sm text-neutral-600">
            {new Intl.DateTimeFormat("es-MX", {
              day: "numeric",
              month: "long",
            }).format(new Date(solicitud.createdAt))}
            {esPersonal &&
              solicitud.requestedBy &&
              ` · pidió ${solicitud.requestedBy}`}
            {!esPersonal &&
              solicitud.teacherName &&
              ` · ${solicitud.teacherName}`}
          </p>
        </div>

        <span
          className={`shrink-0 rounded-full border px-3 py-1 text-xs font-semibold ${
            EQUIPMENT_STATUS_STYLES[solicitud.status]
          }`}
        >
          {EQUIPMENT_STATUS_LABELS[solicitud.status]}
        </span>
      </div>

      <ul className="mt-4 divide-y divide-neutral-100 border-t border-neutral-100">
        {solicitud.items.map((i) => (
          <li
            key={i.id}
            className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 py-3"
          >
            <div className="min-w-0">
              <p className="font-semibold break-words text-neutral-800">
                {i.productName}
                {i.color && ` · ${i.color}`}
              </p>
              <p className="text-sm break-words text-neutral-600">
                {i.brandName}
                {i.modelName && ` · ${i.modelName}`} · Talla {i.size}
              </p>
            </div>

            {editable ? (
              <div className="flex items-center gap-2">
                <span aria-hidden="true" className="text-neutral-600">
                  $
                </span>
                <input
                  type="text"
                  inputMode="decimal"
                  autoComplete="off"
                  aria-label={`Precio de ${i.productName}, en pesos`}
                  value={precios[i.id]}
                  onChange={(e) =>
                    setPrecios((p) => ({ ...p, [i.id]: e.target.value }))
                  }
                  className={`${CAMPO} w-28 py-2`}
                />
              </div>
            ) : (
              <p className="font-bold text-neutral-800">
                {i.priceCents === null
                  ? "Precio por confirmar"
                  : formatMoney(i.priceCents)}
              </p>
            )}
          </li>
        ))}
      </ul>

      {solicitud.note && (
        <p className="mt-2 text-sm break-words text-neutral-600 italic">
          “{solicitud.note}”
        </p>
      )}

      {solicitud.staffNote && (
        <p className="mt-2 text-sm break-words text-neutral-700">
          <span className="font-semibold">Nota del dojo:</span>{" "}
          {solicitud.staffNote}
        </p>
      )}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-neutral-100 pt-4">
        <div>
          {solicitud.amountCents !== null && (
            <p className="text-xl font-bold text-neutral-800">
              {formatMoney(solicitud.amountCents)}
            </p>
          )}
          {solicitud.method && (
            <p className="text-sm text-neutral-600">
              {PAYMENT_METHOD_LABELS[solicitud.method]}
            </p>
          )}
        </div>

        {!esPersonal && solicitud.status === "CONFIRMADO" && (
          <OpcionesDePago tipo="EQUIPO" id={solicitud.id} onCambio={onCambio} />
        )}

        {esPersonal && solicitud.status === "CONFIRMADO" && (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={guardando}
              onClick={() => aplicar({ accion: "pagado", method: "EFECTIVO" })}
              className={BOTON_SECUNDARIO}
            >
              Pagó en efectivo
            </button>
            <button
              type="button"
              disabled={guardando}
              onClick={() =>
                aplicar({ accion: "pagado", method: "TRANSFERENCIA" })
              }
              className={BOTON_SECUNDARIO}
            >
              Pagó por transferencia
            </button>
            <button
              type="button"
              disabled={guardando}
              onClick={() => aplicar({ accion: "rechazar" })}
              className={BOTON_SECUNDARIO}
            >
              Rechazar
            </button>
          </div>
        )}

        {esPersonal && solicitud.status === "REPORTADO" && (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={guardando}
              onClick={() => resolver(true)}
              className={BOTON_PRIMARIO}
            >
              Confirmar pago
            </button>
            <button
              type="button"
              disabled={guardando}
              onClick={() => resolver(false)}
              className={BOTON_SECUNDARIO}
            >
              No lo recibí
            </button>
          </div>
        )}

        {esPersonal && solicitud.status === "PAGADO" && (
          <button
            type="button"
            disabled={guardando}
            onClick={() => aplicar({ accion: "entregado" })}
            className={BOTON_PRIMARIO}
          >
            Marcar como entregado
          </button>
        )}
      </div>

      {editable && (
        <div className="mt-3 space-y-3">
          <div className="space-y-2">
            <label htmlFor={`nota-${solicitud.id}`} className={ETIQUETA}>
              Nota para la familia{" "}
              <span className="font-normal text-neutral-500">(opcional)</span>
            </label>
            <input
              id={`nota-${solicitud.id}`}
              type="text"
              autoComplete="off"
              value={notaPersonal}
              onChange={(e) => setNotaPersonal(e.target.value)}
              className={CAMPO}
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={guardando}
              onClick={confirmar}
              className={BOTON_PRIMARIO}
            >
              Confirmar disponibilidad y precio
            </button>
            <button
              type="button"
              disabled={guardando}
              onClick={() =>
                aplicar({
                  accion: "rechazar",
                  staffNote: notaPersonal.trim() || undefined,
                })
              }
              className={BOTON_SECUNDARIO}
            >
              Rechazar
            </button>
          </div>
        </div>
      )}

      {error && (
        <p className="mt-3 text-sm font-medium text-red-700" role="alert">
          {error}
        </p>
      )}
    </Card>
  );
}

export default Equipment;
