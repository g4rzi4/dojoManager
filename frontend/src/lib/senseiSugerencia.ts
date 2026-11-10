/**
 * El puente entre el asesor de equipo de Sensei y el formulario de Uniformes
 * y protecciones: Sensei deja aquí lo que recomendó y el formulario lo carga
 * para que la familia lo revise. Se lee una sola vez y se borra.
 */

const CLAVE = "sensei:equipo";

export type SugerenciaDeEquipo = {
  studentId: number;
  items: {
    productId: number;
    modelId: number;
    talla: string | null;
    color: string | null;
  }[];
};

export function guardarSugerencia(sugerencia: SugerenciaDeEquipo): void {
  try {
    sessionStorage.setItem(CLAVE, JSON.stringify(sugerencia));
  } catch {
    // Sin almacenamiento (modo privado): la familia elige a mano, igual que antes.
  }
}

export function tomarSugerencia(): SugerenciaDeEquipo | null {
  try {
    const texto = sessionStorage.getItem(CLAVE);
    sessionStorage.removeItem(CLAVE);

    return texto ? (JSON.parse(texto) as SugerenciaDeEquipo) : null;
  } catch {
    return null;
  }
}
