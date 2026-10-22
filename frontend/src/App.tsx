import { BrowserRouter, Routes, Route } from "react-router-dom";

import ProtectedRoute from "./components/ProtectedRoute";
import Login from "./pages/Login";
import Enroll from "./pages/Enroll";
import Dashboard from "./pages/Dashboard";
import FamilyHome from "./pages/FamilyHome";
import Teachers from "./pages/Teachers";
import Students from "./pages/Students";
import StudentDetail from "./pages/StudentDetail";
import MyCard from "./pages/MyCard";
import Events from "./pages/Events";
import Payments from "./pages/Payments";
import Notifications from "./pages/Notifications";
import NotFound from "./pages/NotFound";

/**
 * Cada ruta declara el permiso que exige. Es navegación, no seguridad: el
 * backend vuelve a validar token y permiso en cada petición.
 *
 * Varias rutas solo piden sesión porque el ALCANCE lo decide el servidor:
 * en /pagos un alumno ve los suyos y un admin todos; en /alumnos/:id el
 * tutor entra por la relación con su hijo, no por un permiso.
 */
function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />

        {/* Pública: la abre una familia desde un QR, sin sesión. El token de
            la URL es lo único que la autoriza, y el backend lo valida. */}
        <Route path="/inscripcion/:token" element={<Enroll />} />

        {/* Administración */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute permission="students:read">
              <Dashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/profesores"
          element={
            <ProtectedRoute permission="teachers:read">
              <Teachers />
            </ProtectedRoute>
          }
        />

        <Route
          path="/alumnos"
          element={
            <ProtectedRoute permission="students:read">
              <Students />
            </ProtectedRoute>
          }
        />

        {/* Panel de alumno y tutor */}
        <Route
          path="/inicio"
          element={
            <ProtectedRoute>
              <FamilyHome />
            </ProtectedRoute>
          }
        />

        {/* Expediente concreto: admin y profesor por permiso, alumno y tutor
            por relación. Quien no tenga ninguna de las dos recibe 403 del
            backend y la pantalla lo explica. */}
        <Route
          path="/alumnos/:id"
          element={
            <ProtectedRoute>
              <StudentDetail />
            </ProtectedRoute>
          }
        />

        <Route
          path="/mi-tarjeta"
          element={
            <ProtectedRoute>
              <MyCard />
            </ProtectedRoute>
          }
        />

        {/* Para todos los roles */}
        <Route
          path="/eventos"
          element={
            <ProtectedRoute permission="events:read">
              <Events />
            </ProtectedRoute>
          }
        />

        <Route
          path="/pagos"
          element={
            <ProtectedRoute>
              <Payments />
            </ProtectedRoute>
          }
        />

        <Route
          path="/notificaciones"
          element={
            <ProtectedRoute>
              <Notifications />
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
