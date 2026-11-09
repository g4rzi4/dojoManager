import { useEffect, useState } from "react";

import DashboardLayout from "../layouts/DashboardLayout";
import Card from "../components/Card";
import PageHeading from "../components/PageHeading";
import StudentCardView from "../components/StudentCardView";
import { ApiError, getStudentCard } from "../services/api";
import { getUser } from "../services/session";
import { t } from "../i18n";
import type { StudentCard } from "../types/student";

/**
 * La tarjeta del alumno que tiene la sesión abierta.
 *
 * Pide /students/me, así que el backend resuelve de quién es el expediente a
 * partir del token. El frontend nunca manda un id: si lo hiciera, alguien
 * podría cambiarlo para pedir el expediente de otro alumno.
 */
function MyCard() {
  const user = getUser();

  const [student, setStudent] = useState<StudentCard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let activo = true;

    getStudentCard("me")
      .then((data) => {
        if (activo) setStudent(data);
      })
      .catch((e: unknown) => {
        if (activo) {
          setError(
            e instanceof ApiError
              ? e.message
              : t("No fue posible cargar tu expediente.")
          );
        }
      })
      .finally(() => {
        if (activo) setLoading(false);
      });

    return () => {
      activo = false;
    };
  }, []);

  return (
    <DashboardLayout>
      <header>
        <PageHeading module="tarjeta"><h1 className="text-3xl leading-tight font-bold break-words text-neutral-800 sm:text-[2.5rem]">
          {t("Hola, {nombre}", { nombre: user?.name ?? t("alumno") })}
        </h1>
        <p className="mt-1 max-w-2xl text-pretty text-neutral-600 sm:text-lg">
          {t(
            "Esta es tu tarjeta de información: tus cintas, asistencia, pagos y las observaciones de tus profesores."
          )}
        </p></PageHeading>
      </header>

      <div className="mt-8">
        {loading ? (
          <div className="space-y-6">
            <Card className="h-56 animate-pulse motion-reduce:animate-none" />
            <Card className="h-80 animate-pulse motion-reduce:animate-none" />
          </div>
        ) : error ? (
          <Card className="border-red-200 p-6">
            <p className="font-semibold text-red-800">
              {t("No se pudo mostrar tu expediente")}
            </p>
            <p className="mt-1 text-sm text-red-700">{error}</p>
          </Card>
        ) : student ? (
          <StudentCardView student={student} />
        ) : null}
      </div>
    </DashboardLayout>
  );
}

export default MyCard;
