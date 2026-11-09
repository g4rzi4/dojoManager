import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Pencil, QrCode } from "lucide-react";

import DashboardLayout from "../layouts/DashboardLayout";
import Card from "../components/Card";
import { t } from "../i18n";
import PageHeading from "../components/PageHeading";
import StudentCardView from "../components/StudentCardView";
import InvitationDialog from "../components/InvitationDialog";
import StudentEditForm from "../components/StudentEditForm";
import { ApiError, getStudentCard } from "../services/api";
import { can, getUser } from "../services/session";
import type { StudentCard } from "../types/student";

/**
 * Un solo estado en lugar de tres booleanos sueltos: así no hay forma de
 * quedar en "cargando" y "con error" a la vez, y no hace falta llamar a
 * setState dentro del cuerpo del efecto.
 */
type Estado =
  | { status: "cargando" }
  | { status: "ok"; student: StudentCard }
  | { status: "error"; message: string };

/**
 * Tarjeta de un alumno vista por un administrador o profesor.
 *
 * Si el backend responde 403, se muestra tal cual: aunque el menú esté
 * oculto, quien escriba la URL a mano debe recibir una explicación clara.
 */
function StudentDetail() {
  const { id } = useParams<{ id: string }>();

  // El tutor no tiene acceso a /alumnos, así que su enlace de regreso debe
  // apuntar a su propio panel.
  const user = getUser();
  const volverA = can(user, "students:read") ? "/alumnos" : "/inicio";
  const volverTexto = can(user, "students:read")
    ? t("Volver a alumnos")
    : t("Volver a mi panel");

  // La validez del id se deriva del render, no de un efecto.
  const studentId = Number(id);
  const idValido = Number.isInteger(studentId) && studentId >= 1;

  const [estado, setEstado] = useState<Estado>({ status: "cargando" });
  const [invitandoTutor, setInvitandoTutor] = useState(false);
  const [editando, setEditando] = useState(false);

  /** Vuelve a pedir la ficha tras guardarla. */
  function recargar() {
    return getStudentCard(studentId)
      .then((student) => setEstado({ status: "ok", student }))
      .catch(() => {});
  }

  // Solo quien puede editar alumnos puede generar invitaciones.
  const puedeInvitar = can(user, "students:write");

  useEffect(() => {
    if (!idValido) return;

    let activo = true;

    getStudentCard(studentId)
      .then((student) => {
        if (activo) setEstado({ status: "ok", student });
      })
      .catch((e: unknown) => {
        if (activo) {
          setEstado({
            status: "error",
            message:
              e instanceof ApiError
                ? e.message
                : t("No fue posible cargar el expediente."),
          });
        }
      });

    return () => {
      activo = false;
    };
  }, [studentId, idValido]);

  const estadoFinal: Estado = idValido
    ? estado
    : { status: "error", message: t("El identificador del alumno no es válido.") };

  return (
    <DashboardLayout>
      <Link
        to={volverA}
        className="
          inline-flex items-center gap-2 rounded-xl py-2 text-sm font-semibold
          text-violet-700 transition-colors duration-200
          motion-reduce:transition-none
          hover:text-violet-900
          focus-visible:ring-2 focus-visible:ring-violet-600 focus-visible:outline-none
        "
      >
        <ArrowLeft size={17} aria-hidden="true" />
        {volverTexto}
      </Link>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <PageHeading module="alumnos"><h1 className="text-3xl leading-tight font-bold break-words text-neutral-800 sm:text-[2.5rem]">
          {t("Tarjeta del alumno")}
        </h1></PageHeading>

        {puedeInvitar && estadoFinal.status === "ok" && (
          <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setEditando((v) => !v)}
            aria-expanded={editando}
            className="
              flex cursor-pointer items-center gap-2 rounded-2xl border
              border-neutral-300 bg-surface px-4 py-2.5 text-sm font-semibold
              text-neutral-700 transition-colors duration-200
              motion-reduce:transition-none
              hover:bg-neutral-50
              focus-visible:ring-2 focus-visible:ring-violet-600 focus-visible:outline-none
            "
          >
            <Pencil size={17} aria-hidden="true" />
            {t("Editar ficha")}
          </button>

          <button
            type="button"
            onClick={() => setInvitandoTutor((v) => !v)}
            aria-expanded={invitandoTutor}
            className="
              flex cursor-pointer items-center gap-2 rounded-2xl border
              border-neutral-300 bg-surface px-4 py-2.5 text-sm font-semibold
              text-neutral-700 transition-colors duration-200
              motion-reduce:transition-none
              hover:bg-neutral-50
              focus-visible:ring-2 focus-visible:ring-violet-600 focus-visible:outline-none
            "
          >
            <QrCode size={17} aria-hidden="true" />
            {t("Invitar a un tutor")}
          </button>
          </div>
        )}
      </div>

      {editando && puedeInvitar && estadoFinal.status === "ok" && (
        <div className="mt-6">
          <StudentEditForm
            student={estadoFinal.student}
            onGuardado={async () => {
              setEditando(false);
              await recargar();
            }}
            onCancelar={() => setEditando(false)}
          />
        </div>
      )}

      {invitandoTutor && puedeInvitar && estadoFinal.status === "ok" && (
        <div className="mt-6">
          <InvitationDialog
            studentId={estadoFinal.student.id}
            studentName={`${estadoFinal.student.firstName} ${estadoFinal.student.lastName}`}
            soloTipo="TUTOR"
            onCerrar={() => setInvitandoTutor(false)}
          />
        </div>
      )}

      <div className="mt-6">
        {estadoFinal.status === "cargando" && (
          <div className="space-y-6">
            <Card className="h-56 animate-pulse motion-reduce:animate-none" />
            <Card className="h-80 animate-pulse motion-reduce:animate-none" />
          </div>
        )}

        {estadoFinal.status === "error" && (
          <Card className="border-red-200 p-6">
            <p className="font-semibold text-red-800">
              {t("No se pudo mostrar el expediente")}
            </p>
            <p className="mt-1 text-sm text-red-700">{estadoFinal.message}</p>
          </Card>
        )}

        {estadoFinal.status === "ok" && (
          <StudentCardView student={estadoFinal.student} />
        )}
      </div>
    </DashboardLayout>
  );
}

export default StudentDetail;
