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
- PostgreSQL 17
- DBeaver (opcional)

---

# Clonar el proyecto

```bash
git clone https://github.com/g4rzi4/dojoManager.git
cd dojoManager
```

> **Si vas a colaborar en el proyecto, lee primero [CONTRIBUTING.md](CONTRIBUTING.md).**
> Ahí está el reparto de módulos, la estructura de ramas y el flujo de Pull Requests.

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

Luego edita `.env` y reemplaza `TU_USUARIO` por tu usuario de PostgreSQL:

```env
DATABASE_URL="postgresql://juan@localhost:5432/dojomanager"
```

> El `.env` **no se sube a git** (contiene tus credenciales). El `.env.example` sí, y
> es donde se documenta cada variable nueva que agregue el equipo.

Generar el cliente de Prisma:

```bash
npx prisma generate
```

Ejecutar las migraciones:

```bash
npx prisma migrate dev
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

---

# Base de datos

Crear una base de datos llamada:

```
dojomanager
```

Si aún no existe:

```bash
createdb dojomanager
```

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

`main` y `develop` están protegidas: los cambios entran por Pull Request revisado.

**El detalle completo —reparto de módulos, convención de commits, cómo resolver
conflictos y comandos de rescate— está en [CONTRIBUTING.md](CONTRIBUTING.md).**

---

# Autores

- Zoé García
- _(5 colaboradores — completar nombres en [CONTRIBUTING.md](CONTRIBUTING.md))_