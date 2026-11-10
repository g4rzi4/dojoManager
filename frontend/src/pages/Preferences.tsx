import { useState, useSyncExternalStore, type ReactNode } from "react";
import { Moon, Sun } from "lucide-react";

import DashboardLayout from "../layouts/DashboardLayout";
import Card from "../components/Card";
import PageHeading from "../components/PageHeading";
import { t } from "../i18n";
import { ApiError, updatePreferences } from "../services/api";
import {
  applyPreferences,
  getPreferences,
  subscribeToPreferences,
  type FontSize,
  type Language,
  type Preferences as Prefs,
  type Theme,
} from "../services/preferences";

type Option<T extends string> = {
  value: T;
  label: string;
  icon?: ReactNode;
};

type GroupProps<T extends string> = {
  name: string;
  legend: string;
  description: string;
  options: Option<T>[];
  value: T;
  disabled: boolean;
  onChange: (value: T) => void;
};

function PreferenceGroup<T extends string>({
  name,
  legend,
  description,
  options,
  value,
  disabled,
  onChange,
}: GroupProps<T>) {
  return (
    <Card className="p-5 sm:p-6">
      <fieldset disabled={disabled}>
        <legend className="text-lg font-bold text-neutral-800">{legend}</legend>
        <p className="mt-1 text-sm text-neutral-600">{description}</p>

        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          {options.map((option) => (
            <label
              key={option.value}
              className="
                flex min-h-14 cursor-pointer items-center justify-center gap-2 rounded-2xl
                border border-neutral-300 bg-surface px-4 py-3 font-semibold text-neutral-700
                transition-colors duration-200 motion-reduce:transition-none
                hover:bg-neutral-50
                has-checked:border-violet-600 has-checked:bg-violet-50 has-checked:text-violet-900
                has-focus-visible:ring-2 has-focus-visible:ring-violet-600
                has-disabled:cursor-wait
              "
            >
              <input
                type="radio"
                name={name}
                value={option.value}
                checked={option.value === value}
                onChange={() => onChange(option.value)}
                className="sr-only"
              />
              {option.icon}
              {option.label}
            </label>
          ))}
        </div>
      </fieldset>
    </Card>
  );
}

/**
 * Preferencias de la propia cuenta. Los cuatro roles entran igual.
 *
 * Primero se guarda y luego se aplica: cambiar de idioma vuelve a montar la
 * app, y si se aplicara antes, un error de guardado no tendría dónde verse.
 */
function Preferences() {
  const preferences = useSyncExternalStore(
    subscribeToPreferences,
    getPreferences
  );

  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(
    null
  );

  async function change(patch: Partial<Prefs>) {
    setSaving(true);
    setStatus(null);

    try {
      const data = await updatePreferences(patch);
      applyPreferences(data.preferences);
      setStatus({ ok: true, text: t("Cambios guardados.") });
    } catch (e) {
      setStatus({
        ok: false,
        text:
          e instanceof ApiError
            ? e.message
            : t("No se pudo guardar el cambio."),
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <DashboardLayout>
      <header>
        <PageHeading module="preferencias">
          <h1 className="text-3xl leading-tight font-bold break-words text-neutral-800 sm:text-[2.5rem]">
            {t("Preferencias")}
          </h1>
          <p className="mt-1 max-w-2xl text-pretty text-neutral-600 sm:text-lg">
            {t(
              "Ajusta cómo se ve la app. Se guarda en tu cuenta y te sigue en cualquier dispositivo."
            )}
          </p>
        </PageHeading>
      </header>

      <div className="mt-8 max-w-3xl space-y-4">
        <PreferenceGroup<Language>
          name="language"
          legend={t("Idioma")}
          description={t("El idioma de los menús y las pantallas.")}
          value={preferences.language}
          disabled={saving}
          onChange={(language) => change({ language })}
          // Cada idioma se nombra en sí mismo: quien no entiende el actual
          // tiene que poder reconocer el suyo.
          options={[
            { value: "ES", label: "Español" },
            { value: "EN", label: "English" },
          ]}
        />

        <PreferenceGroup<Theme>
          name="theme"
          legend={t("Vista")}
          description={t("Elige la que te resulte más cómoda.")}
          value={preferences.theme}
          disabled={saving}
          onChange={(theme) => change({ theme })}
          options={[
            {
              value: "LIGHT",
              label: t("Clara"),
              icon: <Sun size={18} aria-hidden="true" />,
            },
            {
              value: "DARK",
              label: t("Oscura"),
              icon: <Moon size={18} aria-hidden="true" />,
            },
          ]}
        />

        <PreferenceGroup<FontSize>
          name="fontSize"
          legend={t("Tamaño de letra")}
          description={t("Cambia el tamaño del texto en toda la app.")}
          value={preferences.fontSize}
          disabled={saving}
          onChange={(fontSize) => change({ fontSize })}
          options={[
            { value: "SMALL", label: t("Chica") },
            { value: "NORMAL", label: t("Normal") },
            { value: "LARGE", label: t("Grande") },
          ]}
        />

        <p className="text-sm text-neutral-600">
          {t(
            "Los avisos y los nombres que escribe el dojo se muestran tal como se capturaron."
          )}
        </p>

        <p
          role="status"
          className={`min-h-5 text-sm font-medium ${
            status?.ok === false ? "text-red-700" : "text-neutral-600"
          }`}
        >
          {saving ? t("Guardando…") : status?.text}
        </p>
      </div>
    </DashboardLayout>
  );
}

export default Preferences;
