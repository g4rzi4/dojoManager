import { useEffect, useState } from "react";

import DashboardLayout from "../layouts/DashboardLayout";
import Card from "../components/Card";
import FamilyStudentCards from "../components/FamilyStudentCards";
import PageHeading from "../components/PageHeading";
import { ApiError, getMyStudents } from "../services/api";
import type { MyStudent } from "../types/payment";

/** Las fichas de los hijos del tutor. El backend decide cuáles son. */
function MyCards() {
  const [students, setStudents] = useState<MyStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let activo = true;

    getMyStudents()
      .then((data) => {
        if (activo) setStudents(data);
      })
      .catch((e: unknown) => {
        if (activo) {
          setError(
            e instanceof ApiError
              ? e.message
              : "No fue posible cargar las fichas."
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
        <PageHeading module="tarjeta">
          <h1 className="text-3xl leading-tight font-bold break-words text-neutral-800 sm:text-[2.5rem]">
            Mis fichas
          </h1>
          <p className="mt-1 max-w-2xl text-pretty text-neutral-600 sm:text-lg">
            Cintas, asistencia, pagos y observaciones de cada uno de tus hijos.
          </p>
        </PageHeading>
      </header>

      <div className="mt-8">
        {loading ? (
          <Card className="h-96 animate-pulse motion-reduce:animate-none" />
        ) : error ? (
          <Card className="border-red-200 p-6">
            <p className="font-semibold text-red-800">
              No se pudieron cargar las fichas
            </p>
            <p className="mt-1 text-sm text-red-700">{error}</p>
          </Card>
        ) : students.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="font-bold text-neutral-800">
              Todavía no tienes alumnos a tu cargo
            </p>
            <p className="mt-1 text-sm text-neutral-600">
              Cuando el dojo registre a tus hijos, sus fichas aparecerán aquí.
            </p>
          </Card>
        ) : (
          <FamilyStudentCards students={students} />
        )}
      </div>
    </DashboardLayout>
  );
}

export default MyCards;
