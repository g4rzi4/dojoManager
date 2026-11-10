/** Inscripción pública, pagos, alumnos y profesores. */
export const pagesB: Record<string, string> = {
  // Enroll
  "No fue posible abrir el enlace de inscripción.":
    "We couldn't open the enrollment link.",
  "El enlace está incompleto. Pide que te lo manden de nuevo.":
    "The link is incomplete. Ask to have it sent to you again.",
  "La contraseña debe tener al menos {min} caracteres.":
    "The password must be at least {min} characters long.",
  "No fue posible enviar el formulario.": "We couldn't submit the form.",
  Inscripción: "Enrollment",
  "Este enlace no se puede usar": "This link can't be used",
  "¡Registro completo!": "Registration complete!",
  "Iniciar sesión": "Sign in",
  "Completa tus datos": "Complete your details",
  "Datos del tutor y de sus hijos": "Guardian and children details",
  "Te invitó": "Invited by",
  "Quedarás ligado al expediente de {nombre}.":
    "You will be linked to {nombre}'s record.",
  Nombre: "First name",
  Apellido: "Last name",
  "Fecha de nacimiento": "Date of birth",
  Celular: "Mobile phone",
  "Nombre de tu tutor": "Your guardian's name",
  "(si eres menor de edad)": "(if you're a minor)",
  "Celular de tu tutor": "Your guardian's mobile phone",
  "Información médica": "Medical information",
  "(opcional)": "(optional)",
  "Alergias, lesiones o padecimientos que el profesor deba conocer.":
    "Allergies, injuries or conditions the teacher should know about.",
  "Tu nombre completo": "Your full name",
  Parentesco: "Relationship",
  Madre: "Mother",
  Padre: "Father",
  "Tutor o tutora": "Guardian",
  "Tu celular": "Your mobile phone",
  "Tus hijos en el dojo": "Your children at the dojo",
  "Hijo o hija {n}": "Child {n}",
  "Quitar al hijo {n}": "Remove child {n}",
  "Alergias, lesiones": "Allergies, injuries",
  "Agregar otro hijo": "Add another child",
  "Tu acceso al sistema": "Your system access",
  "Con esto podrás entrar a consultar tu expediente.":
    "With this you'll be able to sign in and view your record.",
  "Con esto podrás entrar a consultar el expediente de tus hijos.":
    "With this you'll be able to sign in and view your children's records.",
  "Correo electrónico": "Email",
  Contraseña: "Password",
  "Al menos {min} caracteres.": "At least {min} characters.",
  "Enviando…": "Sending…",
  "Completar inscripción": "Complete enrollment",

  // Payments
  "No fue posible cargar los pagos.": "We couldn't load the payments.",
  "Historial de mensualidades y lo que queda por cubrir.":
    "Monthly fee history and what is still to be paid.",
  "Historial de mensualidades de todo el dojo.":
    "Monthly fee history for the whole dojo.",
  "No se pudieron cargar los pagos": "Payments couldn't be loaded",
  "Por cubrir": "Outstanding",
  mensualidad: "monthly fee",
  mensualidades: "monthly fees",
  Registros: "Records",
  "mensualidades en total": "monthly fees in total",
  "Al día": "Paid up",
  "mensualidades pagadas": "monthly fees paid",
  "No hay pagos registrados": "No payments recorded",
  "Cuando el dojo registre una mensualidad, aparecerá aquí.":
    "When the dojo records a monthly fee, it will appear here.",
  "Historial de mensualidades": "Monthly fee history",
  Alumno: "Student",
  Mes: "Month",
  Monto: "Amount",
  Estado: "Status",
  Método: "Method",
  "Fecha de pago": "Payment date",
  Pagar: "Pay",

  // StudentDetail
  "Volver a alumnos": "Back to students",
  "Volver a mi panel": "Back to my dashboard",
  "No fue posible cargar el expediente.": "We couldn't load the record.",
  "El identificador del alumno no es válido.":
    "The student identifier isn't valid.",
  "Tarjeta del alumno": "Student card",
  "Editar ficha": "Edit record",
  "Invitar a un tutor": "Invite a guardian",
  "No se pudo mostrar el expediente": "The record couldn't be displayed",

  // Students
  "No fue posible cargar los alumnos.": "We couldn't load the students.",
  "Consulta la tarjeta de información y el historial de cada alumno.":
    "View each student's information card and history.",
  "Invitar por QR": "Invite by QR",
  "Registrar alumno": "Register student",
  "No se pudieron cargar los alumnos": "Students couldn't be loaded",
  "Todavía no hay alumnos": "There are no students yet",
  "Registra el primero con el botón de arriba.":
    "Register the first one with the button above.",
  "Sin profesor asignado": "No teacher assigned",
  Inactivo: "Inactive",

  // TeacherCard
  "No fue posible cargar la ficha.": "We couldn't load the record.",
  "El identificador no es válido.": "The identifier isn't valid.",
  "Volver a profesores": "Back to teachers",
  "Volver al panel": "Back to dashboard",
  "Ficha del profesor": "Teacher record",
  "No se pudo mostrar la ficha": "The record couldn't be displayed",
  "Cinta {color}": "{color} belt",
  Activo: "Active",
  "Dado de baja": "Deactivated",
  "Su clave": "Their key",
  Correo: "Email",
  Teléfono: "Phone",
  "No registrado": "Not provided",
  "En el dojo desde": "At the dojo since",
  "Notas del administrador": "Administrator notes",
  "El profesor no las ve.": "The teacher can't see them.",
  "{n} activos": "{n} active",
  Recaudado: "Collected",
  "eventos y mensualidades": "events and monthly fees",
  "Cobros de evento": "Event charges",
  "{n} confirmados": "{n} confirmed",
  Mensualidades: "Monthly fees",
  "{n} cobradas": "{n} collected",
  "Sus alumnos": "Their students",
  "Todavía no tiene alumnos asignados. Se le asignan al registrarlos con su clave.":
    "No students assigned yet. They are assigned when students are registered with the teacher's key.",
  "(inactivo)": "(inactive)",
  "Historial de cobros": "Charge history",
  "Eventos acreditados a su clave": "Events credited to their key",
  "Sin cobros de eventos. Aparecen cuando un alumno reporta un pago con su clave y él lo confirma.":
    "No event charges. They appear when a student reports a payment with the teacher's key and the teacher confirms it.",
  Evento: "Event",
  Confirmado: "Confirmed",
  "Mensualidades de sus alumnos": "Monthly fees from their students",
  "Sin mensualidades pagadas todavía.": "No monthly fees paid yet.",

  // Teachers
  "No fue posible cargar los profesores.": "We couldn't load the teachers.",
  "No fue posible cambiar el estado del profesor.":
    "We couldn't change the teacher's status.",
  "Cada profesor tiene una clave única. Se escribe al registrar un alumno para asignarlo a su grupo.":
    "Each teacher has a unique key. It is entered when registering a student to assign them to the teacher's group.",
  "Registrar profesor": "Register teacher",
  "Ocurrió un problema": "Something went wrong",
  "Todavía no hay profesores": "There are no teachers yet",
  "Registra el primero para poder asignarle alumnos.":
    "Register the first one so you can assign students.",
  "Copiar la clave {clave}": "Copy key {clave}",
  alumno: "student",
  alumnos: "students",
  "Ver ficha": "View record",
  "Dar de baja": "Deactivate",
  Reactivar: "Reactivate",
  "Tiene {n} alumnos asignados. Al estar inactivo no puede entrar al sistema, pero sus alumnos siguen ligados a él. Reasígnalos a otro profesor si hace falta.":
    "{n} students are assigned to this teacher. While inactive, they can't sign in, but their students stay linked to them. Reassign them to another teacher if needed.",
};
