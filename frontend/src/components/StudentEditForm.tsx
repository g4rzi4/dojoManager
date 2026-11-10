import { useState } from "react";

import Card from "./Card";
import { ApiError, updateStudent } from "../services/api";
import { getUser } from "../services/session";
import type { Belt, StudentCard } from "../types/student";
import { BELT_LABELS } from "../types/student";
import { t } from "../i18n";

type Props = {
  student: StudentCard;
  onGuardado: () => void | Promise<void>;
  onCancelar: () => void;
};

const CINTAS = Object.keys(BELT_LABELS) as Belt[];

/**
 * Edición de la ficha de un alumno.
 *
 * La hacen el admin y los profesores; un profesor solo sobre los alumnos de
 * su grupo, y eso lo verifica el backend.
 *
 * Solo se mandan los campos que cambiaron: así dos personas editando campos
 * distintos no se pisan.
 */
function StudentEditForm({ student, onGuardado, onCancelar }: Props) {
  const user = getUser();
  const esAdmin = user?.role === "ADMIN";

  const [firstName, setFirstName] = useState(student.firstName);
  const [lastName, setLastName] = useState(student.lastName);
  const [birthDate, setBirthDate] = useState(student.birthDate ?? "");
  const [phone, setPhone] = useState(student.phone ?? "");
  const [guardianName, setGuardianName] = useState(student.guardianName ?? "");
  const [guardianPhone, setGuardianPhone] = useState(
    student.guardianPhone ?? ""
  );
  const [medicalNotes, setMedicalNotes] = useState(student.medicalNotes ?? "");
  const [currentBelt, setCurrentBelt] = useState<Belt>(student.currentBelt);
  const [active, setActive] = useState(student.active);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  const valido = firstName.trim().length > 0 && lastName.trim().length > 0;

  async function guardar() {
    if (!valido || guardando) return;

    setGuardando(true);
    setError("");

    // Solo lo que cambió. Mandar todo sobrescribiría lo que otra persona
    // pudo haber editado mientras tanto.
    const cambios: Parameters<typeof updateStudent>[1] = {};

    if (firstName.trim() !== student.firstName) cambios.firstName = firstName.trim();
    if (lastName.trim() !== student.lastName) cambios.lastName = lastName.trim();
    if ((birthDate || null) !== student.birthDate) cambios.birthDate = birthDate || null;
    if ((phone.trim() || null) !== student.phone) cambios.phone = phone.trim() || null;
    if ((guardianName.trim() || null) !== student.guardianName)
      cambios.guardianName = guardianName.trim() || null;
    if ((guardianPhone.trim() || null) !== student.guardianPhone)
      cambios.guardianPhone = guardianPhone.trim() || null;
    if ((medicalNotes.trim() || null) !== student.medicalNotes)
      cambios.medicalNotes = medicalNotes.trim() || null;
    if (currentBelt !== student.currentBelt) cambios.currentBelt = currentBelt;
    if (active !== student.active) cambios.active = active;

    if (Object.keys(cambios).length === 0) {
      setError(t("No cambiaste nada."));
      setGuardando(false);
      return;
    }

    try {
      await updateStudent(student.id, cambios);
      await onGuardado();
    } catch (e: unknown) {
      setError(
        e instanceof ApiError ? e.message : t("No fue posible guardar la ficha.")
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
      <h2 className="font-bold text-neutral-900">{t("Editar ficha")}</h2>

      <div className="mt-5 space-y-5">
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-2">
            <label htmlFor="se-nombre" className="block text-sm font-medium text-neutral-700">
              {t("Nombre")}
            </label>
            <input
              id="se-nombre"
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className={inputClase}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="se-apellido" className="block text-sm font-medium text-neutral-700">
              {t("Apellido")}
            </label>
            <input
              id="se-apellido"
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className={inputClase}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="se-nacimiento" className="block text-sm font-medium text-neutral-700">
              {t("Fecha de nacimiento")}
            </label>
            <input
              id="se-nacimiento"
              type="date"
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
              className={inputClase}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="se-cinta" className="block text-sm font-medium text-neutral-700">
              {t("Cinta actual")}
            </label>
            <select
              id="se-cinta"
              value={currentBelt}
              onChange={(e) => setCurrentBelt(e.target.value as Belt)}
              aria-describedby="se-cinta-ayuda"
              className={`${inputClase} cursor-pointer`}
            >
              {CINTAS.map((b) => (
                <option key={b} value={b}>
                  {t(BELT_LABELS[b])}
                </option>
              ))}
            </select>
            <p id="se-cinta-ayuda" className="text-xs text-neutral-500">
              {t("Cambia la cinta vigente, pero")} <strong>{t("no")}</strong>{" "}
              {t("agrega una graduación al historial.")}
            </p>
          </div>

          <div className="space-y-2">
            <label htmlFor="se-telefono" className="block text-sm font-medium text-neutral-700">
              {t("Teléfono")}
            </label>
            <input
              id="se-telefono"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className={inputClase}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="se-tutor" className="block text-sm font-medium text-neutral-700">
              {t("Nombre del tutor")}
            </label>
            <input
              id="se-tutor"
              type="text"
              value={guardianName}
              onChange={(e) => setGuardianName(e.target.value)}
              className={inputClase}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="se-tutor-tel" className="block text-sm font-medium text-neutral-700">
              {t("Teléfono del tutor")}
            </label>
            <input
              id="se-tutor-tel"
              type="tel"
              value={guardianPhone}
              onChange={(e) => setGuardianPhone(e.target.value)}
              className={inputClase}
            />
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor="se-medico" className="block text-sm font-medium text-neutral-700">
            {t("Información médica")}
          </label>
          <textarea
            id="se-medico"
            rows={2}
            value={medicalNotes}
            onChange={(e) => setMedicalNotes(e.target.value)}
            placeholder={t("Alergias, lesiones o padecimientos que el profesor deba conocer.")}
            className={inputClase}
          />
        </div>

        {/* Dar de baja es lógico: conserva pagos y graduaciones */}
        <label className="flex cursor-pointer items-start gap-3 border-t border-neutral-200 pt-5">
          <input
            type="checkbox"
            checked={active}
            onChange={(e) => setActive(e.target.checked)}
            className="mt-1 cursor-pointer"
          />
          <span>
            <span className="block text-sm font-medium text-neutral-700">
              {t("Alumno activo")}
            </span>
            <span className="mt-0.5 block text-xs text-neutral-600">
              {t("Desactivarlo lo saca de las listas pero conserva su historial de pagos y graduaciones.")}
            </span>
          </span>
        </label>

        {!esAdmin && (
          <p className="text-xs text-neutral-500">
            {t("Para pasar este alumno a otro profesor, pídeselo al administrador.")}
          </p>
        )}

        {error && (
          <p className="text-sm font-medium text-red-700" role="alert">
            {error}
          </p>
        )}

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={guardar}
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
            {guardando ? t("Guardando…") : t("Guardar ficha")}
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
      </div>
    </Card>
  );
}

export default StudentEditForm;
