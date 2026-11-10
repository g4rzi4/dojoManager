/** Mensajes fijos que devuelve la API. Los que interpolan valores no se listan. */
export const backend: Record<string, string> = {
  // Frontend
  "No fue posible conectar con el servidor.": "Unable to connect to the server.",
  "Ocurrió un error inesperado.": "An unexpected error occurred.",

  // Autenticación y preferencias
  "Demasiados intentos de inicio de sesión. Espera unos minutos y vuelve a intentarlo.":
    "Too many login attempts. Wait a few minutes and try again.",
  "Debes enviar correo y contraseña.": "You must enter your email and password.",
  "Correo o contraseña incorrectos.": "Incorrect email or password.",
  "Tu cuenta está desactivada. Contacta al administrador.":
    "Your account is deactivated. Contact the administrator.",
  "La cuenta ya no está disponible.": "The account is no longer available.",
  "Alguna de las preferencias no es válida.": "One of the preferences is not valid.",

  // Middleware
  "Demasiados intentos. Espera un momento y vuelve a intentarlo.":
    "Too many attempts. Wait a moment and try again.",
  "Demasiados intentos desde esta conexión. Espera unos minutos y vuelve a intentarlo.":
    "Too many attempts from this connection. Wait a few minutes and try again.",
  "Falta el token de autenticación.": "The authentication token is missing.",
  "Tu sesión expiró o el token no es válido. Inicia sesión otra vez.":
    "Your session expired or the token is not valid. Sign in again.",
  "No tienes permiso para hacer esto.": "You don't have permission to do this.",

  // Eventos
  "El id del evento no es válido.": "The event ID is not valid.",
  "Escribe la clave que te dio tu profesor.": "Enter the key your teacher gave you.",
  "No existe ese evento.": "That event doesn't exist.",
  "Este evento no requiere pago.": "This event doesn't require payment.",
  "Tu cuenta no tiene alumnos a su cargo.": "Your account has no students in its care.",
  "Indica a cuál de tus hijos corresponde el pago.":
    "Indicate which of your children the payment is for.",
  "Ese alumno no está a tu cargo.": "That student is not in your care.",
  "El pago en línea no está disponible.": "Online payment is not available.",
  "Completa tu pago con PayPal para quedar inscrito.":
    "Complete your PayPal payment to be enrolled.",
  "Indica a qué alumno inscribes.": "Indicate which student you are enrolling.",
  "Ese alumno no está en tu grupo.": "That student is not in your group.",
  "Este evento no requiere inscripción con pago.":
    "This event doesn't require paid enrollment.",
  "Ese alumno ya está en la lista de este evento.":
    "That student is already on this event's list.",
  "Alumno inscrito. Le avisamos lo que tiene que pagar.":
    "Student enrolled. We let them know what they need to pay.",
  "El id del registro no es válido.": "The record ID is not valid.",
  "Indica si confirmas o rechazas el pago.":
    "Indicate whether you confirm or reject the payment.",
  "No existe ese registro.": "That record doesn't exist.",
  "Ese pago no se acreditó a tu clave.": "That payment was not credited to your key.",
  "Pago confirmado. El alumno quedó inscrito.": "Payment confirmed. The student is enrolled.",
  "Pago rechazado.": "Payment rejected.",
  "El evento necesita un título.": "The event needs a title.",
  "La fecha debe venir como AAAA-MM-DD.": "The date must be in YYYY-MM-DD format.",
  "La hora debe venir como HH:MM, de 00:00 a 23:59.":
    "The time must be in HH:MM format, from 00:00 to 23:59.",
  "Si el evento requiere pago, indica el costo o define al menos una modalidad.":
    "If the event requires payment, enter the cost or define at least one modality.",
  "El título no puede quedar vacío.": "The title can't be empty.",
  "El costo debe ser un entero de centavos mayor a cero.":
    "The cost must be a whole number of cents greater than zero.",
  "Manda los costos por modalidad que quieres ajustar.":
    "Send the modality costs you want to adjust.",
  "Solo puedes ajustar el precio de modalidades que ya existen. Pídele al administrador que agregue o quite modalidades.":
    "You can only adjust the price of existing modalities. Ask the administrator to add or remove modalities.",
  "Listo. Estos precios aplican solo a tus alumnos.":
    "Done. These prices apply only to your students.",
  "Las modalidades deben venir como lista.": "Modalities must be sent as a list.",
  "Una de las modalidades no pertenece a este evento.":
    "One of the modalities doesn't belong to this event.",
  "Si el evento requiere pago, define un costo o al menos una modalidad.":
    "If the event requires payment, set a cost or at least one modality.",
  "Evento actualizado.": "Event updated.",
  "Este evento no tiene costo configurado.": "This event has no cost set up.",
  "Indica si compite en cintas de color o en cintas negras.":
    "Indicate whether they compete in color belts or black belts.",
  "Indica la categoría de edad.": "Indicate the age category.",

  // Tutores
  "Indica a qué alumno se liga el tutor.": "Indicate which student the guardian is linked to.",
  "El correo del tutor no es válido.": "The guardian's email is not valid.",
  "Ya existe una cuenta con ese correo y no es de tutor. Usa otro correo.":
    "An account with that email already exists and it isn't a guardian account. Use a different email.",
  "El tutor necesita un nombre.": "The guardian needs a name.",
  "Tutor registrado y ligado al alumno.": "Guardian registered and linked to the student.",
  "El tutor ya tenía cuenta; se ligó a este alumno.":
    "The guardian already had an account; they were linked to this student.",
  "Los identificadores no son válidos.": "The identifiers are not valid.",
  "Ese tutor no estaba ligado a este alumno.":
    "That guardian was not linked to this student.",

  // Invitaciones
  "Indica si la invitación es para un ALUMNO o para un TUTOR.":
    "Indicate whether the invitation is for a STUDENT or a GUARDIAN.",
  "El id del alumno no es válido.": "The student ID is not valid.",
  "El id de la invitación no es válido.": "The invitation ID is not valid.",
  "No encontramos esa invitación entre las tuyas.":
    "We couldn't find that invitation among yours.",
  "El correo electrónico no es válido.": "The email address is not valid.",
  "Ya hay una cuenta con ese correo. Si es tuya, inicia sesión; si no, usa otro.":
    "An account with that email already exists. If it's yours, sign in; otherwise, use a different one.",
  "Escribe tu nombre y tu apellido.": "Enter your first and last name.",
  "Listo, tu registro quedó hecho. Ya puedes iniciar sesión.":
    "All set, your registration is complete. You can now sign in.",
  "Escribe tu nombre completo.": "Enter your full name.",
  "Faltan los datos de tus hijos.": "Your children's details are missing.",
  "Agrega al menos un hijo o hija.": "Add at least one child.",
  "Son demasiados. Si tienes más de 10, avísale al dojo.":
    "That's too many. If you have more than 10, let the dojo know.",
  "Este enlace de inscripción no es válido.": "This enrollment link is not valid.",
  "Este enlace ya se usó. Pídele al dojo que te genere uno nuevo.":
    "This link has already been used. Ask the dojo to generate a new one.",
  "Este enlace caducó. Pídele al dojo que te genere uno nuevo.":
    "This link has expired. Ask the dojo to generate a new one.",

  // Notificaciones
  "El id de la notificación no es válido.": "The notification ID is not valid.",
  "El aviso necesita título y mensaje.": "The announcement needs a title and a message.",
  "El título no puede pasar de 120 caracteres.": "The title can't exceed 120 characters.",

  // Pagos
  "El cobro indicado no es válido.": "The specified charge is not valid.",
  "No encontramos ese cobro en tu cuenta.": "We couldn't find that charge on your account.",
  "Esa mensualidad ya está pagada.": "That monthly fee is already paid.",
  "Esa inscripción no tiene un pago pendiente.":
    "That enrollment has no pending payment.",
  "No encontramos ese pago en tu cuenta.": "We couldn't find that payment on your account.",
  "Tu pago ya estaba registrado.": "Your payment was already recorded.",
  "PayPal rechazó ese método de pago. Intenta con otro.":
    "PayPal rejected that payment method. Try another one.",
  "¡Pago recibido! Gracias.": "Payment received! Thank you.",
  "PayPal rechazó las credenciales.": "PayPal rejected the credentials.",

  // Alumnos
  "El alumno necesita nombre y apellido.": "The student needs a first and last name.",
  "Ese profesor está dado de baja.": "That teacher has been deactivated.",
  "Solo puedes registrar alumnos con tu propia clave de profesor.":
    "You can only register students with your own teacher key.",
  "La fecha de nacimiento debe venir como AAAA-MM-DD.":
    "The date of birth must be in YYYY-MM-DD format.",
  "El nombre y el apellido no pueden quedar vacíos.":
    "The first and last name can't be empty.",
  "Indica si el alumno queda activo o inactivo.":
    "Indicate whether the student is active or inactive.",
  "Solo el administrador puede dejar a un alumno sin profesor.":
    "Only the administrator can leave a student without a teacher.",
  "Solo el administrador puede pasar un alumno a otro profesor.":
    "Only the administrator can move a student to another teacher.",
  "No mandaste ningún cambio.": "You didn't send any changes.",
  "Ficha actualizada.": "Profile updated.",
  "Este alumno no está en tu grupo.": "This student is not in your group.",
  "Alumno dado de baja.": "Student deactivated.",
  "Tu cuenta no tiene un expediente de alumno asociado.":
    "Your account has no student record associated with it.",
  "No existe ese alumno.": "That student doesn't exist.",
  "No tienes permiso para ver este expediente.":
    "You don't have permission to view this record.",

  // Profesores
  "El id del profesor no es válido.": "The teacher ID is not valid.",
  "No tienes permiso para ver esta ficha.": "You don't have permission to view this profile.",
  "No existe ese profesor.": "That teacher doesn't exist.",
  "No tienes permiso para editar esta ficha.":
    "You don't have permission to edit this profile.",
  "La fecha de ingreso debe venir como AAAA-MM-DD.":
    "The start date must be in YYYY-MM-DD format.",
  "Solo el administrador puede editar las notas internas.":
    "Only the administrator can edit internal notes.",
  "Faltan el nombre, el correo o la contraseña.":
    "The name, email, or password is missing.",
  "El correo no es válido.": "The email is not valid.",
  "Ya hay una cuenta con ese correo.": "An account with that email already exists.",
  "Indica si la cuenta queda activa o inactiva.":
    "Indicate whether the account is active or inactive.",
  "No puedes desactivar tu propia cuenta.": "You can't deactivate your own account.",
};
