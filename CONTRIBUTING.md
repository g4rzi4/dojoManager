# Guía de trabajo en equipo — DojoManager

Somos 6 personas trabajando sobre el mismo repositorio. Esta guía evita que nos pisemos
el trabajo. **Léela completa antes de tu primer commit.**

---

## 1. Estructura de ramas

```
main                 producción. Nadie commitea aquí directo.
 └── develop         integración. Aquí se juntan todos los módulos.
      ├── feature/auth       login, registro, JWT
      ├── feature/students   alumnos: alta, baja, cinturones
      ├── feature/teachers   profesores y horarios
      ├── feature/payments   mensualidades y cobros
      ├── feature/reports    reportes y estadísticas
      └── feature/settings   configuración del dojo
```

**Regla de oro:** cada persona trabaja en **una** rama `feature/*`. No commitees en la
rama de otra persona; si necesitas un cambio en su módulo, pídeselo o abre un PR hacia
su rama.

### Reparto de módulos

Llena esta tabla en la primera reunión para que quede claro quién toca qué:

| Rama               | Responsable | Estado      |
| ------------------ | ----------- | ----------- |
| `feature/auth`     | Zoé García  | En progreso |
| `feature/students` | _por asignar_ | Sin empezar |
| `feature/teachers` | _por asignar_ | Sin empezar |
| `feature/payments` | _por asignar_ | Sin empezar |
| `feature/reports`  | _por asignar_ | Sin empezar |
| `feature/settings` | _por asignar_ | Sin empezar |

---

## 2. Tu primer día

Copia y pega esto completo. El orden importa: las migraciones de Prisma fallan si la
base de datos no existe todavía.

```bash
git clone https://github.com/g4rzi4/dojoManager.git
cd dojoManager

# 1. Base de datos PRIMERO (con Docker, no necesitas instalar PostgreSQL)
docker compose up -d --wait
#    Sin Docker: instala PostgreSQL 17 y corre  createdb dojomanager

# 2. Backend
cd backend
npm install
cp .env.example .env     # con Docker funciona sin editar nada
npx prisma generate      # genera el cliente en src/generated/ (no se sube a git)
npx prisma migrate dev
cd ..

# 3. Frontend
cd ../frontend
npm install
cd ..

# 4. Cámbiate a tu rama — nunca trabajes en develop ni main
git switch feature/TU_MODULO
```

Para levantarlo necesitas **dos terminales**: `npm run dev` dentro de `backend/` y otro
`npm run dev` dentro de `frontend/`. Luego entra a `http://localhost:5173` con
`admin@dojo.com` / `123456` (usuario de prueba, ver README).

### Si algo falla en la instalación

| Error                                                                | Causa y solución                                                                                                                                                                         |
| -------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Bind for 0.0.0.0:5432 failed: port is already allocated`            | Ya tienes PostgreSQL instalado y corriendo en tu máquina, ocupando el puerto. **O** detienes el tuyo (`brew services stop postgresql@17`), **o** no uses Docker y sigue la Opción B.      |
| `Cannot find package 'dotenv'`                                       | Te falta correr `npm install` dentro de `backend/`. Prisma lee `prisma.config.ts`, que importa `dotenv`.                                                                                  |
| `Can't reach database server at localhost:5432`                      | La base de datos no está arriba. Con Docker: `docker compose ps` y `docker compose up -d --wait`.                                                                                        |
| `tsx: command not found`                                             | Mismo caso: `npm install` en `backend/`.                                                                                                                                                 |
| `Cannot find module './internal/class.js'`                           | Estás corriendo el backend con `ts-node` o `ts-node-dev`. Usa `npm run dev`, que usa `tsx` (ver §9).                                                                                     |
| `Environment variable not found: DATABASE_URL`                       | No creaste tu `.env`: `cp .env.example .env` dentro de `backend/`.                                                                                                                       |

