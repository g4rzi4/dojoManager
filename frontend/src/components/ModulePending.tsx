import { Construction } from "lucide-react";

import Card from "./Card";

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
        <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
          {title}
        </h1>
        <p className="mt-2 text-slate-600">{description}</p>
      </header>

      <Card className="mt-8 p-8 text-center">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
          <Construction size={26} aria-hidden="true" />
        </span>

        <h2 className="mt-4 font-bold text-slate-900">
          Módulo en construcción
        </h2>

        <p className="mx-auto mt-2 max-w-md text-sm text-slate-600">
          Esta sección se desarrolla en la rama{" "}
          <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs text-slate-800">
            {branch}
          </code>
          . Consulta el reparto de módulos en CONTRIBUTING.md.
        </p>
      </Card>
    </>
  );
}

export default ModulePending;
