# 🥋 DojoManager

Sistema de administración para escuelas de artes marciales.

## Tecnologías

### Frontend
- React
- TypeScript
- Vite
- Tailwind CSS

### Backend
- Node.js
- Express
- TypeScript
- Prisma ORM

### Base de datos
- PostgreSQL

---

# Requisitos

Antes de ejecutar el proyecto instala:

- Node.js 22 o superior
- Git
- **Para la base de datos, una de estas dos opciones:**
  - Docker Desktop — recomendado, no tienes que instalar nada más
  - PostgreSQL 17 instalado en tu máquina
- DBeaver (opcional, para ver la base de datos con interfaz gráfica)

---

# Clonar el proyecto

```bash
git clone https://github.com/g4rzi4/dojoManager.git
cd dojoManager
```

> **Si vas a colaborar en el proyecto, lee primero [CONTRIBUTING.md](CONTRIBUTING.md).**
> Ahí está el reparto de módulos, la estructura de ramas y el flujo de Pull Requests.

---

# Base de datos

**Haz esto antes de configurar el backend**, porque las migraciones de Prisma fallan si
la base de datos no existe todavía.

### Opción A — con Docker (recomendado)

Desde la raíz del proyecto:

```bash
docker compose up -d --wait
```

Eso levanta PostgreSQL 17 con la base `dojomanager` ya creada. Para detenerlo:

```bash
docker compose down        # conserva los datos
docker compose down -v     # borra los datos
```

> **Si ya tienes PostgreSQL instalado en tu máquina**, Docker va a fallar con
> `port is already allocated`, porque ambos quieren el puerto 5432. O detienes el tuyo
> (`brew services stop postgresql@17`), o te saltas Docker y usas la Opción B.

### Opción B — con PostgreSQL instalado localmente

Crear la base de datos a mano:

```bash
createdb dojomanager
```

---

# Configuración del Backend

Entrar a la carpeta:

```bash
cd backend
```

Instalar dependencias:

```bash
npm install
```

Crear tu archivo `.env` a partir de la plantilla:

```bash
cp .env.example .env
```

El `.env.example` trae las dos opciones comentadas. Si usas **Docker**, funciona tal
cual. Si usas **PostgreSQL local**, descomenta la segunda línea y pon tu usuario:

```env
DATABASE_URL="postgresql://juan@localhost:5432/dojomanager"
```

> El `.env` **no se sube a git** (contiene tus credenciales). El `.env.example` sí, y
> es donde se documenta cada variable nueva que agregue el equipo.

El `.env.example` también trae `JWT_SECRET` con un valor de desarrollo.
**El backend no arranca sin esa variable**: es la llave con la que se firman las
sesiones, y falla de inmediato con un mensaje claro si falta.

Generar el cliente de Prisma:

```bash
npx prisma generate
```

Ejecutar las migraciones:

```bash
npx prisma migrate dev
```

Cargar los datos iniciales (crea las cuentas de prueba y un alumno con
historial completo):

```bash
npx prisma db seed
```

Iniciar el backend:

```bash
npm run dev
```

El backend estará disponible en:

```
http://localhost:3000
```

---

# Configuración del Frontend

Abrir otra terminal.

Entrar a la carpeta:

```bash
cd frontend
```

Instalar dependencias:

```bash
npm install
```

Ejecutar:

```bash
npm run dev
```

Abrir:

```
http://localhost:5173
```

*(Si el puerto está ocupado, Vite usará otro puerto, por ejemplo `5174`.)*

> El frontend apunta al backend con la URL escrita a mano en
> [frontend/src/services/api.ts](frontend/src/services/api.ts)
> (`http://localhost:3000`). Si cambias el puerto del backend, cámbiala ahí también.

---

# Probar que todo funciona

Con el backend y el frontend corriendo, abre `http://localhost:5173` y entra con
cualquiera de las cinco cuentas que crea el seed. Cada una lleva a una pantalla
distinta, según su rol:

| Rol | Correo | Contraseña | Clave | Qué ve al entrar |
| --- | --- | --- | --- | --- |
| Administrador | `admin@dojo.com` | `123456` | — | Todo el dojo, incluyendo Profesores |
| Profesor | `profesor@dojo.com` | `123456` | `PROF-7K2M` | **Solo** Ana y Diego |
| Profesor | `profesora@dojo.com` | `123456` | `PROF-3XQ8` | **Solo** Luis |

