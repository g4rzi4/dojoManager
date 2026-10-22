import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";

import { can, getUser, homePathFor } from "../services/session";
import type { Permission } from "../types/user";

type Props = {
  children: ReactNode;
  /** Permiso necesario. Sin él, basta con tener sesión. */
  permission?: Permission;
};

/**
 * Impide entrar a una página sin sesión o sin permiso.
 *
 * Esto es comodidad de navegación, NO seguridad: cualquiera puede editar su
 * localStorage y llegar a la pantalla. Lo que protege los datos es que el
 * backend valida el token y el permiso en cada petición, así que la página
 * se vería vacía o con un error 403.
 */
function ProtectedRoute({ children, permission }: Props) {
  const user = getUser();

  if (!user) {
    return <Navigate to="/" replace />;
  }

  if (permission && !can(user, permission)) {
    // Lo mandamos a su propia pantalla de inicio en lugar de dejarlo en una
    // página vacía sin explicación.
    return <Navigate to={homePathFor(user)} replace />;
  }

  return <>{children}</>;
}

export default ProtectedRoute;
