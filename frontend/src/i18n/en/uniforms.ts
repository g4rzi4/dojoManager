/** Uniformes y protecciones, pagos por solicitud, horario de clases y sus mensajes de la API. */
export const uniforms: Record<string, string> = {
  // Uniformes y protecciones
  "Uniformes y protecciones": "Uniforms and protective gear",
  "No fue posible cargar la información.": "Unable to load the information.",
  "Confirma disponibilidad y precio de lo que piden tus alumnos.":
    "Confirm availability and price for what your students request.",
  "Elige lo que necesitas y tu profesor confirmará disponibilidad y precio.":
    "Choose what you need and your teacher will confirm availability and price.",
  Solicitudes: "Requests",
  "Mis solicitudes": "My requests",
  "Todavía no hay solicitudes": "No requests yet",
  "Aquí aparecerá lo que pidan tus alumnos.":
    "What your students request will show up here.",
  "Aquí podrás seguir lo que le pidas a tu profesor.":
    "You can follow what you ask your teacher for here.",
  "El dojo todavía no tiene catálogo": "The dojo doesn't have a catalog yet",
  "Cuando se carguen los productos, podrás pedirlos desde aquí.":
    "Once products are added, you can request them from here.",
  "{n} producto · falta confirmar precio": "{n} product · price to be confirmed",
  "{n} productos · falta confirmar precio":
    "{n} products · price to be confirmed",
  "{n} producto": "{n} product",
  "{n} productos": "{n} products",
  "No fue posible enviar la solicitud.": "Unable to send the request.",
  "Enviar al profesor": "Send to teacher",
  "Marca y modelo": "Brand and model",
  "Elige una opción": "Choose an option",
  "Otra marca (especificar)": "Other brand (specify)",
  Talla: "Size",
  Elige: "Choose",
  "¿Qué marca?": "Which brand?",
  Color: "Color",
  "Ambos (2 juegos)": "Both (2 sets)",
  "Precio por confirmar": "Price to be confirmed",
  "Precio de ejemplo": "Sample price",
  "Ver tienda de {marca}": "Visit {marca} store",
  "No fue posible guardar el cambio.": "Unable to save the change.",
  "pidió {nombre}": "requested by {nombre}",
  "Talla {talla}": "Size {talla}",
  "Precio de {producto}, en pesos": "Price of {producto}, in pesos",
  "Nota del dojo:": "Dojo note:",
  "Pagó en efectivo": "Paid in cash",
  "Pagó por transferencia": "Paid by bank transfer",
  "Confirmar pago": "Confirm payment",
  "No lo recibí": "I didn't receive it",
  "Marcar como entregado": "Mark as delivered",
  "Nota para la familia": "Note for the family",
  "Confirmar disponibilidad y precio": "Confirm availability and price",

  // Mis fichas
  "No fue posible cargar las fichas.": "Unable to load the cards.",
  "Mis fichas": "My cards",
  "Cintas, asistencia, pagos y observaciones de cada uno de tus hijos.":
    "Belts, attendance, payments, and notes for each of your children.",
  "No se pudieron cargar las fichas": "The cards couldn't be loaded",
  "Todavía no tienes alumnos a tu cargo": "You don't have any students in your care yet",
  "Cuando el dojo registre a tus hijos, sus fichas aparecerán aquí.":
    "Once the dojo registers your children, their cards will show up here.",
  "Ver mi ficha": "View my card",
  "Ver mis fichas": "View my cards",

  // Opciones de pago y pagos
  "No fue posible avisar del pago.": "Unable to report the payment.",
  "Quedará pagado cuando tu profesor confirme que lo recibió.":
    "It will be marked as paid once your teacher confirms they received it.",
  "Efectivo o transferencia": "Cash or bank transfer",
  "Mensualidades, eventos, uniformes y protecciones: lo pagado y lo que queda por cubrir.":
    "Monthly fees, events, uniforms, and protective gear: what's paid and what's still due.",
  "{n} cobro": "{n} charge",
  "{n} cobros": "{n} charges",
  "cobros en total": "charges in total",
  "cobros pagados": "charges paid",
  "Filtrar cobros": "Filter charges",
  Todos: "All",
  Pendientes: "Pending",
  Pagados: "Paid",
  "No hay cobros con ese filtro": "No charges match that filter",
  "Cuando haya una mensualidad, un evento o una solicitud de equipo, aparecerá aquí.":
    "When there's a monthly fee, an event, or a gear request, it will show up here.",
  Concepto: "Description",
  Acciones: "Actions",
  Mensualidad: "Monthly fee",
  "En revisión": "Under review",
  "Esperando al profesor": "Waiting for teacher",
  "Por pagar": "To pay",
  Entregado: "Delivered",

  // Horario de clases
  "No fue posible cargar el horario.": "Unable to load the schedule.",
  "No fue posible agregar la clase.": "Unable to add the class.",
  "No fue posible quitar la clase.": "Unable to remove the class.",
  "Todos los profesores": "All teachers",
  "Elige un profesor": "Choose a teacher",

  // Mensajes de la API: uniformes y protecciones
  "Indica para cuál de tus hijos es la solicitud.":
    "Select which of your children the request is for.",
  "Elige al menos un producto.": "Choose at least one product.",
  "La solicitud tiene demasiados productos.":
    "The request has too many products.",
  "Uno de los productos ya no existe.": "One of the products no longer exists.",
  "Listo. Le avisamos a tu profesor.": "Done. We let your teacher know.",
  "La solicitud indicada no es válida.": "The specified request is not valid.",
  "No existe esa solicitud.": "That request doesn't exist.",
  "Esa solicitud no te corresponde.": "That request isn't yours.",
  "La solicitud cambió de estado. Recarga para ver cómo quedó.":
    "The request status changed. Reload to see the update.",
  "Solicitud confirmada.": "Request confirmed.",
  "Solicitud rechazada.": "Request rejected.",
  "Indica si pagó en efectivo o por transferencia.":
    "Indicate whether they paid in cash or by bank transfer.",
  "Pago registrado.": "Payment registered.",
  "Marcada como entregada.": "Marked as delivered.",
  "Esa acción no existe.": "That action doesn't exist.",

  // Mensajes de la API: horario de clases
  "Escribe el nombre de la clase.": "Enter the class name.",
  "Indica dónde es la clase.": "Enter where the class takes place.",
  "Elige una disciplina y un nivel válidos.":
    "Choose a valid discipline and level.",
  "El día no es válido.": "The day is not valid.",
  "La capacidad no es válida.": "The capacity is not valid.",
  "Elige un profesor.": "Choose a teacher.",
  "La clase indicada no es válida.": "The specified class is not valid.",
  "No existe esa clase.": "That class doesn't exist.",
  "Esa clase no es tuya.": "That class isn't yours.",

  // Mensajes de la API: pagos y PayPal
  "Indica si pagaste en efectivo o por transferencia.":
    "Indicate whether you paid in cash or by bank transfer.",
  "Ese cobro ya no está pendiente. Recarga para ver cómo quedó.":
    "That charge is no longer pending. Reload to see the update.",
  "Listo. Quedará pagado cuando tu profesor lo confirme.":
    "Done. It will be marked paid when your teacher confirms.",
  "La solicitud no es válida.": "The request is not valid.",
  "No existe ese cobro.": "That charge doesn't exist.",
  "Ese cobro no te corresponde.": "That charge isn't yours.",
  "Ese cobro ya no está por confirmar. Recarga para ver cómo quedó.":
    "That charge is no longer awaiting confirmation. Reload to see the update.",
  "Pago confirmado.": "Payment confirmed.",
  "Pago no confirmado.": "Payment not confirmed.",
  "Ya reportaste ese pago. Espera a que lo confirmen.":
    "You already reported that payment. Wait for it to be confirmed.",
  "Esa solicitud no está lista para pagarse.":
    "That request isn't ready to be paid.",
  "Ese pago ya se procesó. Se reflejará en unos momentos.":
    "That payment was already processed. It will show up shortly.",
  "PayPal no pudo completar el pago. Intenta de nuevo.":
    "PayPal couldn't complete the payment. Try again.",
  "PayPal está revisando tu pago. Se actualizará cuando lo apruebe.":
    "PayPal is reviewing your payment. It will update once approved.",
  "No pudimos validar tu pago. Comunícate con el dojo.":
    "We couldn't verify your payment. Contact the dojo.",
  Uniformes: "Uniforms",
  Protecciones: "Protective gear",
  "Tu profesor todavía no tiene clases en el horario.":
    "Your teacher has no classes on the schedule yet.",
};
