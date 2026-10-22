import DashboardLayout from "../layouts/DashboardLayout";
import ModulePending from "../components/ModulePending";

function Students() {
  return (
    <DashboardLayout>
      <ModulePending
        title="Alumnos"
        description="Registro de alumnos, control de cinturones y asistencia."
        branch="feature/students"
      />
    </DashboardLayout>
  );
}

export default Students;
