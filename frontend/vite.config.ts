import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],

  server: {
    /**
     * Escucha en todas las interfaces de red, no solo en localhost.
     *
     * Sin esto, un celular en la misma wifi no puede abrir la app aunque use
     * la IP correcta: el servidor rechaza cualquier conexión que no venga de
     * la propia computadora. Es lo que hace falta para que funcione un QR.
     *
     * Al arrancar, vite imprime la dirección de red que hay que usar.
     */
    host: true,
  },
});
