import { Construction } from "lucide-react";

import { t } from "../i18n";
import Card from "./Card";
import PageHeading from "./PageHeading";

type Props = {
  title: string;
  description: string;
  /** Rama de git responsable de este módulo, p. ej. "feature/students". */
  branch: string;
};

/**
 * Pantalla para las secciones del sidebar cuyo módulo todavía no se
 * implementa. Existe para que la navegación no lleve a una página en blanco
 * y para que quede claro de quién es el pendiente.
 */
function ModulePending({ title, description, branch }: Props) {
  return (
    <>
      <header>
        <PageHeading module="inicio"><h1 className="text-3xl leading-tight font-bold break-words text-neutral-800 sm:text-[2.5rem]">
          {title}
        </h1>
        <p className="mt-1 max-w-2xl text-pretty text-neutral-600 sm:text-lg">{description}</p></PageHeading>
      </header>

      <Card className="mt-8 p-8 text-center">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-3xl bg-neutral-100 text-neutral-500">
          <Construction size={26} aria-hidden="true" />
        </span>

        <h2 className="mt-4 font-bold text-neutral-900">
          {t("Módulo en construcción")}
        </h2>

        <p className="mx-auto mt-2 max-w-md text-sm text-neutral-600">
          {t("Esta sección se desarrolla en la rama")}{" "}
          <code className="rounded bg-neutral-100 px-1.5 py-0.5 font-mono text-xs text-neutral-800">
            {branch}
          </code>
          . {t("Consulta el reparto de módulos en CONTRIBUTING.md.")}
        </p>
      </Card>
    </>
  );
}

export default ModulePending;
