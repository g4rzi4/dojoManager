/** Sensei, el asistente con Claude, y sus mensajes de la API. */
export const assistant: Record<string, string> = {
  // Pantalla
  "Tu asistente con Claude: cobra, revisa tu grupo y redacta avisos. Tú decides qué se envía.":
    "Your Claude assistant: it collects payments, reviews your group and drafts announcements. You decide what gets sent.",
  "Tu asistente con Claude: te ayuda a elegir equipo y a ver cómo va tu entrenamiento.":
    "Your Claude assistant: it helps you choose gear and see how training is going.",
  "ki-AI no está disponible": "ki-AI is not available",
  "No pudimos conectar con ki-AI": "We couldn't reach ki-AI",
  "Revisa tu conexión o espera unos segundos a que el servidor responda.":
    "Check your connection or wait a few seconds for the server to respond.",
  Reintentar: "Try again",
  "Falta configurar la llave de Claude en el servidor. Las demás funciones de la app siguen igual.":
    "The Claude key is not configured on the server. Everything else in the app keeps working.",
  "También redacta avisos: en": "It also drafts announcements: in",
  "escribe la idea del aviso y elige Redactar con ki-AI.":
    "write the idea for the announcement and choose Draft with ki-AI.",
  "ki-AI está pensando…": "ki-AI is thinking…",

  // Asesor de equipo
  "Asesor de equipo": "Gear advisor",
  "Cuéntale qué necesitas y te recomienda uniforme y protecciones del catálogo del dojo, con talla y modelo.":
    "Tell it what you need and it recommends a uniform and protective gear from the dojo catalog, with size and model.",
  "¿Para qué lo necesitas?": "What do you need it for?",
  "Va a su primer torneo de kumite y no tiene protecciones…":
    "It's their first kumite tournament and they have no protective gear…",
  "Pedir recomendación": "Get a recommendation",
  "No fue posible pedir la recomendación.": "Unable to get a recommendation.",
  "ki-AI no encontró en el catálogo algo que cuadre. Prueba a describirlo de otra forma.":
    "ki-AI found nothing in the catalog that fits. Try describing it another way.",
  "Ambos colores": "Both colors",
  "Total aproximado": "Approximate total",
  "Revisar y solicitar": "Review and request",
  "Se llena tu solicitud en Uniformes y protecciones para que confirmes tallas antes de enviarla.":
    "Your request is filled in under Uniforms and protective gear so you can confirm sizes before sending it.",
  "ki-AI llenó esta solicitud con lo que te recomendó. Revisa tallas y colores antes de enviarla.":
    "ki-AI filled in this request with its recommendation. Check sizes and colors before sending it.",

  // Resumen del alumno
  "Mi mes en el dojo": "My month at the dojo",
  "Resumen del alumno": "Student summary",
  "Asistencia, cinta, observaciones del profesor, lo pendiente y lo que viene, en pocas líneas.":
    "Attendance, belt, teacher notes, what's pending and what's coming up, in a few lines.",
  "Generar resumen": "Generate summary",
  "No fue posible generar el resumen.": "Unable to generate the summary.",
  "Redactado por Claude con los datos del expediente": "Written by Claude from the student record",

  // Revisión del grupo
  "Revisión del grupo": "Group review",
  "Quién podría presentar examen de cinta y quién podría estar por dejar el dojo. ki-AI sugiere; tú decides.":
    "Who could take a belt exam and who might be about to leave the dojo. ki-AI suggests; you decide.",
  "Revisar de nuevo": "Review again",
  "Revisar mi grupo": "Review my group",
  "No fue posible revisar el grupo.": "Unable to review the group.",
  "No tienes alumnos activos para revisar.": "You have no active students to review.",
  "Candidatos a examen": "Exam candidates",
  "Nadie por ahora.": "No one for now.",
  "En riesgo de dejar el dojo": "At risk of leaving the dojo",
  "Copiar mensaje": "Copy message",

  // Avisos
  "Redactar con ki-AI": "Draft with ki-AI",
  "ki-AI está redactando…": "ki-AI is writing…",
  "ki-AI no pudo redactar el aviso.": "ki-AI could not draft the announcement.",

  // Cobranza
  "Recordatorios de pago": "Payment reminders",
  "Un borrador por cada familia con mensualidades pendientes o vencidas. Nada se envía hasta que lo apruebes.":
    "One draft for each family with pending or overdue monthly fees. Nothing is sent until you approve it.",
  "Claude está redactando…": "Claude is writing…",
  "Volver a redactar": "Draft again",
  "Preparar recordatorios": "Prepare reminders",
  "No fue posible preparar los recordatorios.": "Unable to prepare the reminders.",
  "No fue posible enviar los recordatorios.": "Unable to send the reminders.",
  "Se enviaron {n} recordatorios.": "{n} reminders were sent.",
  "{n} ya no tenían adeudo.": "{n} no longer owed anything.",
  "{n} no tienen cuenta ni tutor con cuenta.": "{n} have no account and no guardian with an account.",
  "Nadie de tu alcance tiene mensualidades pendientes. No hay nada que recordar.":
    "No one in your scope has pending monthly fees. There is nothing to remind.",
  "Para {tutor}": "For {tutor}",
  "Sin tutor registrado": "No guardian on file",
  "No se pudo redactar este mensaje.": "This message could not be drafted.",
  "Mensaje para {alumno}": "Message for {alumno}",
  "Los montos coinciden con lo que se debe.": "The amounts match what is owed.",
  "Revisa los montos antes de enviarlo: no coinciden con lo que se debe.":
    "Check the amounts before sending: they don't match what is owed.",
  "{n} familias más quedaron para la siguiente tanda. Envía estas y vuelve a preparar.":
    "{n} more families are left for the next batch. Send these and prepare again.",
  "Llega como notificación al alumno y a sus tutores, con este enlace para pagar: {enlace}":
    "It arrives as a notification to the student and their guardians, with this payment link: {enlace}",
  "Enviar {n} recordatorios": "Send {n} reminders",
  "No fue posible generar el reporte.": "Unable to generate the report.",
  "Reporte de recuperación": "Recovery report",
  "Cuánto se pagó después de cada recordatorio enviado.": "How much was paid after each reminder sent.",
  Periodo: "Period",
  "Últimos {n} días": "Last {n} days",
  "Generar reporte": "Generate report",
  "Redactado por Claude a partir de estas cifras": "Written by Claude from these figures",
  "Tasa de recuperación": "Recovery rate",
  Recuperado: "Recovered",
  "Cobros recordados": "Charges reminded",

  // Mensajes de la API
  "ki-AI no está disponible: falta configurar la llave de Claude.":
    "ki-AI is not available: the Claude key is not configured.",
  "Ya hiciste varias peticiones a ki-AI. Espera unos minutos para volver a intentarlo.":
    "You've made several requests to ki-AI. Wait a few minutes and try again.",
  "ki-AI no pudo responder. Intenta de nuevo en un momento.":
    "ki-AI couldn't respond. Try again in a moment.",
  "Esta tarea de ki-AI no está disponible para tu cuenta.":
    "This ki-AI task isn't available for your account.",
  "No se pudo redactar este mensaje. Intenta de nuevo más tarde.":
    "This message could not be drafted. Try again later.",
  "Elige de 1 a 50 recordatorios para enviar.": "Choose 1 to 50 reminders to send.",
  "Elige un periodo de 1 a 365 días.": "Choose a period of 1 to 365 days.",
  "Escribe en el mensaje la idea del aviso y ki-AI la redacta.":
    "Write the idea in the message field and ki-AI will draft it.",
  "Cuéntale a ki-AI para qué necesitas el equipo.": "Tell ki-AI what you need the gear for.",
  "El dojo todavía no tiene catálogo de equipo.": "The dojo doesn't have a gear catalog yet.",
  "No puedes ver a ese alumno.": "You can't view that student.",
};
