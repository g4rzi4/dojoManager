import { Link } from "react-router-dom";

import Card from "../components/Card";
import { t } from "../i18n";

function NotFound() {
  return (
    <div className="flex min-h-dvh items-center justify-center p-4">
      <Card className="w-full max-w-md p-10 text-center">
        <h1 className="text-6xl font-bold text-violet-600">404</h1>
        <p className="mt-3 text-lg text-neutral-600">{t("Página no encontrada.")}</p>
        <Link
          to="/"
          className="
            mt-6 inline-block rounded-2xl bg-violet-600 px-5 py-3 font-semibold
            text-white transition-colors duration-200
            motion-reduce:transition-none hover:bg-violet-700
            focus-visible:ring-2 focus-visible:ring-violet-600 focus-visible:ring-offset-2 focus-visible:outline-none
          "
        >
          {t("Ir al inicio")}
        </Link>
      </Card>
    </div>
  );
}

export default NotFound;
