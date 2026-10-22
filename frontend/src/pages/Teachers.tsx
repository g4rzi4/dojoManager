import DashboardLayout from "../layouts/DashboardLayout";
import ModulePending from "../components/ModulePending";

function Teachers() {
  return (
    <DashboardLayout>
      <ModulePending
        title="Profesores"
        description="Alta de profesores, horarios y asignación de grupos."
        branch="feature/teachers"
      />
    </DashboardLayout>
  );
}

export default Teachers;
