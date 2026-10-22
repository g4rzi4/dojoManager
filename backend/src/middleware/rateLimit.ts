import type { NextFunction, Request, Response } from "express";

/**
 * Limitador de peticiones sencillo, en memoria.
 *
 * Protege los endpoints que NO exigen token: el login y el formulario de
 * inscripción. Sin esto, alguien podría probar tokens de invitación o
 * contraseñas a miles por minuto.
 *
 * Limitaciones que hay que conocer antes de confiar en esto:
 *
 *  - Guarda el estado en memoria del proceso. Si algún día el backend corre
 *    en varias instancias, cada una llevará su propia cuenta y el límite
 *    real será el multiplicado. Para eso haría falta Redis.
 *  - Se reinicia al reiniciar el servidor.
 *  - Usa la IP, que detrás de un proxy hay que configurar
 *    (`app.set("trust proxy", ...)`) para que no llegue la del proxy.
 *
 * Para un dojo con un solo servidor es suficiente y es muchísimo mejor que
 * no tener nada.
 */

type Registro = {
  conteo: number;
  /** Momento en que se reinicia la ventana. */
  reinicioEn: number;
};

export function rateLimit(opciones: {
  /** Peticiones permitidas por ventana. */
  maximo: number;
  /** Duración de la ventana en segundos. */
  ventanaSegundos: number;
  mensaje?: string;
}) {
  const { maximo, ventanaSegundos } = opciones;
  const mensaje =
    opciones.mensaje ??
    "Demasiados intentos. Espera un momento y vuelve a intentarlo.";

  const registros = new Map<string, Registro>();

  // Limpieza periódica: sin esto el Map crecería sin límite con cada IP
  // nueva, que es una fuga de memoria lenta pero real.
  const limpieza = setInterval(
    () => {
      const ahora = Date.now();
      for (const [clave, registro] of registros) {
        if (registro.reinicioEn <= ahora) registros.delete(clave);
      }
    },
    Math.max(ventanaSegundos, 60) * 1000
  );

  // No impide que el proceso termine si es lo único pendiente.
  limpieza.unref?.();

  return (req: Request, res: Response, next: NextFunction) => {
    const clave = req.ip ?? "desconocida";
    const ahora = Date.now();

    const registro = registros.get(clave);

    if (!registro || registro.reinicioEn <= ahora) {
      registros.set(clave, {
        conteo: 1,
        reinicioEn: ahora + ventanaSegundos * 1000,
      });
      return next();
    }

    registro.conteo += 1;

    if (registro.conteo > maximo) {
      const segundos = Math.ceil((registro.reinicioEn - ahora) / 1000);

      res.setHeader("Retry-After", String(segundos));

      return res.status(429).json({ success: false, message: mensaje });
    }

    next();
  };
}
