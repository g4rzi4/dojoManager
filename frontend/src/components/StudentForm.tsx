import { useState } from "react";

import Card from "./Card";
import { ApiError, createStudent } from "../services/api";
import { getUser } from "../services/session";
import { t } from "../i18n";

type Props = {
  onCreado: () => void | Promise<void>;
  onCancelar: () => void;
};

/**
 * Alta de un alumno. La usan el ADMIN y los PROFESOR.
 *
 * La clave del profesor decide a qué grupo entra. Un profesor no necesita
 * escribirla —se asigna a sí mismo— y de hecho el backend le rechaza la
 * clave de otro profesor.
 */
function StudentForm({ onCreado, onCancelar }: Props) {
  const user = getUser();
  const esAdmin = user?.role === "ADMIN";

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [phone, setPhone] = useState("");
  const [guardianName, setGuardianName] = useState("");
  const [guardianPhone, setGuardianPhone] = useState("");
  const [medicalNotes, setMedicalNotes] = useState("");
  const [teacherCode, setTeacherCode] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  const valido = firstName.trim().length > 0 && lastName.trim().length > 0;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    if (!valido || guardando) return;

    setGuardando(true);
    setError("");

    try {
      await createStudent({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        birthDate: birthDate || undefined,
        phone: phone.trim() || undefined,
        guardianName: guardianName.trim() || undefined,
        guardianPhone: guardianPhone.trim() || undefined,
        medicalNotes: medicalNotes.trim() || undefined,
        teacherCode: teacherCode.trim() || undefined,
      });

      await onCreado();
    } catch (e: unknown) {
      setError(
        e instanceof ApiError
          ? e.message
          : t("No fue posible registrar al alumno.")
      );
    } finally {
      setGuardando(false);
    }
  }

  const inputClase = `
    w-full rounded-2xl border border-neutral-300 bg-surface px-4 py-3
    outline-none transition-[border-color,box-shadow,background-color]
    focus:border-violet-600 focus-visible:ring-4 focus-visible:ring-violet-100
  `;

  return (
    <Card className="p-5 sm:p-6">
      <h2 className="font-bold text-neutral-900">{t("Registrar un alumno")}</h2>
      <p className="mt-1 text-sm text-neutral-600">
        {esAdmin
          ? t("Escribe la clave del profesor para asignarlo a su grupo.")
          : t("Queda asignado a tu grupo automáticamente.")}
      </p>

      <form onSubmit={handleSubmit} className="mt-5 space-y-5">
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-2">
            <label
              htmlFor="al-nombre"
              className="block text-sm font-medium text-neutral-700"
            >
              {t("Nombre")}
            </label>
            <input
              id="al-nombre"
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className={inputClase}
            />
          </div>

          <div className="space-y-2">
            <label
              htmlFor="al-apellido"
              className="block text-sm font-medium text-neutral-700"
            >
              {t("Apellido")}
            </label>
            <input
              id="al-apellido"
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className={inputClase}
            />
          </div>

          <div className="space-y-2">
            <label
              htmlFor="al-nacimiento"
              className="block text-sm font-medium text-neutral-700"
            >
              {t("Fecha de nacimiento")}{" "}
              <span className="font-normal text-neutral-500">{t("(opcional)")}</span>
            </label>
            <input
              id="al-nacimiento"
              type="date"
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
              className={inputClase}
            />
          </div>

          <div className="space-y-2">
            <label
              htmlFor="al-telefono"
              className="block text-sm font-medium text-neutral-700"
            >
              {t("Teléfono")}{" "}
              <span className="font-normal text-neutral-500">{t("(opcional)")}</span>
            </label>
            <input
              id="al-telefono"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className={inputClase}
            />
          </div>

          <div className="space-y-2">
            <label
              htmlFor="al-tutor"
              className="block text-sm font-medium text-neutral-700"
            >
              {t("Nombre del tutor")}{" "}
              <span className="font-normal text-neutral-500">{t("(opcional)")}</span>
            </label>
            <input
              id="al-tutor"
              type="text"
              value={guardianName}
              onChange={(e) => setGuardianName(e.target.value)}
              className={inputClase}
            />
          </div>

          <div className="space-y-2">
            <label
              htmlFor="al-tutor-tel"
              className="block text-sm font-medium text-neutral-700"
            >
              {t("Teléfono del tutor")}{" "}
              <span className="font-normal text-neutral-500">{t("(opcional)")}</span>
            </label>
            <input
              id="al-tutor-tel"
              type="tel"
              value={guardianPhone}
              onChange={(e) => setGuardianPhone(e.target.value)}
              className={inputClase}
            />
          </div>
        </div>

        <div className="space-y-2">
          <label
            htmlFor="al-medico"
            className="block text-sm font-medium text-neutral-700"
          >
            {t("Información médica")}{" "}
            <span className="font-normal text-neutral-500">{t("(opcional)")}</span>
          </label>
          <textarea
            id="al-medico"
            rows={2}
            value={medicalNotes}
            onChange={(e) => setMedicalNotes(e.target.value)}
            placeholder={t("Alergias, lesiones o padecimientos que el profesor deba conocer.")}
            className={inputClase}
          />
        </div>

        {/* Un profesor no la necesita: el backend lo autoasigna, y le
            rechazaría la clave de otro. */}
        {esAdmin && (
          <div className="space-y-2">
            <label
              htmlFor="al-clave"
              className="block text-sm font-medium text-neutral-700"
            >
              {t("Clave del profesor")}{" "}
              <span className="font-normal text-neutral-500">{t("(opcional)")}</span>
            </label>
            <input
              id="al-clave"
              type="text"
              value={teacherCode}
              onChange={(e) => setTeacherCode(e.target.value)}
              placeholder="PROF-7K2M"
              aria-describedby="al-clave-ayuda"
              className={`${inputClase} font-mono`}
            />
            <p id="al-clave-ayuda" className="text-xs text-neutral-500">
              {t("La encuentras en la sección de Profesores. Si la dejas vacía, el alumno queda sin profesor asignado.")}
            </p>
          </div>
        )}

        {error && (
          <p className="text-sm font-medium text-red-700" role="alert">
            {error}
          </p>
        )}

        <div className="flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={!valido || guardando}
            className="
              cursor-pointer rounded-2xl bg-violet-600 px-5 py-3 font-semibold
              text-white transition-colors duration-200
              motion-reduce:transition-none
              hover:bg-violet-700
              focus-visible:ring-2 focus-visible:ring-violet-600 focus-visible:ring-offset-2 focus-visible:outline-none
              disabled:cursor-not-allowed disabled:opacity-50
            "
          >
            {guardando ? t("Registrando…") : t("Registrar alumno")}
          </button>

          <button
            type="button"
            onClick={onCancelar}
            className="
              cursor-pointer rounded-2xl border border-neutral-300 bg-surface px-5 py-3
              font-semibold text-neutral-700 transition-colors duration-200
              motion-reduce:transition-none
              hover:bg-neutral-50
              focus-visible:ring-2 focus-visible:ring-violet-600 focus-visible:outline-none
            "
          >
            {t("Cancelar")}
          </button>
        </div>
      </form>
    </Card>
  );
}

export default StudentForm;
