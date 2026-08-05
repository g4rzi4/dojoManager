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
git clone https://github.com/TU_USUARIO/dojoManager.git
cd dojoManager
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

Crear un archivo `.env` con el siguiente contenido:

```env
DATABASE_URL="postgresql://USUARIO@localhost:5432/dojomanager"
```

Ejemplo:

```env
DATABASE_URL="postgresql://juan@localhost:5432/dojomanager"
```

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
│   ├── prisma
│   ├── src
│   └── package.json
│
├── frontend
│   ├── src
│   └── package.json
│
└── README.md
```

---

# Flujo de trabajo con Git

Actualizar cambios:

```bash
git pull
```

Guardar cambios:

```bash
git add .
git commit -m "Descripción del cambio"
git push
```

---

# Autores

- Zoé García
- Nombre del colaborador