> Los profesores necesitan **los tres datos**: correo, contraseña y clave. En el login
> hay que elegir "Profesor" para que aparezca el campo de la clave.
| Tutor | `tutor@dojo.com` | `123456` | — | Panel familiar con **sus dos hijos** |
| Alumno | `alumno@dojo.com` | `123456` | — | Panel familiar con su propio expediente |

Entra con los dos profesores para comprobar que **cada uno ve solo a su grupo**.

Las contraseñas se guardan con hash de **bcrypt** y la sesión viaja en un **JWT**
firmado con tu `JWT_SECRET`. Son cuentas de **desarrollo local**: no las subas a un
servidor público.

Datos que crea el seed:

- **Ana López** — alumna con cuenta propia e historial completo: 4 graduaciones de
  cinta, 13 registros de asistencia, 4 mensualidades y 3 observaciones.
- **Diego López** — hermano menor de Ana, sin cuenta propia. Sirve para ver cómo un
  alumno existe en el sistema sin poder iniciar sesión.
- **Marta López** (`tutor@dojo.com`) — madre de los dos. Al entrar ve ambos
  expedientes, el calendario, los pagos de los dos y sus notificaciones.
- **Luis Hernández** — alumno adulto, sin tutor ni cuenta. Comprueba que el tutor
  **no** puede abrir su expediente.
- 9 eventos del mes en curso y un aviso del dojo en la bandeja.

Para comprobar solo el backend:

```bash
curl http://localhost:3000
# {"message":"Backend funcionando 🚀"}
```

---

# Roles y permisos

Hay cuatro roles. El profesor es **subadministrador**: puede todo menos administrar
profesores y la configuración del dojo.

| Acción | Administrador | Profesor | Tutor | Alumno |
| --- | :-: | :-: | :-: | :-: |
| Registrar un **profesor** | ✅ | ❌ | ❌ | ❌ |
| Registrar un **alumno** | ✅ | ✅ | ❌ | ❌ |
| Registrar un **tutor** | ✅ | ✅ | ❌ | ❌ |
| Agregar y quitar **eventos** | ✅ | ✅ | ❌ | ❌ |
| Ver alumnos | **todos** | **solo los suyos** | sus hijos | él mismo |
| Ver pagos | **todos** | **solo los suyos** | sus hijos | los suyos |
| Mandar avisos | ✅ | ✅ | ❌ | ❌ |
| Configuración del dojo | ✅ | ❌ | ❌ | ❌ |
| Ver el calendario | ✅ | ✅ | ✅ | ✅ |
| Ver sus notificaciones | ✅ | ✅ | ✅ | ✅ |

## Inicio de sesión de los profesores

Un profesor necesita **tres datos**, no dos: correo, contraseña **y su clave**. Alumnos,
tutores y el administrador entran con correo y contraseña nada más.

En la pantalla de login hay un selector "Alumno o tutor / Profesor". Existe por una
razón concreta: si a un profesor le falta la clave, el backend responde el **mismo**
mensaje que ante una contraseña incorrecta, a propósito. Decir "falta la clave" le
confirmaría a quien ya robó una contraseña que ese correo es de un profesor y que solo
le falta ese dato. El selector evita que un profesor se quede sin entender por qué no
entra.

La comparación ignora mayúsculas y espacios, porque la clave se dicta en voz alta.

---

# Ficha del profesor

Cada profesor tiene su ficha, en **Profesores → Ver ficha**:

- Datos de contacto, grado (un sensei también tiene su cinta), especialidad y fecha de
  ingreso
- Su clave, para dictarla o copiarla
- Sus alumnos asignados
- **Lo que ha recaudado**: las mensualidades de sus alumnos y los cobros de eventos
  acreditados a su clave, con el detalle de cada uno

Quién la ve:

| | Admin | El propio profesor | Otro profesor |
| --- | :-: | :-: | :-: |
| Ver la ficha | ✅ | ✅ | ❌ |
| Ver las notas internas del admin | ✅ | ❌ | ❌ |
| Editar contacto, grado, especialidad | ✅ | ✅ | ❌ |
| Editar las notas internas | ✅ | ❌ | ❌ |

