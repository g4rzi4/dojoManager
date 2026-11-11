import { Router } from "express";

import { hashPassword } from "../lib/password";
import { MIN_PASSWORD } from "../lib/passwordReset";
import { prismaGlobal } from "../lib/prisma";
import { requireAuth, requirePermission } from "../middleware/auth";
import { Role } from "../generated/prisma/enums";

/**
 * Administración de la plataforma: dojos y sus administradores.
 *
 * El superadministrador solo puede hacer esto: sin los permisos de un dojo,
 * no ve los alumnos ni los pagos de ninguno. Usa prismaGlobal porque estas
 * operaciones abarcan a todos los dojos.
 */
const router = Router();

type DatosAdmin =
  | { ok: true; nombre: string; correo: string; password: string }
  | { ok: false; message: string };

function validarAdmin(body: Record<string, unknown>): DatosAdmin {
  const nombre = typeof body.adminName === "string" ? body.adminName.trim() : "";
  const correo =
    typeof body.adminEmail === "string"
      ? body.adminEmail.trim().toLowerCase()
      : "";
  const password = body.adminPassword;

  if (nombre.length < 2 || nombre.length > 80) {
    return { ok: false, message: "Escribe el nombre del administrador." };
  }

  if (!/^[^\s@]+@[^\s@]+$/.test(correo)) {
    return { ok: false, message: "El correo electrónico no es válido." };
  }

  if (typeof password !== "string" || password.length < MIN_PASSWORD) {
    return {
      ok: false,
      message: "La contraseña debe tener al menos 8 caracteres.",
    };
  }

  return { ok: true, nombre, correo, password };
}

/**
 * POST /platform/dojos — un dojo vacío con su primer administrador.
 */
router.post("/dojos", requireAuth, requirePermission("platform:manage"), async (req, res) => {
  const body = req.body ?? {};
  const nombreDojo = typeof body.dojoName === "string" ? body.dojoName.trim() : "";

  if (nombreDojo.length < 2 || nombreDojo.length > 80) {
    return res.status(400).json({
      success: false,
      message: "Escribe el nombre del dojo.",
    });
  }

  const datos = validarAdmin(body);

  if (!datos.ok) {
    return res.status(400).json({ success: false, message: datos.message });
  }

  const hash = await hashPassword(datos.password);

  // Juntos o nada: un correo repetido no debe dejar un dojo sin administrador.
  const dojo = await prismaGlobal.$transaction(async (tx) => {
    const creado = await tx.dojo.create({ data: { name: nombreDojo } });

    await tx.user.create({
      data: {
        dojoId: creado.id,
        name: datos.nombre,
        email: datos.correo,
        password: hash,
        role: Role.ADMIN,
      },
    });

    return creado;
  });

  return res.status(201).json({ success: true, dojoId: dojo.id });
});

router.use(requireAuth, requirePermission("platform:manage"));

/** GET /platform/dojos — los dojos, con sus administradores. */
router.get("/dojos", async (_req, res) => {
  const dojos = await prismaGlobal.dojo.findMany({
    where: { isPlatform: false },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      createdAt: true,
      _count: { select: { students: true } },
      users: {
        where: { role: Role.ADMIN },
        orderBy: { createdAt: "asc" },
        select: { id: true, name: true, email: true, active: true },
      },
    },
  });

  return res.json({
    success: true,
    dojos: dojos.map(({ _count, users, ...dojo }) => ({
      ...dojo,
      createdAt: dojo.createdAt.toISOString(),
      students: _count.students,
      admins: users,
    })),
  });
});

/** POST /platform/dojos/:id/admins — otro administrador para un dojo. */
router.post("/dojos/:id/admins", async (req, res) => {
  const dojo = await prismaGlobal.dojo.findFirst({
    where: { id: Number(req.params.id) || 0, isPlatform: false },
    select: { id: true },
  });

  if (!dojo) {
    return res.status(404).json({
      success: false,
      message: "No existe ese dojo.",
    });
  }

  const datos = validarAdmin(req.body ?? {});

  if (!datos.ok) {
    return res.status(400).json({ success: false, message: datos.message });
  }

  await prismaGlobal.user.create({
    data: {
      dojoId: dojo.id,
      name: datos.nombre,
      email: datos.correo,
      password: await hashPassword(datos.password),
      role: Role.ADMIN,
    },
  });

  return res.status(201).json({ success: true });
});

/**
 * DELETE /platform/dojos/:id  { confirmName }
 *
 * Borra el dojo con TODO lo suyo: cuentas, alumnos, eventos y clases, y en
 * cascada asistencia, pagos, graduaciones, notificaciones, solicitudes de
 * equipo e invitaciones. No se puede deshacer, así que hay que mandar el
 * nombre exacto del dojo como confirmación, también desde la API. El
 * catálogo de equipo es de la plataforma y no se toca.
 */
router.delete("/dojos/:id", async (req, res) => {
  const dojo = await prismaGlobal.dojo.findFirst({
    where: { id: Number(req.params.id) || 0, isPlatform: false },
    select: { id: true, name: true },
  });

  if (!dojo) {
    return res.status(404).json({
      success: false,
      message: "No existe ese dojo.",
    });
  }

  const confirmacion =
    typeof req.body?.confirmName === "string" ? req.body.confirmName.trim() : "";

  if (confirmacion !== dojo.name.trim()) {
    return res.status(400).json({
      success: false,
      message: "Escribe el nombre exacto del dojo para confirmar.",
    });
  }

  // Las cuatro tablas que apuntan al dojo no se borran solas con él; lo que
  // cuelga de ellas sí (Cascade o SetNull). Todo o nada.
  const borrado = await prismaGlobal.$transaction(async (tx) => {
    const filtro = { where: { dojoId: dojo.id } };
    const alumnos = await tx.student.deleteMany(filtro);
    const eventos = await tx.event.deleteMany(filtro);
    const clases = await tx.dojoClass.deleteMany(filtro);
    const usuarios = await tx.user.deleteMany(filtro);
    await tx.dojo.delete({ where: { id: dojo.id } });

    return {
      alumnos: alumnos.count,
      eventos: eventos.count,
      clases: clases.count,
      usuarios: usuarios.count,
    };
  });

  console.log(`[platform] dojo ${dojo.id} eliminado`, borrado);

  return res.json({ success: true, borrado });
});

export default router;
