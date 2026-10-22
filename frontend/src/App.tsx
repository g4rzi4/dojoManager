import { BrowserRouter, Routes, Route } from "react-router-dom";

import ProtectedRoute from "./components/ProtectedRoute";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Teachers from "./pages/Teachers";
import Students from "./pages/Students";
import StudentDetail from "./pages/StudentDetail";
import MyCard from "./pages/MyCard";
import Events from "./pages/Events";
import NotFound from "./pages/NotFound";

/**
 * Cada ruta declara el permiso que exige. Es navegación, no seguridad: el
 * backend vuelve a validar token y permiso en cada petición.
 */
function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />

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

        <Route
          path="/alumnos/:id"
          element={
            <ProtectedRoute permission="students:read">
              <StudentDetail />
            </ProtectedRoute>
          }
        />

        <Route
          path="/eventos"
          element={
            <ProtectedRoute permission="events:read">
              <Events />
            </ProtectedRoute>
          }
        />

        {/* El alumno solo necesita sesión: su expediente lo resuelve el token */}
        <Route
          path="/mi-tarjeta"
          element={
            <ProtectedRoute>
              <MyCard />
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
