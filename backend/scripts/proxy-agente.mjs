// Proxy para exponer SOLO las rutas del agente (/api/agent/*) a internet.
//
// Zapier corre en la nube y no puede llegar a localhost. Un túnel resuelve eso,
// pero publicaría TODA la API: el login, los alumnos, los pagos. Este proxy se
// pone en medio y solo deja pasar /api/agent/*, que además exige AGENT_API_KEY.
//
//   node scripts/proxy-agente.mjs                    # escucha en el 3099
//   cloudflared tunnel --url http://localhost:3099   # en otra terminal
//
// Variables opcionales: PROXY_PORT (3099) y BACKEND_URL. Sin BACKEND_URL, usa
// el PORT de backend/.env (o 3000, el mismo valor por omisión que el backend),
// así el proxy apunta al backend en cualquier máquina sin configurarlo.

import http from "node:http";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

dotenv.config({
  path: fileURLToPath(new URL("../.env", import.meta.url)),
  quiet: true,
});

const PUERTO = Number(process.env.PROXY_PORT ?? 3099);
const BACKEND = new URL(
  process.env.BACKEND_URL ?? `http://localhost:${process.env.PORT ?? 3000}`
);
const PERMITIDO = /^\/api\/agent\/[a-z-]+(\?.*)?$/;

const servidor = http.createServer((req, res) => {
  if (!req.url || !PERMITIDO.test(req.url)) {
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ success: false, message: "Ruta no encontrada." }));
    return;
  }

  const destino = http.request(
    {
      hostname: BACKEND.hostname,
      port: BACKEND.port,
      path: req.url,
      method: req.method,
      headers: { ...req.headers, host: BACKEND.host },
    },
    (respuesta) => {
      res.writeHead(respuesta.statusCode ?? 502, respuesta.headers);
      respuesta.pipe(res);
    }
  );

  destino.on("error", () => {
    if (!res.headersSent) {
      res.writeHead(502, { "Content-Type": "application/json" });
    }
    res.end(
      JSON.stringify({
        success: false,
        message: "El backend no responde. ¿Está corriendo npm run dev?",
      })
    );
  });

  req.pipe(destino);
});

servidor.listen(PUERTO, () => {
  console.log(
    `Proxy del agente en http://localhost:${PUERTO} -> ${BACKEND.origin} (solo /api/agent/*)`
  );
});