> **Nota:** el `node_modules` del backend que estaba subido a git venía **incompleto**
> (le faltaban `express`, `cors`, `dotenv`, `ts-node-dev` y `typescript`). Ya lo
> quitamos del repositorio, así que `npm install` es obligatorio y no opcional.

---

## 3. El ciclo de trabajo diario

### Antes de empezar a programar — siempre

Traer los cambios que el resto del equipo ya integró en `develop`:

```bash
git switch develop
git pull
git switch feature/TU_MODULO
git merge develop
```

Si haces esto **todos los días**, los conflictos son de 2 líneas. Si lo haces una vez
al mes, son de 200.

### Mientras programas

```bash
git add .
git commit -m "feat(students): formulario de alta de alumno"
git push
```

### Cuando termines tu módulo (o una parte usable)

No hagas merge a `develop` desde tu terminal. **Abre un Pull Request** para que alguien
más lo revise:

```bash
git push
gh pr create --base develop --title "feat(students): CRUD de alumnos" --fill
```

O desde la web: GitHub → Pull requests → New pull request → base `develop` ← compare
`feature/students`.

Otra persona del equipo aprueba, y **ella o tú** hacen el merge desde GitHub.

---

## 4. Mensajes de commit

Formato: `tipo(módulo): descripción en minúsculas`

| Tipo       | Cuándo usarlo                              |
| ---------- | ------------------------------------------ |
| `feat`     | nueva funcionalidad                        |
| `fix`      | corrección de un bug                       |
| `style`    | CSS, formato, nada de lógica               |
| `refactor` | reorganizar código sin cambiar comportamiento |
| `docs`     | documentación                              |
| `chore`    | dependencias, configuración, limpieza      |

Ejemplos buenos:

```
feat(payments): registro de mensualidad con fecha de vencimiento
fix(auth): el token expiraba a los 5 minutos en vez de 7 días
docs(readme): agrega pasos de instalación de PostgreSQL
```

Ejemplos malos: `cambios`, `arreglos`, `commit`, `asdf`, `ya funciona`.

---

## 5. Qué NUNCA se sube a git

- **`node_modules/`** — pesa cientos de MB y genera conflictos imposibles. Cada
  persona lo genera con `npm install`.
- **`.env`** — contiene tu `DATABASE_URL` y secretos. Si necesitas una variable nueva,
  agrégala a **`.env.example`** (sin el valor real) y avisa al equipo.
- **`.DS_Store`** — basura de macOS.
- **Archivos de build** (`dist/`, `build/`).

Todo esto ya está en el [`.gitignore`](.gitignore). Si ves alguno de estos archivos en
`git status`, algo se configuró mal: avisa antes de commitear.

---

## 6. Resolver conflictos sin miedo

Si `git merge develop` te da conflicto:

```bash
git status                  # te dice qué archivos están en conflicto
```

Abre cada archivo. Verás esto:

```
<<<<<<< HEAD
    tu versión
=======
    la versión de develop
>>>>>>> develop
```

Decide qué código debe quedar, **borra las tres líneas de marcadores**
(`<<<<<<<`, `=======`, `>>>>>>>`), guarda y:

```bash
git add ARCHIVO_RESUELTO
git commit
```

Si te atoras y quieres cancelar el merge y volver a como estabas:

```bash
git merge --abort
```

**En conflictos de `package-lock.json`**: no lo edites a mano. Haz
`git checkout --theirs package-lock.json && npm install`, y commitea el resultado.

---

## 7. Comandos de rescate

| Situación                                      | Comando                                 |
| ---------------------------------------------- | --------------------------------------- |
| Quiero descartar cambios de un archivo         | `git restore ARCHIVO`                   |
| Me equivoqué de rama antes de commitear        | `git stash` → cambia de rama → `git stash pop` |
| Commiteé pero no pusheé, quiero deshacer       | `git reset --soft HEAD~1`               |
| ¿En qué rama estoy?                            | `git branch --show-current`             |
| Ver el historial de forma legible              | `git log --oneline --graph --all`       |

