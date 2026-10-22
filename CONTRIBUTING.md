# Guía de trabajo en equipo — DojoManager

Somos 6 personas trabajando sobre el mismo repositorio. Esta guía evita que nos pisemos
el trabajo. **Léela completa antes de tu primer commit.**

---

## 1. Estructura de ramas

```
main                 producción. Nadie commitea aquí directo.
 └── develop         integración. Aquí se juntan todos los módulos.
      ├── feature/dashboard  panel, roles y expediente  (en revisión: PR #1)
      ├── feature/auth       login, registro, JWT
      ├── feature/students   alumnos: alta, baja, cinturones
      ├── feature/teachers   profesores y horarios
      ├── feature/events     calendario: crear y editar eventos
      ├── feature/payments   mensualidades y cobros
      ├── feature/reports    reportes y estadísticas
      └── feature/settings   configuración del dojo
```

**Regla de oro:** cada persona trabaja en **una** rama `feature/*`. No commitees en la
rama de otra persona; si necesitas un cambio en su módulo, pídeselo o abre un PR hacia
su rama.

### Reparto de módulos

Llena esta tabla en la primera reunión para que quede claro quién toca qué:

| Rama | Responsable | Estado | Qué falta |
| --- | --- | --- | --- |
| `feature/dashboard` | Zoé García | **En revisión (PR #1)** | Mergear antes de repartir lo demás |
| `feature/auth` | Zoé García | Hecho en el PR #1 | Recuperación de contraseña |
| `feature/students` | _por asignar_ | Base lista | Editar expediente, registrar graduaciones y asistencia |
| `feature/teachers` | _por asignar_ | Base lista | Horarios y reasignar alumnos entre profesores |
| `feature/events` | _por asignar_ | Base lista | Editar eventos y eventos recurrentes |
| `feature/payments` | _por asignar_ | Solo consulta | Registrar cobros, y más adelante PayPal |
| `feature/reports` | _por asignar_ | Sin empezar | Todo |
| `feature/settings` | _por asignar_ | Sin empezar | Todo |

> ⚠️ **`feature/students`, `teachers`, `events` y `payments` salieron de `develop`
> antes del PR #1**, así que todavía no tienen el schema ni los endpoints. En cuanto
> ese PR se mergee, lo primero que debe hacer cada responsable es:
>
> ```bash
> git switch feature/TU_MODULO
> git merge develop
> cd backend && npx prisma migrate deploy && npx prisma generate
> ```
>
> Si empiezas a programar antes de eso, vas a reescribir cosas que ya existen.

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
npx prisma db seed       # crea las cuentas de prueba de los 4 roles
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
| `Falta la variable de entorno JWT_SECRET`                            | Tu `.env` es de una versión anterior. Compáralo con `.env.example` y agrega lo que falte: el backend no arranca sin esa llave.                                                            |
| `401` en todo después de actualizar                                  | Cambió el `JWT_SECRET` o se recreó la base: los tokens viejos ya no valen. Cierra sesión en el navegador y vuelve a entrar.                                                              |

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

### Proteger tus endpoints (obligatorio)

Hay tres roles: `ADMIN`, `PROFESOR` (subadministrador) y `ALUMNO`. La matriz de
permisos está en [`backend/src/permissions.ts`](backend/src/permissions.ts) y es la
**única** fuente de verdad.

Todo endpoint nuevo se protege con dos middlewares:

```ts
import { requireAuth, requirePermission } from "../middleware/auth";

// Leer: cualquiera que pueda ver alumnos
router.get("/", requireAuth, requirePermission("students:read"), handler);

// Escribir: exige el permiso de escritura
router.post("/", requireAuth, requirePermission("students:write"), handler);
```

Dentro del handler, `req.user` trae `{ id, role }` — **sacado del token**, no del
body. Nunca leas el rol de lo que manda el cliente: cualquiera puede escribir
`{"role":"ADMIN"}` en una petición.

```ts
router.post("/", requireAuth, requirePermission("students:write"), async (req, res) => {
  const autorId = req.user!.id;  // ✅ viene del token firmado
  // const autorId = req.body.userId;  ❌ el cliente podría poner cualquiera
});
```

**Si el recurso es "propio" del usuario**, el permiso no alcanza: hay que comparar
contra el token. Así lo hace la tarjeta del alumno en
[`students.routes.ts`](backend/src/routes/students.routes.ts):

```ts
const esSuPropioExpediente = student.userId === req.user!.id;

if (!can(req.user!.role, "students:read") && !esSuPropioExpediente) {
  return res.status(403).json({ success: false, message: "..." });
}
```

> ⚠️ **Ocultar un botón en el frontend no protege nada.** El menú se esconde solo
> para no ofrecer algo que va a fallar. Cualquiera puede llamar a tu endpoint con
> `curl` y un token de alumno. Si no pusiste `requirePermission`, entra.

### Accesos "solo los míos"

Hay dos accesos que **un permiso no puede expresar**, porque dependen de a quién
pertenece el dato: el alumno viendo lo suyo, y el tutor viendo lo de sus hijos.

Para esos casos usa los helpers de
[`backend/src/lib/access.ts`](backend/src/lib/access.ts) en lugar de inventar la
comprobación:

```ts
import { canViewStudent, ownStudentIds } from "../lib/access";

// ¿Puede ver el expediente de este alumno?
// Verdadero si tiene students:read, o si el alumno es suyo / es su hijo.
if (!(await canViewStudent(req.user!, studentId))) {
  return res.status(403).json({ success: false, message: "..." });
}

// Para filtrar una lista al alcance del usuario:
const mios = await ownStudentIds(req.user!);
```

Nota que el **tutor no tiene `students:read`** a propósito: ese permiso significa
*todos* los alumnos del dojo. Si se lo das, verá a todas las familias.

Y aunque el **profesor sí lo tiene**, su alcance está limitado a los alumnos que
tiene asignados (`Student.teacherId`). Para listar, filtra siempre:

```ts
import { scopeToStudentFilter, visibleStudentIds } from "../lib/access";

const scope = await visibleStudentIds(req.user!);

const alumnos = await prisma.student.findMany({
  where: scopeToStudentFilter(scope),   // undefined solo si es "todos"
});
```

> ⚠️ **Un filtro con lista vacía no es lo mismo que no filtrar.** Si un profesor no
> tiene alumnos y pasas `{ id: { in: [] } }` está bien (devuelve nada), pero si por
> error pasas `undefined`, verá a TODO el dojo. Mira cómo `GET /payments` corta
> explícitamente cuando el alcance viene vacío.

Para escribir, usa `canManageStudent`: comprueba el alcance **y** que el rol pueda
editar, así un tutor no modifica el expediente de su hijo.

> ⚠️ Nunca aceptes un id de alumno del cliente para decidir el alcance. Mira cómo lo
> hace `GET /payments`: no recibe ningún parámetro y calcula el alcance desde el
> token. Si recibiera `?studentId=`, cualquiera podría pedir los pagos de otra
> familia.

### Mandar notificaciones desde tu módulo

Cuando tu módulo guarde algo que al alumno o a su familia le interese, créale la
notificación. Las funciones están en
[`backend/src/lib/notifications.ts`](backend/src/lib/notifications.ts):

```ts
import { notifyBeltPromotion, notifyAbsence } from "../lib/notifications";

// feature/students, al registrar una graduación:
await notifyBeltPromotion(promocion.id, alumno.id, promocion.belt);

// feature/students, al registrar una falta:
await notifyAbsence(asistencia.id, alumno.id, "2026-10-22");
```

No tienes que averiguar a quién avisarle: `audienceForStudent` ya resuelve que vaya
**al alumno y a todos sus tutores**.

Todas llevan `dedupeKey`, así que llamarlas dos veces por el mismo hecho no genera
notificaciones duplicadas.

### Endpoints públicos

Hay exactamente **dos** superficies sin autenticación: el login y el formulario de
inscripción. Si agregas una tercera, piénsalo dos veces y protégela igual:

```ts
import { rateLimit } from "../middleware/rateLimit";

const limite = rateLimit({ maximo: 20, ventanaSegundos: 600 });

router.post("/publico", limite, async (req, res) => { ... });
```

Reglas para cualquier endpoint sin sesión:

1. **Limitador de peticiones.** Sin él, alguien prueba tokens o contraseñas a miles
   por minuto.
2. **Nunca devuelvas más de lo necesario.** Mira
   `GET /invitations/public/:token`: regresa el tipo de formulario y el nombre de
   quien invita, y nada más. No los datos del alumno ligado completo.
3. **Si consume un recurso de un solo uso, séllalo en la misma transacción** que crea
   los datos. Si lo sellas después, dos peticiones simultáneas pasan las dos. Así lo
   hace el `updateMany` con `usedAt: null` en `invitations.routes.ts`.

### Contraseñas

Nunca guardes una contraseña en texto plano ni la devuelvas en una respuesta. Usa
los helpers que ya existen:

```ts
import { hashPassword, verifyPassword } from "../lib/password";

const hash = await hashPassword("la-que-escribio-el-usuario");
const correcta = await verifyPassword("intento", usuario.password);
```

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
