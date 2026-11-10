# 🥋 DojoManager

Sistema de administración para escuelas de artes marciales. Cada dojo lleva aquí a sus
alumnos, profesores, cobros y calendario, y las familias pagan en línea con **PayPal**.

## Qué hace

| Área | Qué incluye |
| --- | --- |
| [Varios dojos](#varios-dojos) | Cada dojo ve solo lo suyo; un superadministrador los crea |
| [Roles](#roles-y-permisos) | Administrador, profesor, tutor y alumno, cada uno con su alcance |
| Alumnos y profesores | Expediente, cintas, [ficha del profesor](#ficha-del-profesor) y su clave |
| [Asistencia y graduaciones](#asistencia-y-graduaciones) | Pase de lista y cambios de cinta, con aviso a la familia |
| [Eventos](#eventos-con-costo) | Torneos y exámenes con costo por modalidad y categorías de competencia |
| [Horario](#horario-de-clases) | Clases semanales por profesor |
| [Pagos](#pagos) | Mensualidades, eventos y uniformes en un solo historial |
| [PayPal](#pago-en-línea-con-paypal) | Pago en línea con captura en el servidor |
| [Uniformes y protecciones](#uniformes-y-protecciones) | Solicitud de equipo por marca, modelo y talla |
| [Inscripción por QR](#inscripción-por-qr) | Alta de alumnos y tutores desde el celular |
| [Notificaciones](#notificaciones) | Automáticas y avisos del dojo |
| [Preferencias](#preferencias-de-usuario) | Idioma, vista clara u oscura y tamaño de letra |

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

### Servicios
- PayPal (Orders v2 y JavaScript SDK, en modo sandbox)
- Correo SMTP con Nodemailer, opcional, para recuperar contraseñas

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

> **Si tu base ya estaba migrada** antes de corregir el orden de las migraciones,
> `prisma migrate status` te dirá que tu historial no coincide. Se arregla una sola
> vez, sin perder datos:
>
> ```bash
> npx prisma db execute --file prisma/repair/renombrar-migraciones.sql
> npx prisma migrate deploy
> ```
>
> No uses `prisma migrate reset`: borra los datos y no hace falta.
>
> **Si la instalación se detuvo con el error `P3018` o `P3009`**, esa base quedó a
> medias y sin datos. Solo en ese caso, recréala con `docker compose down -v` y
> `docker compose up -d --wait`, y vuelve a ejecutar las migraciones.

Cargar los datos iniciales de desarrollo. Para probar la app con varias cuentas, usa
mejor el [Dojo de demostración](#dojo-de-demostración):

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

> El frontend busca el backend en `VITE_API_URL`, y si no existe usa
> `http://localhost:3000`. Para cambiarlo, copia `frontend/.env.example` como
> `frontend/.env` y ajusta la dirección.

---

# Probar que todo funciona

Con el backend y el frontend corriendo, abre `http://localhost:5173` y entra con las
cuentas del [Dojo de demostración](#dojo-de-demostración). Cada rol lleva a una
pantalla distinta.

> Los profesores necesitan **los tres datos**: correo, contraseña y clave. En el login
> hay que elegir "Profesor" para que aparezca el campo de la clave.

Entra con dos profesores para comprobar que **cada uno ve solo a su grupo**.

Las contraseñas se guardan con hash de **bcrypt** y la sesión viaja en un **JWT**
firmado con tu `JWT_SECRET`.

Para comprobar solo el backend:

```bash
curl http://localhost:3000
# {"message":"Backend funcionando 🚀"}
```

---

# Dojo de demostración

Un segundo juego de cuentas, en una **base de datos aparte**, para tener datos de
ejemplo sin los registros del seed normal. Trae cuentas, alumnos, un
catálogo de uniformes con **precios de ejemplo** y horarios aleatorios para cada
profesor. Todavía no tiene mensualidades ni eventos.

Para crearla, desde `backend/` (ajusta usuario y contraseña a tu `DATABASE_URL`):

```bash
createdb dojomanager_demo
export DATABASE_URL="postgresql://TU_USUARIO@localhost:5432/dojomanager_demo"
npx prisma migrate deploy
npx tsx prisma/seed-demo.ts
npx tsx prisma/seed-catalog.ts
npx tsx prisma/seed-classes.ts
unset DATABASE_URL
```

Para usarla, cambia en `backend/.env` el final de `DATABASE_URL` a `/dojomanager_demo`
y reinicia el backend. Para volver a tus datos, deshaz el cambio.

La contraseña de todas las cuentas es **`Dojo2026!`**. Son datos ficticios: no guardes
información real en esta base.

**Superadministrador:** `superadmin@dojodemo.test` (crea dojos y administradores)

**Administrador:** `admin@dojodemo.test` (Valeria Campos)

| Profesor | Correo | Clave | Alumnos |
| --- | --- | --- | :-: |
| Tomás Herrera | `t.herrera@dojodemo.test` | `PROF-A3KM` | 4 |
| Paula Ibarra | `p.ibarra@dojodemo.test` | `PROF-B7TR` | 3 |
| Andrés Rojas | `a.rojas@dojodemo.test` | `PROF-C4WX` | 4 |
| Lucía Ferrer | `l.ferrer@dojodemo.test` | `PROF-D9HN` | 2 |
| Rubén Salas | `r.salas@dojodemo.test` | `PROF-E5QZ` | 2 |

| Tutor | Correo | Hijos | Profesor |
| --- | --- | --- | --- |
| Carolina Morales | `c.morales@dojodemo.test` | Mateo | Herrera |
| Javier Núñez | `j.nunez@dojodemo.test` | Sofía, Emilio | Ibarra |
| Daniela Ortega | `d.ortega@dojodemo.test` | Regina, Santiago, Camila | Rojas |
| Héctor Vargas | `h.vargas@dojodemo.test` | Valentina | Ferrer |
| Mónica Aguilar | `m.aguilar@dojodemo.test` | Diego, Renata | Salas |
| Ricardo Silva | `r.silva@dojodemo.test` | Ximena, Leonardo, Julieta | Herrera |

| Alumno con cuenta propia | Correo | Profesor |
| --- | --- | --- |
| Fernanda Cruz | `f.cruz@dojodemo.test` | Ibarra |
| Alejandro Mejía | `a.mejia@dojodemo.test` | Rojas |
| Natalia Reyes | `n.reyes@dojodemo.test` | Ferrer |

Los hijos de una misma familia entrenan con el mismo profesor. Los profesores entran
con correo, contraseña **y su clave**.

---

# Varios dojos

No hay registro público. Los dojos los crea el **superadministrador**, el dueño de la
plataforma, desde **Plataforma**: ahí ve todos los dojos y puede sumarles administradores,
pero no ve sus alumnos ni sus pagos.

La primera cuenta se crea desde el servidor, porque no hay pantalla para eso a propósito.
Desde `backend/`:

```bash
SUPERADMIN_EMAIL="tu@correo.com" SUPERADMIN_PASSWORD="una-contraseña-larga" npx tsx prisma/crear-superadmin.ts
```

Cada dojo ve solo lo suyo; lo único compartido es el catálogo de uniformes, que no tiene
datos personales.

El filtro está en un solo lugar, [lib/prisma.ts](backend/src/lib/prisma.ts): cada
consulta se limita al dojo que viene firmado en el token. Las rutas no tienen que hacer
nada. Una consulta sin dojo **lanza un error** en lugar de devolver datos de todos.

Al programar, tres cosas:

- **Tabla nueva:** TypeScript no compila hasta decidir en `ALCANCE_POR_MODELO` a qué
  dojo pertenece.
- **Ruta sin sesión** (como un enlace público o un webhook): usa `prismaGlobal` para
  averiguar el dojo y `conDojo(id, ...)` para lo demás.
- **Un id que llega en la petición:** el filtro no revisa las filas que se crean. Antes
  de crear algo que apunte a ese id, búscalo con una consulta normal para confirmar que
  es del dojo. Es el error más fácil de cometer aquí.

El correo y la clave de profesor son únicos entre todos los dojos, porque el login no
pregunta de qué dojo eres.

Al aplicar la migración `dojos`, todo lo que ya existía pasa a un primer dojo llamado
"Mi dojo", y las sesiones abiertas se cierran porque su token no trae dojo.

---

# Preferencias de usuario

Cada persona elige en **Preferencias** su idioma (español o inglés), la vista (clara
u oscura) y el tamaño de letra. Se guardan en su cuenta, en las columnas `language`,
`theme` y `fontSize` de `User`, así que la siguen entre dispositivos. También se
recuerdan en el navegador para aplicarlas desde el primer instante y en las pantallas
sin sesión.

**Al agregar textos a la interfaz**, envuélvelos en `t()` y agrega su inglés en
[frontend/src/i18n/en/](frontend/src/i18n/en/). La llave es el propio texto en español;
si falta la traducción, se muestra en español:

```tsx
{t("Hola, {nombre}", { nombre: user.name })}
```

`t()` va dentro del render. Las constantes a nivel de módulo se quedan en español y se
traducen donde se muestran: `t(ROLE_LABELS[role])`.

Lo que **no** se traduce: lo que escribe el dojo (avisos, nombres, títulos de eventos)
y lo que ya está guardado en español en la base, como las notificaciones automáticas.
Tampoco los mensajes del backend que llevan un valor variable dentro.

**La vista oscura** invierte la escala de colores en
[index.css](frontend/src/index.css), así que las clases normales de Tailwind funcionan
sin `dark:`. Para fondos de tarjeta usa `bg-surface`, no `bg-white`.

---

# Recuperar la contraseña

Hay dos caminos, y los dos llevan a un enlace de un solo uso:

| Camino | Quién lo inicia | Caduca |
| --- | --- | --- |
| **"¿Olvidaste tu contraseña?"** en el login | La persona, y le llega por correo | 1 hora |
| **Restablecer contraseña** en la tarjeta del alumno o en la ficha del profesor | Admin o profesor, y lo comparten por WhatsApp | 24 horas |

Un profesor solo genera enlaces para el alumno y los tutores de **su** grupo; los de
profesores los genera el administrador. Quien genera el enlace nunca ve la contraseña.

Para enviar correos, agrega a **`backend/.env`** `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`,
`SMTP_PASS` y `SMTP_FROM`. **Sin `SMTP_HOST` no se envía nada**: el enlace se escribe en
la consola del backend, útil en desarrollo. El segundo camino funciona sin correo.

Qué protege el flujo:

- Se guarda el **hash** del token, no el token.
- La respuesta es la misma exista o no el correo, para no revelar cuáles están
  registrados.
- Cada enlace nuevo anula los anteriores, y hay límite de peticiones por IP.
- Un profesor sigue necesitando su **clave** para entrar.

> ⚠️ Cambiar la contraseña no cierra las sesiones ya abiertas: el JWT sigue siendo válido
> hasta que caduca, a los 7 días.

---

# Roles y permisos

Dentro de cada dojo hay cuatro roles. El profesor es **subadministrador**: puede todo
menos administrar profesores. Por encima de los dojos está el **superadministrador**,
que crea dojos y administradores pero no ve sus alumnos ni sus pagos (ver
[Varios dojos](#varios-dojos)).

| Acción | Administrador | Profesor | Tutor | Alumno |
| --- | :-: | :-: | :-: | :-: |
| Registrar un **profesor** | ✅ | ❌ | ❌ | ❌ |
| Registrar un **alumno** | ✅ | ✅ | ❌ | ❌ |
| Registrar un **tutor** | ✅ | ✅ | ❌ | ❌ |
| Agregar y quitar **eventos** | ✅ | ✅ | ❌ | ❌ |
| Agregar y quitar **clases** del horario | ✅ | las suyas | ❌ | ❌ |
| Pasar **asistencia** y registrar **graduaciones** | ✅ | su grupo | ❌ | ❌ |
| Ver alumnos | **todos** | **solo los suyos** | sus hijos | él mismo |
| Ver su ficha | — | — | **Ver mis fichas** | **Ver mi ficha** |
| Ver pagos | **todos** | los que le corresponden | sus hijos | los suyos |
| Pagar | ❌ | ❌ | ✅ | ✅ |
| Confirmar pagos en efectivo o transferencia | ✅ | los que le corresponden | ❌ | ❌ |
| Solicitar **uniformes y protecciones** | ❌ | ❌ | ✅ | ✅ |
| Mandar avisos | ✅ | ✅ | ❌ | ❌ |
| Ver el calendario y el horario | ✅ | ✅ | ✅ | ✅ |
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
pago**, y hay dos formas de cobrar:

| Forma | Cuándo | Ejemplo |
| --- | --- | --- |
| **Cuota única** | El evento cobra lo mismo a todos | Examen de cinta: $300 |
| **Por modalidad** | Cada modalidad cuesta aparte y el alumno paga la **suma** de las que elija | Torneo: kata $450, kumite $450, equipos $300 |

Las modalidades **las define cada evento**, no una lista fija: un torneo tiene kata y
kumite, otro puede tener equipos o formas con arma, y agregar una nueva no exige tocar
el código.

Esto existe porque el caso real no es uniforme: **hay padres que inscriben a su hijo
en kata y kumite**, y pagan las dos.

El flujo, de principio a fin:

1. El **profesor comparte su clave** con sus alumnos (la misma `PROF-7K2M`).
2. El alumno paga en el dojo y entra a **Eventos → Pagar**, donde escribe la clave y
   reporta el pago. Un tutor con varios hijos elige de quién es.
3. Al profesor le llega una **notificación** de pago por confirmar.
4. El profesor entra a **Eventos → Pagos**, y confirma o rechaza.
5. **Al confirmar, el alumno queda inscrito** en el mismo movimiento, y el cobro
   aparece en el historial de ese profesor. A la familia le llega la notificación.

Si la familia elige **PayPal**, se salta la confirmación del profesor: al capturarse
el pago queda inscrito. Ver [Pago en línea con PayPal](#pago-en-línea-con-paypal).

## Categorías de competencia

Cada inscripción lleva su categoría, en tres ejes: **rama** (femenil o varonil),
**tipo de cinta** y **rango de edad**. Los rangos **no son los mismos** en las dos
ramas de cinta.

### Cintas de color

| Categoría | Edad |
| --- | --- |
| Infantil | 4-5 · 6-7 · 8-9 · 10-11 · 12-13 años |
| Juvenil | 14-15 · 16-17 años |
| Adultos | 18-35 años |
| Masters | 36 años en adelante |

### Cintas negras

| Categoría | Edad |
| --- | --- |
| U10 | 8-9 años |
| U12 | 10-11 años |
| U14 | 12-13 años |
| Cadete | 14-15 años |
| Junior | 16-17 años |
| U21 | 18-20 años |
| Senior | 21-35 años |
| Masters | 36 años en adelante |

## Precios por profesor

El **administrador** fija el costo base de cada modalidad. Cada **profesor** puede
ajustarlo para **sus** alumnos, sin afectar a los demás grupos. Un profesor que no
ajusta nada cobra el base.

| Quién | Qué puede cambiar |
| --- | --- |
| Administrador | Título, fecha, modalidades y **precios base** (afecta a todos) |
| Profesor | **Solo los precios, y solo para sus alumnos** |

Qué precio aplica lo decide **el profesor al que se acredita el cobro**, que es quien
recibe el dinero:

- El alumno escribe una clave al reportar → aplican los precios de ese profesor.
- El profesor inscribe a su alumno → aplican los suyos.

Esto significa que la misma modalidad puede costar distinto según con quién entrenes,
y cada quien ve en pantalla lo que de verdad va a pagar.

Un profesor **no** puede agregar ni quitar modalidades, ni cambiar el título o la
fecha: eso es global y lo maneja el administrador. Si lo intenta, el sistema se lo
explica en lugar de dejarlo creer que cambió algo.

---

El catálogo de categorías vive en
[backend/src/lib/competitionCategories.ts](backend/src/lib/competitionCategories.ts) y
el frontend lo **pide** a `GET /events/categories` en lugar de duplicarlo: si cambian
los rangos, se cambian en un solo lugar.

**Lo que se valida y lo que no.** El sistema rechaza una categoría que no exista en la
rama elegida —un "U10" en cintas de color simplemente no existe— pero **nunca bloquea
por la edad del alumno**. Inscribir a una alumna de 14 años en Adultos para foguearla
con las grandes es un caso legítimo, y el sistema no debe estorbarlo. La edad solo
sirve para sugerir.

Además, cada inscripción guarda:

- **Método de pago** — efectivo, transferencia o PayPal.
- **Nota libre** — para la excepción que no encaje en ningún campo.

El profesor ve el desglose completo al confirmar: qué modalidades, en qué división,
cómo pagó y la nota.

Detalles que importan:

- **Los precios se congelan al reportar.** Si el dojo sube el costo del kata después,
  los cobros ya hechos siguen en el monto original. Cada inscripción guarda el precio
  de cada modalidad por separado, así que el desglose se puede reconstruir siempre.
- **El alumno nunca manda el id del profesor**, solo la clave. Si pudiera mandar un
  id, cualquiera podría acreditar cobros a un profesor que nunca vio el dinero.
- **Un profesor solo ve y resuelve los cobros de su clave.** El admin ve todos. Si un
  alumno escribe por error la clave de otro profesor, ese profesor verá el reporte y
  podrá rechazarlo.
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
> todos. Por eso `scopeToStudentFilter` devuelve `undefined` solo para `"todos"`; con
> una lista vacía devuelve un filtro que no encuentra nada.

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

Las demás se envían en el momento en que pasa algo: graduaciones, faltas, eventos
nuevos, pagos reportados, confirmados o pagados con PayPal, y cada cambio en una
solicitud de uniformes. Todas salen de
[backend/src/lib/notifications.ts](backend/src/lib/notifications.ts).

Cuando algo pasa con un alumno, la notificación llega **al alumno y a todos sus
tutores**, resuelto por `audienceForStudent`.

---

# Pagos

El alcance lo decide el backend según el rol:

- **Admin** — todos los cobros del dojo.
- **Profesor** — las mensualidades de sus alumnos, los cobros de evento acreditados a
  su clave y las solicitudes de uniformes que le tocan.
- **Tutor** — los de sus hijos, sumados.
- **Alumno** — los suyos.

Los montos se guardan en **centavos como entero** (`amountCents`). Guardar dinero en
`float` produce errores de redondeo.

## Generar y administrar mensualidades

En **Pagos → Generar mensualidades**, el administrador o el profesor eligen el mes, el
monto y si es para todo su grupo o para un solo alumno.

- **Generar dos veces no duplica ni cambia montos:** quien ya tiene la mensualidad de
  ese mes se omite. Tampoco se le cobra a un alumno un mes anterior a su inscripción.
- **Una mensualidad pendiente** se puede cobrar en el dojo (**Registrar pago**), editar
  (por ejemplo, para aplicar una beca) o eliminar. Una pagada no se edita ni se borra.
- **Cambiar el monto suelta cualquier orden de PayPal abierta**, para que no se cobre el
  monto anterior.
- **Pasa a Vencida sola** cuando termina su mes. Se evalúa al consultar los datos, sin
  tarea programada, igual que las notificaciones de pagos.

La pestaña reúne **todos los cobros**: mensualidades, eventos y uniformes, tanto los
pagados como los pendientes. Lo que se debe aparece primero.

| Estado | Significado |
| --- | --- |
| Pendiente / Vencido | Se debe. Cuenta en "Por cubrir" |
| Por confirmar | La familia reportó que pagó en efectivo o transferencia |
| En revisión | Uniformes que el profesor aún no confirma |
| Pagado | Con su método y fecha |
| Rechazado | Queda en el historial |

## Efectivo o transferencia

Además de PayPal, la familia puede avisar que pagó en efectivo o por transferencia. El
cobro queda **por confirmar** y no cuenta como pagado hasta que el administrador o el
profesor responsable lo confirme en esa misma pestaña, porque nadie ha visto ese dinero
todavía. Si responde "No lo recibí", la mensualidad o los uniformes vuelven a quedar
pendientes; el evento se rechaza, igual que al resolverlo desde Eventos.

## Pago en línea con PayPal

Alumnos y tutores pagan con PayPal cualquier cobro pendiente desde **Pagos**:
mensualidades, eventos y uniformes ya confirmados por el profesor. También se puede
desde **Eventos → Pagar** y desde **Uniformes y protecciones**.

Al capturarse el pago, el cobro queda pagado —y en un evento, el alumno queda
inscrito— **sin que el profesor tenga que confirmar nada**. Al profesor le llega una notificación y
el cobro sigue acreditándose a su clave. Todo el dinero entra a una sola cuenta de
PayPal, la del dojo: el reparto a cada profesor es interno.

### Configuración

Crea una app en [developer.paypal.com](https://developer.paypal.com) (Apps &
Credentials, modo Sandbox) y agrega a **`backend/.env`**:

```env
PAYPAL_CLIENT_ID="..."
PAYPAL_CLIENT_SECRET="..."
PAYPAL_ENV="sandbox"
PAYPAL_CURRENCY="MXN"
PAYPAL_WEBHOOK_ID="..."
```

Sin credenciales, la app funciona igual y solo se oculta el pago en línea.

El webhook (`POST /paypal/webhook`, evento `PAYMENT.CAPTURE.COMPLETED`) es un
respaldo por si alguien cierra la ventana justo después de pagar. Necesita una URL
pública, así que en local no llega y `PAYPAL_WEBHOOK_ID` se puede dejar vacío.

### Probarlo

1. En [Sandbox Accounts](https://developer.paypal.com/dashboard/accounts), copia el
   correo y la contraseña de la cuenta **Personal**.
2. Entra a la app con un tutor o alumno que tenga una mensualidad pendiente y abre
   **Pagos**.
3. Elige **Pagar con PayPal** en una mensualidad pendiente e inicia sesión con la
   cuenta Personal. El dinero es ficticio.

### Lo que protege el cobro

- **El navegador solo dice qué cobro se paga.** El monto sale de la base de datos y
  la captura ocurre en el servidor.
- **Solo se paga lo propio.** El cobro tiene que ser de un alumno de la familia de
  quien inicia sesión.
- **Una orden liquida un solo cobro.** `externalReference` guarda el id de la orden y
  es único. Una orden anterior abandonada ya no puede liquidar ese cobro.
- **Se compara lo capturado con lo que se debe.** Si el monto o la moneda no
  coinciden, el pago no se aplica y queda en el log.
- **El botón y el webhook no se pisan.** Comparten la misma función y solo uno aplica
  el cambio, sin importar cuál llegue primero.
- **El webhook se verifica con PayPal** antes de creer lo que dice.
- **El `PAYPAL_CLIENT_SECRET` nunca sale del backend.** El `PAYPAL_CLIENT_ID` sí llega
  al navegador: es público.

La integración está en [paypal.ts](backend/src/lib/paypal.ts) y
[paypal.routes.ts](backend/src/routes/paypal.routes.ts).

---

# Agente de cobranza: recordatorios y recuperación (fase 2)

Después de que Zapier envía los recordatorios de cobro, el backend guarda a qué cobros
se les mandaron y mide cuánto se recuperó. Las dos rutas viven junto a `/unpaid` y
exigen la misma API key (`x-api-key: <AGENT_API_KEY>` o `Authorization: Bearer ...`).
Están en [agentRecordatorios.routes.ts](backend/src/routes/agentRecordatorios.routes.ts).

> **Este es el contrato con Zapier, Claude y Postman.** Cambiar el nombre de un campo
> rompe el Zap, el prompt y los tests: avísalo al equipo antes de hacerlo.

### `POST /api/agent/record-reminders`

Zapier lo llama después de enviar los mensajes, con los `pagoId` que tomó de `/unpaid`:

```json
{ "pagoIds": [201, 215] }
```

Respuesta `200`:

```json
{
  "fechaEnvio": "2026-11-05T09:02:11-06:00",
  "registrados": [201, 215],
  "yaPagados": [],
  "noEncontrados": []
}
```

- Un id repetido cuenta una sola vez.
- Un cobro ya pagado va en `yaPagados` y un id que no existe en `noEncontrados`; ninguno
  hace fallar al resto.
- Responde `400` si `pagoIds` no es una lista de 1 a 500 enteros positivos, y `401` sin
  API key.

### `GET /api/agent/recovery-stats?dias=30`

Resume los cobros recordados en los últimos `dias` días (1 a 365, 30 por omisión). Los
montos van en pesos enteros, igual que en `/unpaid`.

```json
{
  "fechaConsulta": "2026-11-10T09:00:00-06:00",
  "periodo": { "desde": "2026-10-11", "hasta": "2026-11-10", "dias": 30 },
  "recordatoriosEnviados": 2,
  "pagosRecordados": 2,
  "pagosRecuperados": 1,
  "pagosReportados": 0,
  "pagosPendientes": 1,
  "pagosPagadosAntes": 0,
  "tasaRecuperacion": 50,
  "montoRecordado": 1400,
  "montoRecuperado": 700,
  "montoPendiente": 700,
  "diasPromedioParaPagar": 2,
  "recuperadoPorMetodo": { "PAYPAL": 700, "EFECTIVO": 0, "TRANSFERENCIA": 0 },
  "pagos": [
    {
      "pagoId": 201,
      "alumnoId": 14,
      "alumno": "Sofía Cruz",
      "tutor": "Mariana Cruz",
      "mes": "2026-10",
      "monto": 700,
      "recordatorios": 1,
      "primerRecordatorio": "2026-11-05T09:02:11-06:00",
      "estado": "RECUPERADO",
      "pagadoEl": "2026-11-07",
      "metodo": "PAYPAL",
      "diasParaPagar": 2
    }
  ]
}
```

`estado` de cada cobro, medido desde su **primer** recordatorio:

| Estado | Significado |
|---|---|
| `RECUPERADO` | Se pagó el día del recordatorio o después. |
| `REPORTADO` | La familia dice que pagó en efectivo o transferencia y falta confirmarlo. |
| `PENDIENTE` | Sigue sin pagarse. |
| `PAGADO_ANTES` | Ya estaba pagado al enviar el recordatorio. No cuenta para `tasaRecuperacion` ni para `montoRecordado`. |

`tasaRecuperacion` es un porcentaje entero. `diasPromedioParaPagar` es `null` mientras
no haya cobros recuperados.

---

# Asistencia y graduaciones

**Asistencia.** En **Asistencia** el administrador o el profesor eligen el día y marcan
quién asistió o faltó; volver a tocar una opción quita la marca. Hay una sola marca por
alumno y día, y cada falta nueva le avisa al alumno y a sus tutores. Un profesor solo ve
y marca a su grupo.

**Graduaciones.** En la tarjeta del alumno, pestaña **Graduaciones**, se registra la
cinta, la fecha y una nota. La más reciente cambia la cinta vigente y avisa a la familia;
una fecha anterior solo completa el historial. La nueva cinta tiene que ser superior a
la actual. **Quitar** deshace una captura errónea y regresa a la cinta que tenía antes.

---

# Uniformes y protecciones

Alumnos y tutores piden equipo a su profesor desde esa opción del menú: uniforme básico,
de kata o de kumite, guantes, espinilleras, peto, bucal, casco y concha.

1. La familia elige marca y modelo, talla y, si aplica, color. **"Ambos"** colores son
   dos juegos, así que el precio se duplica.
2. Al profesor del alumno le llega una notificación. Confirma disponibilidad y precio.
3. La familia paga con PayPal, en efectivo o por transferencia.
4. El profesor marca la solicitud como entregada.

El catálogo está en la base de datos, en tres niveles: **producto** (con sus tallas y
colores), **modelo** (la opción de cada marca, con precio y link) y **solicitud** (con el
precio congelado). Cambiar el catálogo no altera lo que ya se pidió.

"Otra marca" se escribe a mano y queda sin precio hasta que el profesor lo defina. El
precio siempre sale del servidor, nunca del navegador.

> ⚠️ Los modelos y precios de [seed-catalog.ts](backend/prisma/seed-catalog.ts) son **de
> ejemplo** y la pantalla los marca como tales. Las marcas y sus links sí son reales.
> Todavía no hay pantalla para editar el catálogo.

---

# Horario de clases

Las clases se repiten cada semana y se guardan en la base de datos. Las ven los cuatro
roles, con filtro por profesor. Un profesor agrega y quita las suyas; el administrador
elige de quién es cada una.

[seed-classes.ts](backend/prisma/seed-classes.ts) genera horarios aleatorios sin empalmes
de profesor ni de tatami. Si ya hay clases no hace nada; con `--regenerar` **borra todas**
y las vuelve a crear.

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
│   ├── prisma
│   │   ├── schema.prisma     modelo de datos
│   │   ├── migrations        migraciones, en orden
│   │   ├── repair            reparación para bases migradas antes del PR #9
│   │   ├── seed.ts           datos de desarrollo
│   │   ├── seed-demo.ts      dojo de demostración
│   │   ├── seed-catalog.ts   catálogo de uniformes de ejemplo
│   │   ├── seed-classes.ts   horarios aleatorios
│   │   └── crear-superadmin.ts
│   ├── src
│   │   ├── routes            endpoints de la API, uno por módulo
│   │   ├── lib               acceso por rol, filtro por dojo, PayPal, notificaciones
│   │   ├── middleware        sesión, permisos y límite de peticiones
│   │   ├── permissions.ts    matriz de permisos por rol
│   │   ├── app.ts            configuración de Express
│   │   └── server.ts         punto de entrada
│   └── .env.example          plantilla de variables de entorno
│
├── frontend
│   ├── src
│   │   ├── pages             una pantalla por ruta
│   │   ├── components        piezas compartidas: tarjetas, menú, botón de PayPal
│   │   ├── layouts           AuthLayout, DashboardLayout
│   │   ├── lib               colores por módulo
│   │   ├── i18n              textos en inglés
│   │   ├── services          cliente HTTP y sesión
│   │   └── types             tipos compartidos
│   └── .env.example
│
├── PRODUCT.md                contexto del producto
├── DESIGN.md                 sistema de diseño: colores, tipografía, componentes
├── CONTRIBUTING.md           guía de trabajo en equipo
├── docker-compose.yml        PostgreSQL 17 para desarrollo
└── README.md
```

La interfaz sigue un sistema propio documentado en [DESIGN.md](DESIGN.md): fondo con
retícula de puntos, Mona Sans, violeta para la acción principal y **un color por
módulo**, que se repite en el menú y en el título de cada pantalla.

---

# Flujo de trabajo con Git

El proyecto usa **Git Flow**: `main` (producción) ← `develop` (integración) ←
`feature/*` (un módulo por persona).

```
main
 └── develop
      ├── feature/<tema>      una rama por funcionalidad
      └── fix/<tema>          correcciones
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

# Pendiente

Lo que todavía no existe, para que nadie lo dé por hecho:

- **Asistente de IA.** Está planeado; hoy la app no tiene ninguna función de IA.
- **Publicación en un servidor.** La app corre en local; el webhook de PayPal necesita
  una URL pública para funcionar.
- **Pantalla para editar el catálogo de uniformes.** Por ahora se carga con
  `seed-catalog.ts`, y sus modelos y precios son de ejemplo.
- **Reportes y configuración del dojo.** Sus pantallas están vacías y no aparecen en el
  menú.

---

# Autores

- Zoé García (`g4rzi4`)
- `fernandosfn06`
- `Warnight`
- _(completar los nombres de los demás integrantes)_
