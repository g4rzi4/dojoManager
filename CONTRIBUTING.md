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

```bash
git clone https://github.com/g4rzi4/dojoManager.git
cd dojoManager

# Backend
cd backend
npm install
cp .env.example .env     # edita .env y pon tu usuario de PostgreSQL
npx prisma generate
npx prisma migrate dev
cd ..

# Frontend
cd frontend
npm install
cd ..

# Cámbiate a tu rama
git switch feature/TU_MODULO
```

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
