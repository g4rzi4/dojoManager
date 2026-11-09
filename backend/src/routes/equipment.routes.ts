import { Router } from "express";

import { familyStudentIds } from "../lib/access";
import {
  notifyEquipmentRequested,
  notifyEquipmentUpdated,
} from "../lib/notifications";
import { prisma } from "../lib/prisma";
import { requireAuth, type AuthUser } from "../middleware/auth";
import {
  EquipmentRequestStatus,
  PaymentMethod,
  Role,
} from "../generated/prisma/enums";

const router = Router();

const MAX_RENGLONES = 30;
const PRECIO_MAXIMO_CENTS = 10_000_000;

/** Se elige en lugar de un color cuando se piden los dos juegos. */
const AMBOS_COLORES = "AMBOS";

function esPrecioValido(valor: unknown): valor is number {
  return (
    Number.isInteger(valor) &&
    (valor as number) > 0 &&
    (valor as number) <= PRECIO_MAXIMO_CENTS
  );
}

const incluirSolicitud = {
  items: { orderBy: { id: "asc" as const } },
  student: { select: { firstName: true, lastName: true } },
  teacher: { select: { name: true } },
  requestedBy: { select: { name: true } },
};

/** GET /equipment/catalog — productos con sus modelos activos. */
router.get("/catalog", requireAuth, async (_req, res) => {
  const products = await prisma.equipmentProduct.findMany({
    orderBy: { sortOrder: "asc" },
    include: {
      models: {
        where: { active: true, brand: { active: true } },
        orderBy: [{ brand: { name: "asc" } }, { priceCents: "asc" }],
        include: { brand: true },
      },
    },
  });

  return res.json({
    success: true,
    products: products.map((p) => ({
      id: p.id,
      name: p.name,
      category: p.category,
      sizes: p.sizes,
      colors: p.colors,
      models: p.models.map((m) => ({
        id: m.id,
        name: m.name,
        priceCents: m.priceCents,
        brandName: m.brand.name,
        // El link del modelo, o el de la tienda de la marca.
        url: m.url ?? m.brand.url,
        isExample: m.isExample,
      })),
    })),
  });
});

/**
 * GET /equipment/requests
 *
 * El alcance se decide con el token: la familia ve las de sus alumnos, el
 * profesor las que le tocan a él y el admin todas.
 */
router.get("/requests", requireAuth, async (req, res) => {
  const user = req.user!;

  let where = {};

  if (user.role === Role.PROFESOR) {
    where = { teacherId: user.id };
  } else if (user.role !== Role.ADMIN) {
    where = { studentId: { in: await familyStudentIds(user) } };
  }

  const requests = await prisma.equipmentRequest.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 100,
    include: incluirSolicitud,
  });

  return res.json({
    success: true,
    requests: requests.map((r) => ({
      id: r.id,
      status: r.status,
      amountCents: r.amountCents,
      note: r.note,
      staffNote: r.staffNote,
      method: r.method,
      createdAt: r.createdAt.toISOString(),
      studentName: `${r.student.firstName} ${r.student.lastName}`,
      teacherName: r.teacher?.name ?? null,
      requestedBy: r.requestedBy?.name ?? null,
      items: r.items.map((i) => ({
        id: i.id,
        productName: i.productName,
        brandName: i.brandName,
        modelName: i.modelName,
        size: i.size,
        color: i.color,
        priceCents: i.priceCents,
      })),
    })),
  });
});

type ItemPedido = {
  productId?: unknown;
  modelId?: unknown;
  customBrand?: unknown;
  size?: unknown;
  color?: unknown;
};

/**
 * POST /equipment/requests
 *
 * El precio nunca lo manda el cliente: sale del modelo elegido. Si la marca
 * es "Otra", el renglón queda sin precio hasta que el profesor lo defina.
 */
