import { Link } from "react-router-dom";

import Card from "./Card";
import ModuleTile from "./ModuleTile";
import type { ModuleKey } from "../lib/modules";

type Props = {
  to: string;
  module: ModuleKey;
  label: string;
  value: string;
  hint: string;
  alert?: boolean;
};

/** Resumen de un módulo que lleva a su pantalla. */
function ShortcutCard({ to, module, label, value, hint, alert = false }: Props) {
  return (
    <Link
      to={to}
      className="
        block rounded-[1.75rem] transition-transform duration-200
        motion-reduce:transition-none
        hover:-translate-y-0.5
        focus-visible:ring-2 focus-visible:ring-violet-600 focus-visible:outline-none
      "
    >
      <Card className="flex h-full cursor-pointer items-center gap-4 p-5">
        <ModuleTile module={module} size="lg" />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-neutral-600">{label}</p>
          <p
            className={`text-[1.75rem] leading-tight font-bold break-words ${
              alert ? "text-amber-700" : "text-neutral-800"
            }`}
          >
            {value}
          </p>
          <p className="text-sm text-neutral-600 first-letter:uppercase">
            {hint}
          </p>
        </div>
      </Card>
    </Link>
  );
}

export default ShortcutCard;
