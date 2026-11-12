# Agente de cobranza con Zapier

Dos Zaps mensuales que usan las rutas `/api/agent/*` del backend:

| Zap | Cuándo | Qué hace |
| --- | --- | --- |
| **A — Recordatorios** | Día 5 | Consulta los morosos, pide a Claude un correo para cada familia, lo envía y registra el envío |
| **B — Reporte** | Día 10 | Consulta cuánto se recuperó, pide a Claude un análisis y se lo manda al administrador |

El contrato de cada ruta está en el [README](../README.md#agente-de-cobranza-recordatorios-y-recuperación-fase-2).

---

## Antes de empezar

### Lo que necesitas

- **Cuenta de Zapier** con un plan que incluya *Webhooks by Zapier* y *Looping by Zapier*
  (son apps premium; la prueba gratuita también las incluye).
- **API key de Anthropic** con saldo, de [platform.claude.com](https://platform.claude.com).
  Se pega en la app *Anthropic (Claude)* de Zapier, no en el repo.
- **Una cuenta de Gmail** desde la que saldrán los correos.
- **`AGENT_API_KEY`** en `backend/.env`. Es la misma clave que va en el encabezado
  `x-api-key` de cada llamada.

### Modo prueba

Mientras pruebas, pon en `backend/.env`:

```env
AGENT_CORREOS_PERMITIDOS="tu-correo@ejemplo.com"
```

Con esa variable, `/unpaid` **solo devuelve morosos con esos correos**, así el Zap no
le escribe a familias reales. Los correos del seed (`@dojo.com`) son de un dominio real
ajeno: nunca corras el Zap A sin modo prueba contra esos datos. La respuesta dice
`"modoPrueba": true` y cuántos morosos omitió. **Déjala vacía en producción.**

### Una URL pública para el backend

Zapier corre en internet y no puede llegar a `localhost`. Para probar desde tu
computadora, usa un túnel. Para que no quede expuesta toda la API (login, alumnos,
pagos), pasa por el proxy del repo, que **solo deja pasar `/api/agent/*`**:

```bash
# Terminal 1: el backend
cd backend && npm run dev

# Terminal 2: el proxy (puerto 3099). Toma el puerto del backend de PORT en
# backend/.env (3000 si no está); para otro destino: BACKEND_URL=http://localhost:4000
cd backend && node scripts/proxy-agente.mjs

# Terminal 3: el túnel (cloudflared, sin cuenta)
curl -L -o ~/cloudflared https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64
chmod +x ~/cloudflared
~/cloudflared tunnel --url http://localhost:3099
```

El túnel imprime una URL como `https://algo-al-azar.trycloudflare.com`. En esta guía
aparece como `{URL}`.

> ⚠️ La URL cambia cada vez que reinicias el túnel: hay que actualizarla en los dos Zaps.
> Además, el día 5 y el día 10 tu computadora tiene que estar encendida con las tres
> terminales corriendo. Para que funcione solo cada mes, despliega el backend en un
> servidor y usa su dominio como `{URL}`.

Comprueba que responde antes de abrir Zapier:

```bash
curl -H "x-api-key: TU_AGENT_API_KEY" "{URL}/api/agent/unpaid?dojoId=1"
```

### El dojo

Cada llamada lleva `?dojoId=` con el dojo que cobra. Si solo hay un dojo se puede
omitir, pero ponlo de todos modos: si mañana se crea otro, el Zap seguirá apuntando al
correcto en lugar de fallar. Sin `dojoId` y con varios dojos, la respuesta es `400` con
la lista de dojos disponibles.

---

## Zap A — Recordatorios (día 5)

### 1. Disparador: *Schedule by Zapier*

- **Event:** Every Month
- **Day of the Month:** 5
- **Time of Day:** 9am

Revisa que la zona horaria de tu cuenta de Zapier sea la de México
(*Settings → Timezone*).

### 2. Acción: *Webhooks by Zapier* → **GET**

- **URL:** `{URL}/api/agent/unpaid?dojoId=1`
- **Headers:** `x-api-key` | `TU_AGENT_API_KEY`
- Lo demás, como viene.

En la prueba debe traer `Total Alumnos`, `Dojo Nombre` y la lista `Alumnos`.

### 3. Acción: *Filter by Zapier*

- **Only continue if:** `Total Alumnos` (Number) **Greater than** `0`

Así, un mes sin morosos no gasta pasos.

### 4. Acción: *Looping by Zapier* → **Create Loop From Line Items**

En **Values to Loop** agrega estas claves, cada una con el campo de `Alumnos`
correspondiente del paso 2:

| Clave | Campo del paso 2 |
| --- | --- |
| `alumno` | Alumnos Alumno |
| `tutor` | Alumnos Tutor |
| `email` | Alumnos Email |
| `detalle` | Alumnos Detalle Pagos |
| `total` | Alumnos Monto Adeudado |
| `pagoIds` | Alumnos Pago Ids Texto |

Todo lo que sigue se repite **una vez por familia**.

### 5. Acción: *Anthropic (Claude)* → enviar mensaje

- **Model:** Claude Opus 5.5 (`claude-opus-5-5`). Si la lista no lo muestra, elige el
  modelo más reciente que aparezca.
- **Max Tokens:** 1024
- **System prompt:**

```text
Eres el asistente de cobranza de un dojo de artes marciales en México. Escribes
recordatorios de pago por correo a las familias.

Reglas:
- Tono cordial, respetuoso y breve: máximo 120 palabras.
- Dirígete al tutor por su nombre. Si no hay tutor, dirígete a la familia del alumno.
- Menciona al alumno y cada mes pendiente con su monto exactamente como aparecen en
  el detalle. No inventes montos, fechas, recargos ni consecuencias.
- Explica que puede pagar desde la app del dojo, en la sección Pagos: con PayPal, o
  avisando que pagó en efectivo o por transferencia.
- Agradece y pide que ignore el mensaje si ya pagó.
- Firma como "Administración de" seguido del nombre del dojo.
- Responde solo con el cuerpo del correo, sin asunto ni comentarios adicionales.
```

- **User message** (mapea los campos entre llaves):

```text
Dojo: {Dojo Nombre del paso 2}
Tutor: {tutor del paso 4}
Alumno: {alumno del paso 4}
Total adeudado: ${total del paso 4}
Detalle: {detalle del paso 4}
```

### 6. Acción: *Gmail* → **Send Email**

- **To:** `email` del paso 4
- **Subject:** `Recordatorio de pago de {alumno del paso 4}`
- **Body Type:** Plain
- **Body:** el texto de la respuesta de Claude del paso 5

### 7. Acción: *Webhooks by Zapier* → **POST**

- **URL:** `{URL}/api/agent/record-reminders?dojoId=1`
- **Payload Type:** Json
- **Data:** `pagoIds` | `pagoIds` del paso 4
- **Headers:** `x-api-key` | `TU_AGENT_API_KEY`

Va después del correo a propósito: solo se registra lo que de verdad se envió.
`pagoIds` llega como texto separado por espacios (`"201 215"`) y el backend lo acepta así.
Va sin comas a propósito: *Looping by Zapier* separa con comas los valores de cada
lista, y una coma dentro de un valor desfasa el loop.

### Probarlo

Con el modo prueba encendido y un moroso con tu correo, usa **Test** en cada paso. Debe
llegarte un correo, y el paso 7 debe responder `registrados` con los ids del moroso.
`GET /api/agent/recovery-stats` ya lo cuenta en `recordatoriosEnviados`.

---

## Zap B — Reporte de recuperación (día 10)

### 1. Disparador: *Schedule by Zapier*

- **Event:** Every Month
- **Day of the Month:** 10
- **Time of Day:** 9am

### 2. Acción: *Webhooks by Zapier* → **GET**

- **URL:** `{URL}/api/agent/recovery-stats?dias=30&dojoId=1`
- **Headers:** `x-api-key` | `TU_AGENT_API_KEY`

La respuesta trae los números sueltos y, además, `Resumen Texto`: el mismo resumen ya
redactado, que es lo que conviene pasarle a Claude.

### 3. Acción: *Anthropic (Claude)* → enviar mensaje

- **Model:** Claude Opus 5.5 (`claude-opus-5-5`)
- **Max Tokens:** 2048
- **System prompt:**

```text
Eres analista de cobranza de un dojo de artes marciales en México. Recibes las
estadísticas de los recordatorios de pago del último mes y escribes un reporte breve
para el administrador.

Estructura:
1. Resumen en dos o tres oraciones: tasa de recuperación y monto recuperado contra el
   recordado.
2. Qué funcionó: método de pago más usado y días promedio para pagar.
3. Pendientes: cada alumno que sigue sin pagar, con su monto, para darle seguimiento.
4. Dos o tres recomendaciones concretas para el próximo mes.

Usa solo los datos recibidos: no inventes cifras ni nombres. Si no hubo recordatorios
en el periodo, dilo en una línea y sugiere revisar que el Zap de recordatorios corrió.
Escribe en español, en texto plano, sin tablas.
```

- **User message:**

```text
Dojo: {Dojo Nombre del paso 2}
{Resumen Texto del paso 2}
```

### 4. Acción: *Gmail* → **Send Email**

- **To:** el correo del administrador
- **Subject:** `Reporte de cobranza — {Dojo Nombre del paso 2}`
- **Body Type:** Plain
- **Body:** la respuesta de Claude del paso 3

---

## Cuando algo falla

| Respuesta | Causa |
| --- | --- |
| `401` | Falta el encabezado `x-api-key` o la clave no coincide con `AGENT_API_KEY`. |
| `400` con lista `dojos` | Hay varios dojos y la URL no trae `?dojoId=`. |
| `404` con "No existe un dojo" | El `dojoId` no existe o es el de la plataforma. |
| `404` "Ruta no encontrada" | La ruta no empieza con `/api/agent/`: el proxy solo deja pasar esas. |
| `502` del proxy | El backend no está corriendo. |
| No responde | El túnel se cerró o cambió de URL. |
| `totalAlumnos: 0` en pruebas | El modo prueba filtró a todos: revisa `AGENT_CORREOS_PERMITIDOS` y el correo del tutor. |
