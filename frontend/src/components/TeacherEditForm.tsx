import { useState, type ReactNode } from "react";

import Card from "./Card";
import { ApiError, updateTeacher } from "../services/api";
import type { TeacherCard, TeacherUpdate } from "../types/teacher";
import type { Belt } from "../types/student";
import { BELT_LABELS } from "../types/student";
import { t } from "../i18n";

type Props = {
  teacher: TeacherCard;
  /** El administrador también edita nombre, correo y sus notas internas. */
  esAdmin: boolean;
  onGuardado: () => void;
  onCancelar: () => void;
};

const CINTAS = Object.keys(BELT_LABELS) as Belt[];

const inputClase = `
  w-full rounded-2xl border border-neutral-300 bg-surface px-4 py-3
  outline-none transition-[border-color,box-shadow,background-color]
  focus:border-violet-600 focus-visible:ring-4 focus-visible:ring-violet-100
`;

function Campo({ id, label, children }: { id: string; label: string; children: ReactNode }) {
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="block text-sm font-medium text-neutral-700">
        {label}
      </label>
      {children}
    </div>
  );
}

/**
 * Edición de la ficha de un profesor.
 *
 * El administrador edita todo; el propio profesor, sus datos de contacto y
 * de trabajo, pero no su nombre, su correo ni las notas internas. El backend
 * lo vuelve a comprobar.
 *
 * Solo se mandan los campos que cambiaron, para no pisar lo que otra persona
 * haya editado mientras tanto.
 */
function TeacherEditForm({ teacher, esAdmin, onGuardado, onCancelar }: Props) {
  const [name, setName] = useState(teacher.name);
  const [email, setEmail] = useState(teacher.email);
  const [phone, setPhone] = useState(teacher.phone ?? "");
  const [belt, setBelt] = useState<Belt | "">(teacher.belt ?? "");
  const [specialty, setSpecialty] = useState(teacher.specialty ?? "");
  const [hiredAt, setHiredAt] = useState(teacher.hiredAt ?? "");
  const [adminNotes, setAdminNotes] = useState(teacher.adminNotes ?? "");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  const valido = !esAdmin || (name.trim().length > 1 && email.trim().length > 0);

  async function guardar() {
    if (!valido || guardando) return;

    setGuardando(true);
    setError("");

    const cambios: TeacherUpdate = {};

    if (esAdmin) {
      if (name.trim() !== teacher.name) cambios.name = name.trim();
      if (email.trim().toLowerCase() !== teacher.email) cambios.email = email.trim();
      if ((adminNotes.trim() || null) !== teacher.adminNotes)
        cambios.adminNotes = adminNotes.trim() || null;
    }
    if ((phone.trim() || null) !== teacher.phone) cambios.phone = phone.trim() || null;
    if ((belt || null) !== teacher.belt) cambios.belt = belt || null;
    if ((specialty.trim() || null) !== teacher.specialty)
      cambios.specialty = specialty.trim() || null;
    if ((hiredAt || null) !== teacher.hiredAt) cambios.hiredAt = hiredAt || null;

    if (Object.keys(cambios).length === 0) {
      setError(t("No cambiaste nada."));
      setGuardando(false);
      return;
    }

    try {
      await updateTeacher(teacher.id, cambios);
      onGuardado();
    } catch (e: unknown) {
      setError(
        e instanceof ApiError
          ? e.message
          : t("No fue posible conectar con el servidor.")
      );
      setGuardando(false);
    }
  }

  return (
    <Card className="p-5 sm:p-6">
      <h2 className="font-bold text-neutral-900">{t("Editar ficha")}</h2>

      <div className="mt-5 space-y-5">
        {esAdmin && (
          <div className="grid gap-5 sm:grid-cols-2">
            <Campo id="te-nombre" label={t("Nombre completo")}>
              <input
                id="te-nombre"
                value={name}
                maxLength={80}
                autoComplete="off"
                onChange={(e) => setName(e.target.value)}
                className={inputClase}
              />
            </Campo>
            <Campo id="te-correo" label={t("Correo electrónico")}>
              <input
                id="te-correo"
                type="email"
                value={email}
                spellCheck={false}
                autoComplete="off"
                onChange={(e) => setEmail(e.target.value)}
                className={inputClase}
              />
            </Campo>
          </div>
        )}

        <div className="grid gap-5 sm:grid-cols-2">
          <Campo id="te-telefono" label={t("Teléfono")}>
            <input
              id="te-telefono"
              type="tel"
              value={phone}
              autoComplete="off"
              onChange={(e) => setPhone(e.target.value)}
              className={inputClase}
            />
          </Campo>
          <Campo id="te-grado" label={t("Grado")}>
            <select
              id="te-grado"
              value={belt}
              onChange={(e) => setBelt(e.target.value as Belt | "")}
              className={`${inputClase} cursor-pointer`}
            >
              <option value="">{t("Sin registrar")}</option>
              {CINTAS.map((c) => (
                <option key={c} value={c}>
                  {t(BELT_LABELS[c])}
                </option>
              ))}
            </select>
          </Campo>
          <Campo id="te-especialidad" label={t("Especialidad")}>
            <input
              id="te-especialidad"
              value={specialty}
              autoComplete="off"
              onChange={(e) => setSpecialty(e.target.value)}
              className={inputClase}
            />
          </Campo>
          <Campo id="te-ingreso" label={t("Fecha de ingreso")}>
            <input
              id="te-ingreso"
              type="date"
              value={hiredAt}
              onChange={(e) => setHiredAt(e.target.value)}
              className={inputClase}
            />
          </Campo>
        </div>

        {esAdmin && (
          <Campo id="te-notas" label={t("Notas internas (solo las ve el administrador)")}>
            <textarea
              id="te-notas"
              rows={3}
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              className={inputClase}
            />
          </Campo>
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

export default TeacherEditForm;
