import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronRight, QrCode, UserPlus, Users } from "lucide-react";

import DashboardLayout from "../layouts/DashboardLayout";
import Card from "../components/Card";
import StudentForm from "../components/StudentForm";
import InvitationDialog from "../components/InvitationDialog";
import { ApiError, getStudents } from "../services/api";
import type { StudentListItem } from "../types/student";
import { BELT_LABELS, BELT_STYLES } from "../types/student";

function Students() {
  const [students, setStudents] = useState<StudentListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [registrando, setRegistrando] = useState(false);
  const [invitando, setInvitando] = useState(false);

  function cargar() {
    return getStudents()
      .then(setStudents)
      .catch((e: unknown) => {
        setError(
          e instanceof ApiError
            ? e.message
            : "No fue posible cargar los alumnos."
        );
      });
  }

  useEffect(() => {
    let activo = true;

    getStudents()
      .then((data) => {
        if (activo) setStudents(data);
      })
      .catch((e: unknown) => {
        if (activo) {
          setError(
            e instanceof ApiError
              ? e.message
              : "No fue posible cargar los alumnos."
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
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
            Alumnos
          </h1>
          <p className="mt-2 text-slate-600">
            Consulta la tarjeta de información y el historial de cada alumno.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setInvitando((v) => !v)}
          aria-expanded={invitando}
          className="
            flex cursor-pointer items-center gap-2 rounded-xl border
            border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold
            text-slate-700 transition-colors duration-200
            motion-reduce:transition-none
            hover:bg-slate-50
            focus:ring-2 focus:ring-blue-600 focus:outline-none
          "
        >
          <QrCode size={17} aria-hidden="true" />
          Invitar por QR
        </button>

        <button
          type="button"
          onClick={() => setRegistrando((v) => !v)}
          aria-expanded={registrando}
          className="
            flex cursor-pointer items-center gap-2 rounded-xl bg-blue-600
            px-4 py-2.5 text-sm font-semibold text-white
            transition-colors duration-200
            motion-reduce:transition-none
            hover:bg-blue-700
            focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 focus:outline-none
          "
        >
          <UserPlus size={17} aria-hidden="true" />
          Registrar alumno
        </button>
        </div>
      </header>

      {invitando && (
        <div className="mt-6">
          <InvitationDialog onCerrar={() => setInvitando(false)} />
        </div>
      )}

      {registrando && (
        <div className="mt-6">
          <StudentForm
            onCreado={async () => {
              setRegistrando(false);
              await cargar();
            }}
            onCancelar={() => setRegistrando(false)}
          />
        </div>
      )}

      <section className="mt-8">
        {loading ? (
          <div className="space-y-3">
            <Card className="h-20 animate-pulse motion-reduce:animate-none" />
            <Card className="h-20 animate-pulse motion-reduce:animate-none" />
            <Card className="h-20 animate-pulse motion-reduce:animate-none" />
          </div>
        ) : error ? (
          <Card className="border-red-200 p-6">
            <p className="font-semibold text-red-800">
              No se pudieron cargar los alumnos
            </p>
            <p className="mt-1 text-sm text-red-700">{error}</p>
          </Card>
        ) : students.length === 0 ? (
          <Card className="p-8 text-center">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
              <Users size={26} aria-hidden="true" />
            </span>
            <h2 className="mt-4 font-bold text-slate-900">
              Todavía no hay alumnos
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              Registra el primero con el botón de arriba.
            </p>
          </Card>
        ) : (
          <ul className="space-y-3">
            {students.map((s) => (
              <li key={s.id}>
                <Link
                  to={`/alumnos/${s.id}`}
                  className="
                    block rounded-2xl transition-shadow duration-200
                    motion-reduce:transition-none
                    hover:shadow-xl
                    focus:ring-2 focus:ring-blue-600 focus:outline-none
                  "
                >
                  <Card className="flex cursor-pointer items-center gap-4 p-4">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-sm font-bold text-white">
                      {s.firstName.charAt(0).toUpperCase()}
                      {s.lastName.charAt(0).toUpperCase()}
                    </span>

                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-slate-900">
                        {s.firstName} {s.lastName}
                      </p>
                      <p className="mt-0.5 text-sm text-slate-600">
                        {s.teacherName ?? "Sin profesor asignado"}
                      </p>
                    </div>

                    <span
                      className={`hidden shrink-0 rounded-full border px-3 py-1 text-xs font-semibold sm:block ${
                        BELT_STYLES[s.currentBelt]
                      }`}
                    >
                      {BELT_LABELS[s.currentBelt]}
                    </span>

                    {!s.active && (
                      <span className="shrink-0 rounded-full border border-slate-300 bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                        Inactivo
                      </span>
                    )}

                    <ChevronRight
                      size={20}
                      aria-hidden="true"
                      className="shrink-0 text-slate-400"
                    />
                  </Card>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </DashboardLayout>
  );
}

export default Students;
