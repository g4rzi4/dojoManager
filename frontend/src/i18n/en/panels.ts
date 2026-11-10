/** Paneles y componentes: pagos de eventos, calendario, invitaciones, tarjeta del alumno. */
export const panels: Record<string, string> = {
  // EventPaymentPanel
  "No fue posible reportar el pago.": "Couldn't report the payment.",
  "Pago del evento": "Event payment",
  "Cada modalidad tiene su costo. Paga con tu profesor y luego repórtalo aquí con su clave.":
    "Each modality has its own price. Pay your teacher, then report it here with their key.",
  "Cuesta {precio}. Paga con tu profesor y luego repórtalo aquí con su clave.":
    "It costs {precio}. Pay your teacher, then report it here with their key.",
  Alumno: "Student",
  inscrito: "enrolled",
  "Completa el pago para quedar inscrito.":
    "Complete the payment to be enrolled.",
  "Ya reportaste el pago de todos tus alumnos para este evento.":
    "You've already reported payment for all your students for this event.",
  "¿De quién es el pago?": "Who is the payment for?",
  "Elige un alumno": "Choose a student",
  "¿A qué modalidades entra?": "Which modalities is the student entering?",
  "Total a pagar": "Total to pay",
  "Categoría de competencia": "Competition category",
  "(opcional)": "(optional)",
  Rama: "Division",
  "Sin especificar": "Not specified",
  "Tipo de cinta": "Belt type",
  "Categoría de edad": "Age category",
  "Puede no coincidir con su edad: hay alumnos a los que se foguea en una categoría mayor.":
    "It may not match their age: some students are bumped up to an older category for experience.",
  "¿Cómo pagaste?": "How did you pay?",
  "(pagar en línea ahora)": "(pay online now)",
  "Nota para el profesor": "Note for the teacher",
  "Pagué en efectivo el martes": "I paid in cash on Tuesday",
  "Clave de tu profesor": "Your teacher's key",
  "Tu profesor te la comparte. Con ella el cobro queda registrado a su nombre.":
    "Your teacher shares it with you. With it, the charge is recorded under their name.",
  "Enviando…": "Sending…",
  "Continuar a PayPal": "Continue to PayPal",
  "Ya pagué": "I've paid",
  "No fue posible cargar los pagos.": "Couldn't load the payments.",
  "No fue posible registrar la decisión.": "Couldn't record the decision.",
  "Pagos e inscritos": "Payments and enrolled",
  Cuesta: "It costs",
  "{n} inscrito": "{n} enrolled",
  "{n} inscritos": "{n} enrolled",
  "{n} por confirmar": "{n} to confirm",
  "Solo los de tu clave.": "Only those under your key.",
  "Nadie ha reportado pago todavía. Comparte tu clave con tus alumnos para que lo reporten.":
    "No one has reported a payment yet. Share your key with your students so they can report it.",
  "reportado el": "reported on",
  "a {nombre}": "credited to {nombre}",
  Inscrito: "Enrolled",
  Confirmar: "Confirm",
  Rechazar: "Reject",
  "No fue posible inscribirlo.": "Couldn't enroll the student.",
  "Inscribir a un alumno": "Enroll a student",
  "No tienes alumnos activos.": "You have no active students.",
  "Todos tus alumnos ya están en la lista de este evento.":
    "All your students are already on this event's list.",
  "¿En qué modalidades entra?": "Which modalities is the student entering?",
  "Tendrá que pagar": "They'll need to pay",
  Nota: "Note",
  "Se foguea con adultos": "Competes against adults for experience",
  "Al alumno y a sus tutores les llegará una notificación con las modalidades y lo que deben pagar. Quedará inscrito cuando confirmes el pago.":
    "The student and their guardians will get a notification with the modalities and what they owe. They'll be enrolled once you confirm the payment.",
  "Inscribiendo…": "Enrolling…",
  Inscribir: "Enroll",
  Cerrar: "Close",

  // EventCalendar
  Hoy: "Today",
  "Mes anterior": "Previous month",
  "Mes siguiente": "Next month",
  "{n} evento": "{n} event",
  "{n} eventos": "{n} events",
  "sin eventos": "no events",
  "Día seleccionado": "Selected day",
  "No hay eventos programados para este día.":
    "There are no events scheduled for this day.",

  // InvitationDialog
  "No fue posible generar la invitación.": "Couldn't generate the invitation.",
  "Invitación para {tipo}": "Invitation for {tipo}",
  "Comparte el QR o el enlace. Al llenar el formulario queda registrado en tu grupo.":
    "Share the QR code or the link. Once the form is filled out, they're registered in your group.",
  "Código QR del enlace de inscripción para {tipo}":
    "QR code for the enrollment link for {tipo}",
  Enlace: "Link",
  Copiado: "Copied",
  "Copiar enlace": "Copy link",
  "Sirve una sola vez": "Works only once",
  "Al llenarse queda inservible, y caduca el {fecha}. Mándaselo solo a la persona que se va a inscribir: cualquiera con el enlace puede llenar el formulario.":
    "Once it's filled out it stops working, and it expires on {fecha}. Send it only to the person who will enroll: anyone with the link can fill out the form.",
  Listo: "Done",
  "Generar invitación de inscripción": "Generate enrollment invitation",
  "Para sumar un tutor al expediente de {nombre}.":
    "To add a guardian to {nombre}'s record.",
  "La persona llena sus datos y queda registrada en tu grupo, sin que tú captures nada.":
    "The person fills in their own details and is registered in your group, with nothing for you to enter.",
  "¿Para quién es?": "Who is it for?",
  "Llena sus propios datos: nombre, fecha de nacimiento, correo y celular.":
    "Fills in their own details: name, date of birth, email and mobile number.",
  "Llena sus datos y los de sus hijos.":
    "Fills in their own details and their children's.",
  "Nota para ti": "Note for yourself",
  "Familia Pérez, hermano de Ana": "Pérez family, Ana's brother",
  "Solo tú la ves. Sirve para recordar a quién le mandaste cada enlace.":
    "Only you can see it. It helps you remember who you sent each link to.",
  "Generando…": "Generating…",
  "Generar QR y enlace": "Generate QR code and link",
  Cancelar: "Cancel",

  // PagarConPayPal
  "No se pudo cargar PayPal. Recarga la página e inténtalo de nuevo.":
    "PayPal couldn't be loaded. Reload the page and try again.",
  "Cargando PayPal…": "Loading PayPal…",
  "Pagar con PayPal": "Pay with PayPal",
  "No fue posible iniciar el pago.": "Couldn't start the payment.",
  "No pudimos confirmar tu pago. Revisa tu historial antes de intentar otra vez.":
    "We couldn't confirm your payment. Check your history before trying again.",
  "PayPal no pudo procesar el pago.": "PayPal couldn't process the payment.",

  // NotificationBell
  Notificaciones: "Notifications",
  "Notificaciones, {n} sin leer": "Notifications, {n} unread",

  // FamilyStudentCards
  "No fue posible cargar el expediente.": "Couldn't load the record.",
  "No hay expedientes ligados a tu cuenta":
    "There are no records linked to your account",
  "Pide al dojo que ligue el expediente a tu cuenta.":
    "Ask the dojo to link the record to your account.",
  "Elegir expediente": "Choose a record",
  "Cinta {color}": "{color} belt",
  "No se pudo mostrar el expediente": "The record couldn't be shown",

  // StudentCardView
  Activo: "Active",
  Inactivo: "Inactive",
  "Con acceso al sistema": "Has system access",
  "Inscrito el": "Enrolled on",
  Edad: "Age",
  "No registrada": "Not recorded",
  "{n} años": "{n} years old",
  Teléfono: "Phone",
  "No registrado": "Not recorded",
  "Tutor responsable": "Responsible guardian",
  "Teléfono del tutor": "Guardian's phone",
  "Tutores con acceso": "Guardians with access",
  "Contacto principal": "Primary contact",
  "Información médica": "Medical information",
  Graduaciones: "Promotions",
  "cambios de cinta": "belt changes",
  Asistencia: "Attendance",
  "{presentes} de {total} clases": "{presentes} of {total} classes",
  "Pagos pendientes": "Pending payments",
  "mensualidades por cubrir": "monthly fees to cover",
  Observaciones: "Observations",
  "notas del profesor": "teacher's notes",
  "Historial del alumno": "Student history",
  "Este alumno no tiene graduaciones registradas.":
    "This student has no promotions recorded.",
  "Evaluó {nombre}": "Evaluated by {nombre}",
  "No hay asistencias registradas.": "No attendance recorded.",
  "Últimos {n} registros.": "Last {n} records.",
  "{n}% de asistencia.": "{n}% attendance.",
  Pagos: "Payments",
  Asistió: "Attended",
  Faltó: "Absent",
  "No hay pagos registrados.": "No payments recorded.",
  Mes: "Month",
  Monto: "Amount",
  Estado: "Status",
  "Fecha de pago": "Payment date",
  "No hay observaciones del profesor.": "No teacher observations.",
  "Autor dado de baja": "Author no longer active",

  // ModulePending
  "Módulo en construcción": "Module under construction",
  "Esta sección se desarrolla en la rama":
    "This section is being developed on the branch",
  "Consulta el reparto de módulos en CONTRIBUTING.md.":
    "See the module assignments in CONTRIBUTING.md.",
};
