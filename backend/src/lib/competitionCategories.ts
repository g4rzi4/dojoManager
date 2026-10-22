import { AgeCategory, BeltClass } from "../generated/prisma/enums";

/**
 * Catálogo de categorías de competencia.
 *
 * Las categorías se dividen en tres ejes: rama (femenil o varonil), tipo de
 * cinta (color o negra) y rango de edad. Los rangos NO son los mismos en las
 * dos ramas de cinta, por eso hace falta esta tabla y no basta el enum.
 *
 *   Cintas de color   infantil por pares de edad, juvenil, adultos, masters
 *   Cintas negras     nomenclatura U10, U12, U14, cadete, junior, U21,
 *                     senior y masters
 *
 * Prisma no puede expresar "este enum solo es válido si aquel campo vale X",
 * así que la validación vive aquí y la aplican las rutas.
 */

export type CategoriaInfo = {
  category: AgeCategory;
  /** A qué rama de cinta pertenece. MASTERS existe en las dos. */
  beltClasses: BeltClass[];
  /** Nombre para mostrar, sin la rama ni el rango. */
  label: string;
  /** Edad mínima, inclusive. */
  minAge: number;
  /** Edad máxima, inclusive. Null significa sin tope. */
  maxAge: number | null;
};

export const CATEGORIAS: CategoriaInfo[] = [
  // --- Cintas de color -----------------------------------------------------
  { category: AgeCategory.INFANTIL_4_5, beltClasses: [BeltClass.COLOR], label: "Infantil", minAge: 4, maxAge: 5 },
  { category: AgeCategory.INFANTIL_6_7, beltClasses: [BeltClass.COLOR], label: "Infantil", minAge: 6, maxAge: 7 },
  { category: AgeCategory.INFANTIL_8_9, beltClasses: [BeltClass.COLOR], label: "Infantil", minAge: 8, maxAge: 9 },
  { category: AgeCategory.INFANTIL_10_11, beltClasses: [BeltClass.COLOR], label: "Infantil", minAge: 10, maxAge: 11 },
  { category: AgeCategory.INFANTIL_12_13, beltClasses: [BeltClass.COLOR], label: "Infantil", minAge: 12, maxAge: 13 },
  { category: AgeCategory.JUVENIL_14_15, beltClasses: [BeltClass.COLOR], label: "Juvenil", minAge: 14, maxAge: 15 },
  { category: AgeCategory.JUVENIL_16_17, beltClasses: [BeltClass.COLOR], label: "Juvenil", minAge: 16, maxAge: 17 },
  { category: AgeCategory.ADULTOS_18_35, beltClasses: [BeltClass.COLOR], label: "Adultos", minAge: 18, maxAge: 35 },

  // --- Cintas negras -------------------------------------------------------
  { category: AgeCategory.U10_8_9, beltClasses: [BeltClass.NEGRA], label: "U10", minAge: 8, maxAge: 9 },
  { category: AgeCategory.U12_10_11, beltClasses: [BeltClass.NEGRA], label: "U12", minAge: 10, maxAge: 11 },
  { category: AgeCategory.U14_12_13, beltClasses: [BeltClass.NEGRA], label: "U14", minAge: 12, maxAge: 13 },
  { category: AgeCategory.CADETE_14_15, beltClasses: [BeltClass.NEGRA], label: "Cadete", minAge: 14, maxAge: 15 },
  { category: AgeCategory.JUNIOR_16_17, beltClasses: [BeltClass.NEGRA], label: "Junior", minAge: 16, maxAge: 17 },
  { category: AgeCategory.U21_18_20, beltClasses: [BeltClass.NEGRA], label: "U21", minAge: 18, maxAge: 20 },
  { category: AgeCategory.SENIOR_21_35, beltClasses: [BeltClass.NEGRA], label: "Senior", minAge: 21, maxAge: 35 },

  // --- Común a las dos ramas ----------------------------------------------
  {
    category: AgeCategory.MASTERS_36_MAS,
    beltClasses: [BeltClass.COLOR, BeltClass.NEGRA],
    label: "Masters",
    minAge: 36,
    maxAge: null,
  },
];

const PORevision = new Map(CATEGORIAS.map((c) => [c.category, c]));

export function infoDeCategoria(
  category: AgeCategory
): CategoriaInfo | undefined {
  return PORevision.get(category);
}

/** Rango legible: "8-9 años" o "36 años en adelante". */
export function rangoLegible(info: CategoriaInfo): string {
  return info.maxAge === null
    ? `${info.minAge} años en adelante`
    : `${info.minAge}-${info.maxAge} años`;
}

/** Las categorías válidas para una rama de cinta. */
export function categoriasDe(beltClass: BeltClass): CategoriaInfo[] {
  return CATEGORIAS.filter((c) => c.beltClasses.includes(beltClass));
}

/** ¿Esta categoría existe en esta rama de cinta? */
export function categoriaValida(
  category: AgeCategory,
  beltClass: BeltClass
): boolean {
  return infoDeCategoria(category)?.beltClasses.includes(beltClass) ?? false;
}

/**
 * La categoría que le tocaría por edad.
 *
 * Es solo una SUGERENCIA: inscribir a un alumno en una categoría mayor es un
 * caso legítimo —se le foguea con los grandes— así que esto nunca bloquea,
 * solo propone un valor por omisión.
 *
 * Devuelve undefined si la edad no cae en ningún rango de esa rama; por
 * ejemplo, un niño de 5 años con cinta negra, que en la tabla de negras no
 * tiene categoría porque empiezan en U10.
 */
export function categoriaSugerida(
  edad: number,
  beltClass: BeltClass
): AgeCategory | undefined {
  const encontrada = categoriasDe(beltClass).find(
    (c) => edad >= c.minAge && (c.maxAge === null || edad <= c.maxAge)
  );

  return encontrada?.category;
}