Si algo se ve muy roto: **no hagas `git push --force`**. Avisa en el grupo primero.

---

## 8. Usar la base de datos en tu módulo

Ya está listo el cliente de Prisma conectado a PostgreSQL. **No crees tu propio
`new PrismaClient()`**: importa el que ya existe.

```ts
import { prisma } from "../lib/prisma";

// Ejemplos
const alumnos = await prisma.user.findMany();
const uno = await prisma.user.findUnique({ where: { id: 1 } });
const nuevo = await prisma.user.create({
  data: { name: "Ana", email: "ana@dojo.com", password: "hash" },
});
```

Si todos importamos el mismo [`src/lib/prisma.ts`](backend/src/lib/prisma.ts),
compartimos un solo pool de conexiones. Si cada módulo instancia el suyo, entre 6
personas agotamos las conexiones de PostgreSQL y empieza a fallar sin razón aparente.

### Si cambias el modelo de datos

El esquema vive en [`backend/prisma/schema.prisma`](backend/prisma/schema.prisma). Hoy
solo tiene `User`; cada módulo tendrá que agregar sus tablas.

```bash
# 1. Edita schema.prisma y agrega tu modelo
# 2. Crea la migración (nombre descriptivo, en snake_case)
npx prisma migrate dev --name agrega_tabla_alumnos
# 3. Regenera el cliente TypeScript
npx prisma generate
```

**La migración se commitea** (va en `prisma/migrations/`). El cliente generado en
`src/generated/` **no**: está en el `.gitignore` y cada quien lo regenera con
`npx prisma generate`.

> ⚠️ Avisa al equipo cuando subas una migración. Los demás tienen que correr
> `npx prisma migrate dev` y `npx prisma generate` al hacer pull, o su código no
> compilará contra el esquema nuevo.

### Dos detalles técnicos, por si te topas con ellos

- **Prisma 7 exige un driver adapter.** Ya está configurado (`@prisma/adapter-pg` + `pg`)
  en `src/lib/prisma.ts`. Sin él, `new PrismaClient()` ni arranca.
- **El backend corre con `tsx`, no con `ts-node`.** El cliente que genera Prisma 7
  importa con extensiones `.js` sobre archivos `.ts`; `tsc` lo resuelve, pero `ts-node`
  no, y revienta con `Cannot find module './internal/class.js'`. Usa siempre
  `npm run dev`.

Para revisar que tu código compila, sin arrancar el servidor:

```bash
npm run typecheck
```

---

## 9. Protección de `main` y `develop`

Intentamos activar la protección de ramas en GitHub, pero **no está disponible**: el
repositorio es privado y la cuenta está en el plan gratuito, que no incluye reglas de
protección en repos privados.

Mientras eso no cambie, la protección es **un acuerdo entre nosotros, no un bloqueo
técnico**. Git te va a dejar hacer `git push` a `main` — simplemente no lo hagas:

- ❌ No commitees ni pushees directo a `main` ni a `develop`.
- ❌ No hagas `git push --force` a ninguna rama compartida.
- ✅ Todo cambio a `develop` entra por Pull Request con al menos 1 aprobación.
- ✅ `main` solo recibe merges desde `develop`, cuando hay una versión estable.

### Para volverlo un bloqueo real

Cualquiera de estas tres opciones:

1. **Hacer el repositorio público** — la protección de ramas pasa a ser gratuita.
   Antes de hacerlo: confirmar que no hay credenciales en el historial.
2. **GitHub Pro** (~4 USD/mes en la cuenta del dueño del repo) — habilita protección
   en repos privados.
3. **GitHub Team** — si el dojo o la escuela puede pagar una organización, además da
   mejor manejo de permisos para los 6.

Si se activa alguna, pedir al dueño del repo que configure en
`Settings → Branches → Add rule`, para `main` y `develop`:

- Require a pull request before merging → 1 approval
- Dismiss stale pull request approvals when new commits are pushed
- Do not allow force pushes
- Do not allow deletions
