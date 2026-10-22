import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";

// Prisma 7 ya no trae un motor nativo: exige un "driver adapter" que use el
// driver de Node correspondiente a la base de datos (aquí, `pg` para PostgreSQL).
// Sin este adapter, `new PrismaClient()` falla al arrancar.

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    "Falta DATABASE_URL. Copia backend/.env.example como backend/.env y configúralo."
  );
}

const adapter = new PrismaPg({ connectionString });

// Un solo PrismaClient para toda la app. `ts-node-dev --respawn` reinicia el
// módulo en cada cambio de archivo, así que lo guardamos en globalThis para no
// abrir un pool de conexiones nuevo en cada recarga y agotar las de PostgreSQL.
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export default prisma;
