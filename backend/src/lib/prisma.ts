import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, type Prisma } from "../generated/prisma/client";
import { dojoActual } from "./dojoContext";

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

/**
 * Cliente SIN filtro de dojo. Solo para lo que ocurre antes de saber el dojo
 * (login, registro, enlaces públicos, webhook) o que abarca a todos (revisar
 * que un correo o una clave no estén usados). Para lo demás, usa `prisma`.
 */
export const prismaGlobal =
  globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prismaGlobal;
}

type FiltroDeDojo = (dojoId: number) => Record<string, unknown>;

const porAlumno: FiltroDeDojo = (dojoId) => ({ student: { dojoId } });

/**
 * A qué dojo pertenece cada tabla.
 *
 * - "dojo": tiene su propia columna dojoId.
 * - Una función: cuelga de una tabla que sí la tiene, y se filtra por ahí.
 * - "global": la comparten todos los dojos. No puede tener datos personales.
 *
 * Es un Record por modelo a propósito: al agregar una tabla, TypeScript no
 * compila hasta decidir aquí a qué dojo pertenece.
 */
const ALCANCE_POR_MODELO: Record<Prisma.ModelName, "dojo" | "global" | FiltroDeDojo> = {
  Dojo: "global",
  EquipmentBrand: "global",
  EquipmentProduct: "global",
  EquipmentModel: "global",

  User: "dojo",
  Student: "dojo",
  Event: "dojo",
  DojoClass: "dojo",

  StudentGuardian: porAlumno,
  BeltPromotion: porAlumno,
  Attendance: porAlumno,
  Payment: porAlumno,
  StudentNote: porAlumno,
  EventEnrollment: porAlumno,
  EquipmentRequest: porAlumno,
  Invitation: (dojoId) => ({ createdBy: { dojoId } }),
  Notification: (dojoId) => ({ user: { dojoId } }),
  PasswordResetToken: (dojoId) => ({ user: { dojoId } }),
  EventModality: (dojoId) => ({ event: { dojoId } }),
  TeacherModalityPrice: (dojoId) => ({ teacher: { dojoId } }),
  EventEnrollmentModality: (dojoId) => ({
    enrollment: { student: { dojoId } },
  }),
  EquipmentRequestItem: (dojoId) => ({ request: { student: { dojoId } } }),
};

type Args = {
  where?: object;
  data?: object | object[];
  create?: object;
};

/**
 * Agrega el filtro de dojo a una operación.
 *
 * Al crear filas hijas no hay nada que agregar: su dojo es el del padre, y las
 * rutas ya obtuvieron ese padre con una consulta filtrada.
 */
function limitarAlDojo(modelo: Prisma.ModelName, operacion: string, args: Args) {
  const alcance = ALCANCE_POR_MODELO[modelo];

  if (alcance === "global") return args;

  const dojoId = dojoActual();
  const conDojoId = (fila: object) => ({ ...fila, dojoId });

  if (operacion === "create" || operacion === "createMany" || operacion === "createManyAndReturn") {
    if (alcance !== "dojo") return args;

    return {
      ...args,
      data: Array.isArray(args.data)
        ? args.data.map(conDojoId)
        : conDojoId(args.data ?? {}),
    };
  }

  const filtro = alcance === "dojo" ? { dojoId } : alcance(dojoId);

  if (operacion === "upsert" && alcance === "dojo") {
    return {
      ...args,
      where: { ...args.where, ...filtro },
      create: conDojoId(args.create ?? {}),
    };
  }

  return { ...args, where: { ...args.where, ...filtro } };
}

/**
 * El cliente que usa toda la app. Filtra cada consulta por el dojo de la
 * petición, incluidas las de dentro de una transacción.
 *
 * El filtro vive aquí y no en cada ruta porque basta olvidarlo una vez para
 * que un dojo vea los alumnos de otro. El `as` conserva los tipos de siempre.
 */
export const prisma = prismaGlobal.$extends({
  query: {
    $allModels: {
      $allOperations({ model, operation, args, query }) {
        return query(limitarAlDojo(model, operation, args as Args) as typeof args);
      },
    },
  },
}) as unknown as PrismaClient;

export default prisma;
