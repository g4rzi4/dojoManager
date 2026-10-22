import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

import DashboardLayout from "../layouts/DashboardLayout";
import Card from "../components/Card";
import StudentCardView from "../components/StudentCardView";
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
    ? "Volver a alumnos"
    : "Volver a mi panel";

  // La validez del id se deriva del render, no de un efecto.
  const studentId = Number(id);
  const idValido = Number.isInteger(studentId) && studentId >= 1;

  const [estado, setEstado] = useState<Estado>({ status: "cargando" });

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
                : "No fue posible cargar el expediente.",
          });
        }
      });

    return () => {
      activo = false;
    };
  }, [studentId, idValido]);

  const estadoFinal: Estado = idValido
    ? estado
    : { status: "error", message: "El identificador del alumno no es válido." };

  return (
    <DashboardLayout>
      <Link
        to={volverA}
        className="
          inline-flex items-center gap-2 rounded-lg py-2 text-sm font-semibold
          text-blue-700 transition-colors duration-200
          motion-reduce:transition-none
          hover:text-blue-900
          focus:ring-2 focus:ring-blue-600 focus:outline-none
        "
      >
        <ArrowLeft size={17} aria-hidden="true" />
        {volverTexto}
      </Link>

      <h1 className="mt-3 text-2xl font-bold text-slate-900 sm:text-3xl">
        Tarjeta del alumno
      </h1>

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
              No se pudo mostrar el expediente
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
