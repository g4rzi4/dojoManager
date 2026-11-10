import express, { type NextFunction, type Request, type Response } from "express";
import cors from "cors";

import { config } from "./config";
import authRoutes from "./routes/auth.routes";
import platformRoutes from "./routes/platform.routes";
import studentRoutes from "./routes/students.routes";
import notificationRoutes from "./routes/notifications.routes";
import paymentRoutes from "./routes/payments.routes";
import eventRoutes from "./routes/events.routes";
import teacherRoutes from "./routes/teachers.routes";
import guardianRoutes from "./routes/guardians.routes";
import invitationRoutes from "./routes/invitations.routes";
import paypalRoutes from "./routes/paypal.routes";
import equipmentRoutes from "./routes/equipment.routes";
import classRoutes from "./routes/classes.routes";
import attendanceRoutes from "./routes/attendance.routes";
import agentRoutes from "./routes/agent.routes";
import senseiRoutes from "./routes/sensei.routes";

const app = express();

// Antes aquí había cors() abierto a cualquier origen. En desarrollo da igual,
// pero en producción permitiría que cualquier sitio llamara a la API con la
// sesión de quien lo visite.
//
// Acepta una lista: en desarrollo hacen falta localhost (para trabajar en la
// computadora) y la IP de red local (para abrir la app desde el celular al
// escanear un QR).
app.use(cors({ origin: config.corsOrigins }));
app.use(
  express.json({
    // El webhook de PayPal se verifica contra el cuerpo exacto que llegó.
    verify: (req, _res, buffer) => {
      if (req.url === "/paypal/webhook") {
        (req as typeof req & { rawBody?: Buffer }).rawBody = buffer;
      }
    },
  })
);

app.get("/", (_req, res) => {
  res.json({
    message: "Backend funcionando 🚀",
  });
});

app.use("/auth", authRoutes);
app.use("/platform", platformRoutes);
app.use("/students", studentRoutes);
app.use("/notifications", notificationRoutes);
app.use("/payments", paymentRoutes);
app.use("/events", eventRoutes);
app.use("/teachers", teacherRoutes);
app.use("/guardians", guardianRoutes);
app.use("/invitations", invitationRoutes);
app.use("/paypal", paypalRoutes);
app.use("/equipment", equipmentRoutes);
app.use("/classes", classRoutes);
app.use("/attendance", attendanceRoutes);
app.use("/sensei", senseiRoutes);
app.use("/api/agent", agentRoutes);
app.use("/agent", agentRoutes);

// Ruta no encontrada
app.use((_req, res) => {
  res.status(404).json({ success: false, message: "Ruta no encontrada." });
});

/**
 * Manejador de errores. Express 5 reenvía aquí las promesas rechazadas de los
 * handlers async, así que un fallo de base de datos no tira el proceso.
 *
 * No devolvemos el detalle del error al cliente: podría incluir la consulta
 * SQL o la cadena de conexión. Al log sí va completo.
 */
app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
  // El correo es único entre todos los dojos, pero las rutas solo ven el suyo:
  // si ya lo usa una cuenta de otro dojo, se entera hasta la base de datos.
  if (
    (error as { code?: string })?.code === "P2002" &&
    JSON.stringify((error as { meta?: unknown }).meta ?? "").includes("email")
  ) {
    return res.status(409).json({
      success: false,
      message: "Ya existe una cuenta con ese correo.",
    });
  }

  // Lo que una ruta intenta cambiar y no existe, o es de otro dojo.
  if ((error as { code?: string })?.code === "P2025") {
    return res.status(404).json({
      success: false,
      message: "No se encontró ese registro.",
    });
  }

  console.error("[error no manejado]", error);

  res.status(500).json({
    success: false,
    message: "Ocurrió un error en el servidor.",
  });
});

export default app;
