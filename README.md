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
cualquiera de las tres cuentas que crea el seed. Cada una lleva a una pantalla
distinta, según su rol:

| Rol          | Correo              | Contraseña | Qué ve al entrar                              |
| ------------ | ------------------- | ---------- | --------------------------------------------- |
| Administrador | `admin@dojo.com`    | `123456`   | Panel completo, incluyendo Profesores         |
| Profesor     | `profesor@dojo.com` | `123456`   | Igual, **sin** la sección de Profesores       |
| Alumno       | `alumno@dojo.com`   | `123456`   | Solo su propia tarjeta de información         |

Las contraseñas se guardan con hash de **bcrypt** y la sesión viaja en un **JWT**
firmado con tu `JWT_SECRET`. Son cuentas de **desarrollo local**: no las subas a un
servidor público.

El alumno de prueba (Ana López) viene con historial completo: 4 graduaciones de
cinturón, 13 registros de asistencia, 4 mensualidades y 3 observaciones del profesor.

Para comprobar solo el backend:

```bash
curl http://localhost:3000
# {"message":"Backend funcionando 🚀"}
```

---

# Roles y permisos

Hay tres roles. El profesor es **subadministrador**: puede todo menos administrar
profesores y la configuración del dojo.

| Permiso           | Administrador | Profesor | Alumno |
| ----------------- | :-----------: | :------: | :----: |
| Ver alumnos       |       ✅       |    ✅     |   —    |
| Editar alumnos    |       ✅       |    ✅     |   —    |
| Ver/editar eventos |      ✅       |    ✅     |   —    |
| Ver/editar pagos  |       ✅       |    ✅     |   —    |
| Ver reportes      |       ✅       |    ✅     |   —    |
| Administrar profesores |   ✅      |    ❌     |   —    |
| Configuración del dojo |   ✅      |    ❌     |   —    |
| Ver su propia tarjeta  |   ✅      |    ✅     |   ✅    |

La matriz vive en un solo lugar:
[backend/src/permissions.ts](backend/src/permissions.ts). El frontend **no la
duplica**: el backend le envía al iniciar sesión la lista de permisos ya resuelta, y
el menú se arma con eso.

> ⚠️ Ocultar un menú **no es seguridad**. Quien sabe la URL puede entrar, y quien
> sabe usar la consola del navegador puede editar su `localStorage`. Lo que de verdad
> protege los datos es que cada ruta del backend valida el token y el permiso. Si
> agregas un endpoint, protégelo con `requireAuth` y `requirePermission` — ver
> [CONTRIBUTING.md](CONTRIBUTING.md).

El alumno solo puede ver **su propio** expediente: `GET /students/:id` compara el id
del expediente contra el del token y responde `403` si no coincide.

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
      ├── feature/students    alumnos y cinturones
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