Un profesor **no** puede abrir la ficha de otro: ahí están las notas del administrador
y el dinero que maneja.

---

# Eventos con costo

Un torneo o un examen pueden requerir pago. Al crear el evento se marca **Requiere
pago** y se pone el costo.

El flujo, de principio a fin:

1. El **profesor comparte su clave** con sus alumnos (la misma `PROF-7K2M`).
2. El alumno paga en el dojo y entra a **Eventos → Pagar**, donde escribe la clave y
   reporta el pago. Un tutor con varios hijos elige de quién es.
3. Al profesor le llega una **notificación** de pago por confirmar.
4. El profesor entra a **Eventos → Pagos**, y confirma o rechaza.
5. **Al confirmar, el alumno queda inscrito** en el mismo movimiento, y el cobro
   aparece en el historial de ese profesor. A la familia le llega la notificación.

Detalles que importan:

- **El alumno nunca manda el id del profesor**, solo la clave. Si pudiera mandar un
  id, cualquiera podría acreditar cobros a un profesor que nunca vio el dinero.
- **Un profesor solo ve y resuelve los cobros de su clave.** El admin ve todos. Si un
  alumno escribe por error la clave de otro profesor, ese profesor verá el reporte y
  podrá rechazarlo.
- **El monto se congela al reportar.** Si el dojo cambia el precio del evento después,
  los cobros ya hechos no se alteran.
- Un alumno no puede reportar dos veces el mismo evento.

---

## La clave del profesor

Cada profesor tiene una clave única, p. ej. `PROF-7K2M`. El administrador la ve en la
sección de Profesores y se la pasa. **Se escribe al registrar un alumno** para
decidir a qué grupo entra.

El alfabeto de la clave excluye `O`, `0`, `I`, `1` y `L`: se dicta en voz alta y se
escribe a mano, y esos caracteres se confunden.

Dos reglas que aplica el backend:

- Un **profesor** no puede usar la clave de otro. Si lo intenta recibe `403`: estaría
  dando de alta alumnos en un grupo ajeno. Si no manda clave, el alumno se le asigna
  a él.
- El **administrador** puede usar la clave de cualquier profesor, o ninguna (el alumno
  queda sin asignar).

## Lo que un permiso no puede expresar

Un permiso dice **si** puedes leer alumnos, no **cuáles**. El alcance lo resuelve
[backend/src/lib/access.ts](backend/src/lib/access.ts) comparando contra el token:

| Rol | Alcance |
| --- | --- |
| `ADMIN` | todos los alumnos del dojo |
| `PROFESOR` | solo los que tiene asignados (`Student.teacherId`) |
| `TUTOR` | solo los alumnos a su cargo (`StudentGuardian`) |
| `ALUMNO` | solo su propio expediente |

Por eso el tutor **no** tiene `students:read`: si lo tuviera, vería a todo el dojo.
Y por eso el profesor, aunque sí lo tenga, solo recibe su grupo.

> ⚠️ Un detalle que parece menor y no lo es: un filtro con **lista vacía** no es lo
> mismo que **no filtrar**. Confundirlos haría que un profesor sin alumnos viera a
> todos. Por eso `scopeToStudentFilter` devuelve `undefined` solo para `"todos"`, y
> las rutas cortan explícitamente cuando el alcance está vacío.
La relación real vive en la tabla `StudentGuardian`, que es muchos-a-muchos: un tutor
puede tener varios hijos inscritos, y un alumno puede tener dos tutores con acceso
(por ejemplo, padres separados).

La lógica está en [backend/src/lib/access.ts](backend/src/lib/access.ts), y el
alcance de los pagos lo decide el servidor en
[payments.routes.ts](backend/src/routes/payments.routes.ts) — el frontend nunca
manda un id de alumno, porque podría cambiarlo por el de otra familia.

La matriz de permisos vive en un solo lugar:
[backend/src/permissions.ts](backend/src/permissions.ts). El frontend **no la
duplica**: el backend le envía al iniciar sesión la lista ya resuelta, y el menú se
arma con eso.

> ⚠️ Ocultar un menú **no es seguridad**. Quien sabe la URL puede entrar, y quien
> sabe usar la consola del navegador puede editar su `localStorage`. Lo que de verdad
> protege los datos es que cada ruta del backend valida el token y el permiso. Si
> agregas un endpoint, protégelo con `requireAuth` y `requirePermission` — ver
> [CONTRIBUTING.md](CONTRIBUTING.md).