router.post("/requests", requireAuth, async (req, res) => {
  const propios = await familyStudentIds(req.user!);

  if (propios.length === 0) {
    return res.status(403).json({
      success: false,
      message: "Tu cuenta no tiene alumnos a su cargo.",
    });
  }

  const { studentId, items, note } = req.body ?? {};

  let alumnoId = propios[0];

  if (studentId === undefined || studentId === null) {
    if (propios.length > 1) {
      return res.status(400).json({
        success: false,
        message: "Indica para cuál de tus hijos es la solicitud.",
      });
    }
  } else {
    alumnoId = Number(studentId);

    if (!propios.includes(alumnoId)) {
      return res.status(403).json({
        success: false,
        message: "Ese alumno no está a tu cargo.",
      });
    }
  }

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({
      success: false,
      message: "Elige al menos un producto.",
    });
  }

  if (items.length > MAX_RENGLONES) {
    return res.status(400).json({
      success: false,
      message: "La solicitud tiene demasiados productos.",
    });
  }

  const pedidos = items as ItemPedido[];

  const [productos, modelos] = await Promise.all([
    prisma.equipmentProduct.findMany({
      where: { id: { in: pedidos.map((i) => Number(i.productId)) } },
    }),
    prisma.equipmentModel.findMany({
      where: {
        id: {
          in: pedidos
            .filter((i) => i.modelId !== undefined && i.modelId !== null)
            .map((i) => Number(i.modelId)),
        },
        active: true,
      },
      include: { brand: true },
    }),
  ]);

  const productoPorId = new Map(productos.map((p) => [p.id, p]));
  const modeloPorId = new Map(modelos.map((m) => [m.id, m]));

  const renglones = [];

  for (const pedido of pedidos) {
    const producto = productoPorId.get(Number(pedido.productId));

    if (!producto) {
      return res.status(400).json({
        success: false,
        message: "Uno de los productos ya no existe.",
      });
    }

    if (typeof pedido.size !== "string" || !producto.sizes.includes(pedido.size)) {
      return res.status(400).json({
        success: false,
        message: `Elige una talla válida para ${producto.name}.`,
      });
    }

    const modelo = modeloPorId.get(Number(pedido.modelId));
    const marcaLibre =
      typeof pedido.customBrand === "string" ? pedido.customBrand.trim() : "";

    if (modelo && modelo.productId !== producto.id) {
      return res.status(400).json({
        success: false,
        message: `Ese modelo no corresponde a ${producto.name}.`,
      });
    }

    if (!modelo && (marcaLibre.length === 0 || marcaLibre.length > 60)) {
      return res.status(400).json({
        success: false,
        message: `Elige una marca para ${producto.name}.`,
      });
    }

    // "Ambos colores" son dos juegos, y por eso dos renglones con su precio.
    let colores: (string | null)[] = [null];

    if (producto.colors.length > 0) {
      if (pedido.color === AMBOS_COLORES && producto.colors.length > 1) {
        colores = producto.colors;
      } else if (
        typeof pedido.color === "string" &&
        producto.colors.includes(pedido.color)
      ) {
        colores = [pedido.color];
      } else {
        return res.status(400).json({
          success: false,
          message: `Elige un color para ${producto.name}.`,
        });
      }
    }

    for (const color of colores) {
      renglones.push({
        productId: producto.id,
        modelId: modelo?.id ?? null,
        productName: producto.name,
        brandName: modelo?.brand.name ?? marcaLibre,
        modelName: modelo?.name ?? null,
        size: pedido.size,
        color,
        priceCents: modelo?.priceCents ?? null,
      });
    }
  }

  const alumno = await prisma.student.findUnique({
    where: { id: alumnoId },
    select: { teacherId: true, firstName: true, lastName: true },
  });

  if (!alumno) {
    return res.status(404).json({
      success: false,
      message: "No existe ese alumno.",
    });
  }

  const conPrecio = renglones.every((r) => r.priceCents !== null);

  const solicitud = await prisma.equipmentRequest.create({
    data: {
      studentId: alumnoId,
      requestedById: req.user!.id,
      teacherId: alumno.teacherId,
      amountCents: conPrecio
        ? renglones.reduce((suma, r) => suma + (r.priceCents ?? 0), 0)
        : null,
      note: typeof note === "string" ? note.trim().slice(0, 500) || null : null,
      items: { create: renglones },
    },
    select: { id: true },
  });

  try {
    await notifyEquipmentRequested(
      solicitud.id,
      alumno.teacherId,
      `${alumno.firstName} ${alumno.lastName}`,
      renglones.length
    );
  } catch (error) {
    console.error("[equipo] no se pudo notificar la solicitud", error);
  }

  return res.status(201).json({
    success: true,
    id: solicitud.id,
    message: "Listo. Le avisamos a tu profesor.",
  });
});

function puedeGestionar(user: AuthUser, teacherId: number | null): boolean {
  return (
    user.role === Role.ADMIN ||
    (user.role === Role.PROFESOR && teacherId === user.id)
  );
}

/**
 * PATCH /equipment/requests/:id  { accion, ... }
 *
 * Avanza la solicitud. Cada acción exige un estado de partida, y el cambio
 * se condiciona a él: dos clics simultáneos no pueden aplicarlo dos veces.
 */
