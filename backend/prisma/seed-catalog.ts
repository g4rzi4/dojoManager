/**
 * Catálogo de uniformes y protecciones para el dojo de demostración.
 *
 *   DATABASE_URL=".../dojomanager_demo" npx tsx prisma/seed-catalog.ts
 *
 * Los productos y los links de las marcas son reales. Los MODELOS Y PRECIOS
 * SON DE EJEMPLO: se guardan con isExample y la pantalla los marca como tales.
 * Hay que reemplazarlos por los de cada marca antes de usarlo con familias.
 *
 * Es idempotente: se puede correr varias veces sin duplicar nada.
 */

import { prisma } from "../src/lib/prisma";
import { EquipmentCategory } from "../src/generated/prisma/enums";

const MARCAS = [
  { name: "Combat Sports", url: "https://www.combatsports.com.mx/product-category/karate/" },
  { name: "Arawaza", url: "https://arawaza.com.mx/" },
  { name: "Nexus", url: "https://nexus-mexico.com/product-category/karate/" },
  { name: "SMAI", url: "https://smaimexico.com/" },
  { name: "Asiana Tusah", url: "https://www.asianatusah.shop/karate/" },
  { name: "Punok", url: "https://www.punoklatam.com/" },
  { name: "Tokaido", url: "https://tokaidomexico.com/" },
];

const ESTATURAS = ["120", "130", "140", "150", "160", "170", "180", "190"];
const LETRAS = ["XS", "S", "M", "L", "XL"];
const COLORES = ["Rojo", "Azul"];

const { UNIFORME, PROTECCION } = EquipmentCategory;

/** `base` en centavos. `competencia` agrega un segundo modelo, más caro. */
const PRODUCTOS = [
  { name: "Uniforme básico", category: UNIFORME, sizes: ESTATURAS, colors: [], base: 90000, competencia: false },
  { name: "Uniforme de kata", category: UNIFORME, sizes: ESTATURAS, colors: [], base: 240000, competencia: true },
  { name: "Uniforme de kumite", category: UNIFORME, sizes: ESTATURAS, colors: [], base: 220000, competencia: true },
  { name: "Guantes", category: PROTECCION, sizes: LETRAS, colors: COLORES, base: 65000, competencia: false },
  { name: "Espinilleras", category: PROTECCION, sizes: LETRAS, colors: COLORES, base: 75000, competencia: false },
  { name: "Peto hombre", category: PROTECCION, sizes: LETRAS, colors: [], base: 85000, competencia: false },
  { name: "Peto mujer", category: PROTECCION, sizes: LETRAS, colors: [], base: 85000, competencia: false },
  { name: "Bucal", category: PROTECCION, sizes: ["Niño", "Adulto"], colors: [], base: 12000, competencia: false },
  { name: "Casco", category: PROTECCION, sizes: LETRAS, colors: [], base: 140000, competencia: false },
  { name: "Concha", category: PROTECCION, sizes: LETRAS, colors: [], base: 40000, competencia: false },
];

/** Redondea a múltiplos de $50 para que parezcan precios de catálogo. */
function redondear(cents: number): number {
  return Math.round(cents / 5000) * 5000;
}

async function main() {
  const seedNormal = await prisma.user.findUnique({
    where: { email: "admin@dojo.com" },
    select: { id: true },
  });

  if (seedNormal) {
    throw new Error(
      "Esta base tiene los datos del seed normal. El catálogo de ejemplo va en el dojo de demostración."
    );
  }

  const marcas = [];

  for (const { name, url } of MARCAS) {
    marcas.push(
      await prisma.equipmentBrand.upsert({
        where: { name },
        update: { url },
        create: { name, url },
      })
    );
  }

  for (const [orden, p] of PRODUCTOS.entries()) {
    const datos = {
      category: p.category,
      sizes: p.sizes,
      colors: p.colors,
      sortOrder: orden,
    };

    const producto = await prisma.equipmentProduct.upsert({
      where: { name: p.name },
      update: datos,
      create: { name: p.name, ...datos },
    });

    for (const [i, marca] of marcas.entries()) {
      const precioBase = redondear(p.base * (1 + i * 0.07));

      const opciones = [
        { name: "Modelo de ejemplo", priceCents: precioBase },
        ...(p.competencia
          ? [{ name: "Modelo de competencia de ejemplo", priceCents: redondear(precioBase * 1.35) }]
          : []),
      ];

      for (const opcion of opciones) {
        await prisma.equipmentModel.upsert({
          where: {
            productId_brandId_name: {
              productId: producto.id,
              brandId: marca.id,
              name: opcion.name,
            },
          },
          update: { priceCents: opcion.priceCents, isExample: true },
          create: {
            productId: producto.id,
            brandId: marca.id,
            ...opcion,
            isExample: true,
          },
        });
      }
    }
  }

  console.log("Catálogo de ejemplo listo.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
