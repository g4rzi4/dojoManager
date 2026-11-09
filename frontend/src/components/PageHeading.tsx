import type { ReactNode } from "react";

import ModuleTile from "./ModuleTile";
import type { ModuleKey } from "../lib/modules";

type Props = {
  module: ModuleKey;
  /** El h1 de la pantalla y, si la hay, su descripción. */
  children: ReactNode;
};

/** Encabezado de pantalla: el color del módulo y el título junto a él. */
function PageHeading({ module, children }: Props) {
  return (
    <div className="flex min-w-0 flex-1 basis-72 items-center gap-4">
      <ModuleTile module={module} size="lg" />
      <div className="min-w-0">{children}</div>
    </div>
  );
}

export default PageHeading;