router.patch("/requests/:id", requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  const { accion, prices, method, staffNote } = req.body ?? {};

  if (!Number.isInteger(id) || id < 1) {
    return res.status(400).json({
      success: false,
      message: "La solicitud indicada no es válida.",
    });
  }

  const solicitud = await prisma.equipmentRequest.findUnique({
    where: { id },
    include: { items: true },
  });

  if (!solicitud) {
    return res.status(404).json({
      success: false,
      message: "No existe esa solicitud.",
    });
  }

  if (!puedeGestionar(req.user!, solicitud.teacherId)) {
    return res.status(403).json({
      success: false,
      message: "Esa solicitud no te corresponde.",
    });
  }

  const nota =
    typeof staffNote === "string" ? staffNote.trim().slice(0, 500) || null : null;

  const yaCambio = {
    success: false,
    message: "La solicitud cambió de estado. Recarga para ver cómo quedó.",
  };

  if (accion === "confirmar") {
    const ajustes = new Map<number, unknown>(
      (Array.isArray(prices) ? prices : []).map(
        (p: { itemId: number; priceCents: unknown }) => [
          Number(p.itemId),
          p.priceCents,
        ]
      )
    );

    const finales = solicitud.items.map((item) => ({
      item,
      precio: ajustes.get(item.id) ?? item.priceCents,
    }));

    const sinPrecio = finales.find((f) => !esPrecioValido(f.precio));

    if (sinPrecio) {
      return res.status(400).json({
        success: false,
        message: `Indica un precio válido para ${sinPrecio.item.productName}.`,
      });
    }

    const total = finales.reduce((suma, f) => suma + (f.precio as number), 0);

    const aplicado = await prisma.$transaction(async (tx) => {
      const { count } = await tx.equipmentRequest.updateMany({
        where: { id, status: EquipmentRequestStatus.SOLICITADO },
        data: {
          status: EquipmentRequestStatus.CONFIRMADO,
          amountCents: total,
          confirmedAt: new Date(),
          staffNote: nota,
        },
      });

      if (count === 1) {
        for (const { item, precio } of finales) {
          await tx.equipmentRequestItem.update({
            where: { id: item.id },
            data: { priceCents: precio as number },
          });
        }
      }

      return count === 1;
    });

    if (!aplicado) return res.status(409).json(yaCambio);

    await avisarFamilia(id, solicitud.studentId, "CONFIRMADO", total);

    return res.json({ success: true, message: "Solicitud confirmada." });
  }

  if (accion === "rechazar") {
    const { count } = await prisma.equipmentRequest.updateMany({
      where: {
        id,
        status: {
          in: [
            EquipmentRequestStatus.SOLICITADO,
            EquipmentRequestStatus.CONFIRMADO,
          ],
        },
      },
      data: { status: EquipmentRequestStatus.RECHAZADO, staffNote: nota },
    });

    if (count === 0) return res.status(409).json(yaCambio);

    await avisarFamilia(id, solicitud.studentId, "RECHAZADO", null);

    return res.json({ success: true, message: "Solicitud rechazada." });
  }

  if (accion === "pagado") {
    if (method !== PaymentMethod.EFECTIVO && method !== PaymentMethod.TRANSFERENCIA) {
      return res.status(400).json({
        success: false,
        message: "Indica si pagó en efectivo o por transferencia.",
      });
    }

    const { count } = await prisma.equipmentRequest.updateMany({
      where: { id, status: EquipmentRequestStatus.CONFIRMADO },
      data: {
        status: EquipmentRequestStatus.PAGADO,
        method,
        paidAt: new Date(),
      },
    });

    if (count === 0) return res.status(409).json(yaCambio);

    await avisarFamilia(id, solicitud.studentId, "PAGADO", solicitud.amountCents);

    return res.json({ success: true, message: "Pago registrado." });
  }

  if (accion === "entregado") {
    const { count } = await prisma.equipmentRequest.updateMany({
      where: { id, status: EquipmentRequestStatus.PAGADO },
      data: {
        status: EquipmentRequestStatus.ENTREGADO,
        deliveredAt: new Date(),
      },
    });

    if (count === 0) return res.status(409).json(yaCambio);

    await avisarFamilia(id, solicitud.studentId, "ENTREGADO", null);

    return res.json({ success: true, message: "Marcada como entregada." });
  }

  return res.status(400).json({
    success: false,
    message: "Esa acción no existe.",
  });
});

async function avisarFamilia(
  id: number,
  studentId: number,
  estado: "CONFIRMADO" | "RECHAZADO" | "PAGADO" | "ENTREGADO",
  amountCents: number | null
) {
  try {
    await notifyEquipmentUpdated(id, studentId, estado, amountCents);
  } catch (error) {
    console.error("[equipo] no se pudo notificar el cambio", error);
  }
}

export default router;