---

# Notificaciones

Las hay de dos clases, y la bandeja las distingue:

| Clase | Quién la crea | Ejemplo |
| --- | --- | --- |
| **Automática** | El sistema | "Mensualidad pendiente: Diego López, $700.00" |
| **Aviso** | El admin o un profesor | "Suspensión de clases por mantenimiento" |

Las automáticas de **pagos** se generan al consultar la bandeja, no con una tarea
programada: el proyecto no tiene un cron corriendo, y así funcionan sin
infraestructura extra. Son idempotentes por la columna `dedupeKey`, así que recargar
la página no las duplica.

Las de **graduaciones**, **faltas** y **eventos nuevos** tienen su función lista en
[backend/src/lib/notifications.ts](backend/src/lib/notifications.ts), pero solo se
disparan cuando el módulo correspondiente las llame al guardar. Si estás
implementando `feature/students` o `feature/events`, llámalas — ver
[CONTRIBUTING.md](CONTRIBUTING.md).

Cuando algo pasa con un alumno, la notificación llega **al alumno y a todos sus
tutores**, resuelto por `audienceForStudent`.

---

# Pagos

Es solo consulta. El alcance lo decide el backend según el rol:

- **Admin y profesor** — todas las mensualidades del dojo.
- **Tutor** — las de sus hijos, sumadas.
- **Alumno** — las suyas.

Los montos se guardan en **centavos como entero** (`amountCents`). Guardar dinero en
`float` produce errores de redondeo.

**El pago en línea con PayPal no está implementado.** La pantalla lo dice en lugar de
mostrar un botón que no hace nada. El schema ya tiene las columnas `method` y
`externalReference` preparadas, así que integrarlo no requerirá otra migración —
cuando se haga, `externalReference` guarda el id de la orden para conciliar y evitar
cobros dobles.

Registrar y editar cobros corresponde al módulo `feature/payments`.

---

# Inscripción por QR

Un profesor o el admin genera una invitación y comparte el **QR o el enlace**. La
persona llena el formulario desde su celular, sin tener cuenta, y queda registrada
en el grupo del profesor que la invitó.

Hay dos formularios:

| Tipo | Qué pide |
| --- | --- |
| **Alumno** | Nombre, apellido, fecha de nacimiento, correo, celular, datos del tutor e información médica |
| **Tutor** | Sus datos y los de **cada uno de sus hijos** (hasta 10), más su parentesco |

En los dos casos la persona elige su contraseña, así que al terminar ya puede entrar.
El profesor no tiene que capturar nada ni inventar contraseñas.

Dónde se genera:

- **Alumnos → Invitar por QR** — para un alumno nuevo o un tutor nuevo.
- **Dentro de la tarjeta de un alumno → Invitar a un tutor** — para sumarle un tutor
  a un expediente que ya existe. El tutor queda ligado a ese alumno además de los
  hijos que dé de alta.

## Lo que protege ese formulario

Es la única pantalla, además del login, que se abre **sin sesión**. Las defensas:

- **Un solo uso.** Al enviarse, la invitación se sella y el enlace deja de servir.
  El sellado va dentro de la misma transacción que crea las cuentas, así que dos
  envíos simultáneos no pueden colarse los dos.
- **Caduca en 14 días.**
- **Token de 192 bits** generado con `crypto.randomBytes`, no con `Math.random`, que
  es predecible. Adivinarlo por fuerza bruta no es viable.
- **Límite de peticiones**: 20 cada 10 minutos por IP en el formulario, y 10 cada 5
  minutos en el login. Ver [rateLimit.ts](backend/src/middleware/rateLimit.ts), que
  documenta sus límites: el conteo vive en memoria del proceso, así que con varias
  instancias habría que cambiarlo por Redis.
- **No revela nada.** El endpoint público solo devuelve el tipo de formulario y el
  nombre de quien invita. Nunca datos de otras familias.
- Un profesor **no puede** generar invitaciones ligadas a alumnos de otro profesor.

> ⚠️ Cualquiera con el enlace puede llenar el formulario: eso es inherente a un QR
> que se manda por WhatsApp. Por eso es de un solo uso y caduca. Manda cada enlace
> solo a la persona que se va a inscribir, y si te equivocas, revócalo.

