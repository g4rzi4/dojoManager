/**
 * Copia texto al portapapeles.
 *
 * `navigator.clipboard` solo existe en https y en localhost. Abierta desde la
 * IP de la red local (http://192.168.x.x), la app no lo tiene, así que se usa
 * el método clásico: un textarea fuera de pantalla y `execCommand("copy")`.
 * Llámala dentro del clic del usuario, que es cuando el navegador lo permite.
 *
 * Lanza un error si ninguno de los dos funcionó.
 */
export async function copiarTexto(texto: string): Promise<void> {
  if (window.isSecureContext && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(texto);
      return;
    } catch {
      // Sin permiso: se intenta el método clásico.
    }
  }

  const area = document.createElement("textarea");
  area.value = texto;
  area.setAttribute("readonly", "");
  area.style.position = "fixed";
  area.style.top = "-1000px";
  area.style.opacity = "0";
  document.body.appendChild(area);

  const anterior = document.activeElement as HTMLElement | null;
  area.select();
  area.setSelectionRange(0, texto.length);

  let ok: boolean;
  try {
    ok = document.execCommand("copy");
  } catch {
    ok = false;
  } finally {
    area.remove();
    anterior?.focus?.();
  }

  if (!ok) throw new Error("No se pudo copiar.");
}
