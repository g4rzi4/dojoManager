import express, { type NextFunction, type Request, type Response } from "express";
import cors from "cors";

import { config } from "./config";
import authRoutes from "./routes/auth.routes";
import studentRoutes from "./routes/students.routes";
import notificationRoutes from "./routes/notifications.routes";
import paymentRoutes from "./routes/payments.routes";
import eventRoutes from "./routes/events.routes";
import teacherRoutes from "./routes/teachers.routes";
import guardianRoutes from "./routes/guardians.routes";
import invitationRoutes from "./routes/invitations.routes";

const app = express();

// Antes aquí había cors() abierto a cualquier origen. En desarrollo da igual,
// pero en producción permitiría que cualquier sitio llamara a la API con la
// sesión de quien lo visite.
app.use(cors({ origin: config.corsOrigin }));
app.use(express.json());

app.get("/", (_req, res) => {
  res.json({
    message: "Backend funcionando 🚀",
  });
});

app.use("/auth", authRoutes);
app.use("/students", studentRoutes);
app.use("/notifications", notificationRoutes);
app.use("/payments", paymentRoutes);
app.use("/events", eventRoutes);
app.use("/teachers", teacherRoutes);
app.use("/guardians", guardianRoutes);
app.use("/invitations", invitationRoutes);

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
  console.error("[error no manejado]", error);

  res.status(500).json({
    success: false,
    message: "Ocurrió un error en el servidor.",
  });
});

export default app;