## Para que el QR funcione desde un celular

**Con la configuración por omisión no funciona**, y la razón es importante: los
enlaces se generan apuntando a `localhost`, y en un teléfono `localhost` significa
*el teléfono mismo*. Escanear el QR lo manda a buscarse a sí mismo.

Hay que usar la IP de tu computadora en la red local. Para averiguarla:

```bash
ipconfig getifaddr en0     # macOS
hostname -I                # Linux
ipconfig                   # Windows: busca "Dirección IPv4"
```

Suponiendo que sea `192.168.1.77`, en **`backend/.env`**:

```env
PUBLIC_APP_URL="http://192.168.1.77:5173"
CORS_ORIGIN="http://localhost:5173,http://192.168.1.77:5173"
```

Y en **`frontend/.env`**:

```env
VITE_API_URL="http://192.168.1.77:3000"
```

Reinicia los dos servidores. Vite ya escucha en la red (`server.host: true` en
[vite.config.ts](frontend/vite.config.ts)) e imprime la dirección al arrancar.

Tres cosas que hay que tener en cuenta:

- **El celular y la computadora tienen que estar en la misma red wifi.** Una red de
  invitados o de empresa puede aislar los dispositivos entre sí y lo bloquea.
- **La IP cambia** al cambiar de red, y hay que volver a ajustar los `.env`.
- `CORS_ORIGIN` acepta varios orígenes separados por coma, para que sigas pudiendo
  trabajar en `localhost` mientras pruebas desde el celular. `PUBLIC_APP_URL` es uno
  solo, porque un enlace solo puede apuntar a una dirección.

En producción, `PUBLIC_APP_URL` sería el dominio real del dojo y este problema
desaparece.

---

# Estructura del proyecto

```
dojoManager
│
├── backend
│   ├── prisma            esquema y migraciones de la base de datos
│   ├── src
│   │   ├── routes        endpoints de la API
│   │   ├── app.ts        configuración de Express
│   │   └── server.ts     punto de entrada
│   ├── .env.example      plantilla de variables de entorno
│   └── package.json
│
├── frontend
│   ├── src
│   │   ├── components    botones, inputs, navbar, sidebar
│   │   ├── layouts       AuthLayout, DashboardLayout
│   │   ├── pages         Login, Dashboard, Students, Teachers, Payments...
│   │   ├── services      cliente HTTP hacia el backend
│   │   └── styles        estilos globales
│   └── package.json
│
├── .github
│   └── pull_request_template.md
├── .gitignore
├── CONTRIBUTING.md       guía de trabajo en equipo (ramas, PRs, conflictos)
├── docker-compose.yml
└── README.md
```

---

# Flujo de trabajo con Git

El proyecto usa **Git Flow**: `main` (producción) ← `develop` (integración) ←
`feature/*` (un módulo por persona).

```
main
 └── develop
      ├── feature/auth        login, registro, JWT
      ├── feature/students    alumnos y cintas
      ├── feature/teachers    profesores y horarios
      ├── feature/payments    mensualidades
      ├── feature/reports     reportes
      └── feature/settings    configuración del dojo
```

Ciclo diario, trabajando sobre tu rama:

```bash
# 1. Traer lo que el equipo ya integró
git switch develop && git pull
git switch feature/TU_MODULO && git merge develop

# 2. Trabajar y guardar
git add .
git commit -m "feat(students): formulario de alta de alumno"
git push

# 3. Al terminar: abrir Pull Request hacia develop (no merge directo)
gh pr create --base develop --fill
```

**Acuerdo del equipo:** nadie commitea directo en `main` ni en `develop`. Los cambios
entran por Pull Request con al menos una revisión. Hoy esto es una regla de equipo, no
un bloqueo técnico (ver [CONTRIBUTING.md](CONTRIBUTING.md#9-protección-de-main-y-develop)).

**El detalle completo —reparto de módulos, convención de commits, cómo resolver
conflictos y comandos de rescate— está en [CONTRIBUTING.md](CONTRIBUTING.md).**

---

# Autores

- Zoé García
- _(5 colaboradores — completar nombres en [CONTRIBUTING.md](CONTRIBUTING.md))_