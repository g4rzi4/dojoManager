import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import ProtectedRoute from "./components/ProtectedRoute";
import Login from "./pages/Login";

// Cada pantalla se descarga al abrirla: así el SDK de PayPal y los formularios
// grandes no pesan en el login.
const Enroll = lazy(() => import("./pages/Enroll"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const Attendance = lazy(() => import("./pages/Attendance"));
const Platform = lazy(() => import("./pages/Platform"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const FamilyHome = lazy(() => import("./pages/FamilyHome"));
const Teachers = lazy(() => import("./pages/Teachers"));
const TeacherCard = lazy(() => import("./pages/TeacherCard"));
const Students = lazy(() => import("./pages/Students"));
const StudentDetail = lazy(() => import("./pages/StudentDetail"));
const MyCard = lazy(() => import("./pages/MyCard"));
const MyCards = lazy(() => import("./pages/MyCards"));
const Events = lazy(() => import("./pages/Events"));
const Classes = lazy(() => import("./pages/Classes"));
const Payments = lazy(() => import("./pages/Payments"));
const Equipment = lazy(() => import("./pages/Equipment"));
const Notifications = lazy(() => import("./pages/Notifications"));
const Preferences = lazy(() => import("./pages/Preferences"));
const NotFound = lazy(() => import("./pages/NotFound"));

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
      <Suspense fallback={null}>
      <Routes>
        <Route path="/" element={<Login />} />

        {/* Pública: la abre una familia desde un QR, sin sesión. El token de
            la URL es lo único que la autoriza, y el backend lo valida. */}
        <Route path="/inscripcion/:token" element={<Enroll />} />

        {/* Públicas: quien olvidó su contraseña no tiene sesión. */}
        <Route path="/recuperar" element={<ForgotPassword />} />
        <Route path="/restablecer/:token" element={<ResetPassword />} />

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

        {/* La ficha: el admin ve cualquiera, el profesor solo la suya. Lo
            decide el backend, así que la ruta solo pide sesión. */}
        <Route
          path="/profesores/:id"
          element={
            <ProtectedRoute>
              <TeacherCard />
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
          path="/asistencia"
          element={
            <ProtectedRoute permission="students:write">
              <Attendance />
            </ProtectedRoute>
          }
        />

        {/* Panel de alumno y tutor */}
        <Route
          path="/inicio"
          element={
            <ProtectedRoute roles={["ALUMNO", "TUTOR"]}>
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
            <ProtectedRoute roles={["ALUMNO"]}>
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
          path="/clases"
          element={
            <ProtectedRoute permission="events:read">
              <Classes />
            </ProtectedRoute>
          }
        />

        <Route
          path="/mis-fichas"
          element={
            <ProtectedRoute roles={["TUTOR"]}>
              <MyCards />
            </ProtectedRoute>
          }
        />

        <Route
          path="/uniformes"
          element={
            <ProtectedRoute>
              <Equipment />
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

        <Route
          path="/preferencias"
          element={
            <ProtectedRoute>
              <Preferences />
            </ProtectedRoute>
          }
        />

        <Route
          path="/plataforma"
          element={
            <ProtectedRoute permission="platform:manage">
              <Platform />
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<NotFound />} />
      </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;
