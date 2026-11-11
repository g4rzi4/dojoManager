# Despliegue en Render

`render.yaml` describe la app completa: base de datos PostgreSQL, backend y frontend.
Render la crea en un solo paso (*Blueprint*). Todo cabe en el plan gratis.

| Pieza | Nombre en Render | URL |
| --- | --- | --- |
| Base de datos | `dojomanager-db` | interna |
| Backend | `dojomanager-api` | `https://dojomanager-api.onrender.com` |
| Frontend | `dojomanager-web` | `https://dojomanager-web.onrender.com` |

> Si alguno de esos nombres ya está ocupado en Render, la URL real lleva un sufijo
> (por ejemplo `dojomanager-api-x1y2.onrender.com`). En ese caso actualiza
> `CORS_ORIGIN`, `PUBLIC_APP_URL` y `VITE_API_URL` con las URLs reales y vuelve a
> desplegar.

## Pasos

1. Entra a [render.com](https://render.com) con la cuenta de GitHub que tiene acceso a
   este repositorio.
2. **New → Blueprint** → elige el repositorio y la rama `main`.
3. Render te pide las variables marcadas con `sync: false`:

   | Variable | Qué poner |
   | --- | --- |
   | `AGENT_API_KEY` | Una clave larga al azar: `openssl rand -hex 24`. Es la de Zapier. |
   | `ANTHROPIC_API_KEY` | La clave `sk-ant-…` para Sensei. Opcional. |
   | `PAYPAL_*` | Las credenciales del sandbox de PayPal. Opcional. |
   | `SMTP_*` | El servidor de correo para recuperar contraseña. Opcional: sin él, el enlace sale en los logs. |

4. **Apply**. Espera a que los tres servicios queden en verde (el primer despliegue
   tarda unos minutos).
5. Comprueba el backend: `https://dojomanager-api.onrender.com/` debe responder.

Las migraciones corren solas cada vez que el backend arranca.

## Datos iniciales

La base empieza vacía, solo con el dojo creado por las migraciones. Para cargar los
usuarios de ejemplo del seed (`admin@dojo.com`, etc.), abre **dojomanager-api → Shell**
y corre:

```bash
npx prisma db seed
```

Las contraseñas del seed son públicas (están en el repo): cámbialas o no lo uses si la
app va a tener datos reales.

## Zapier

En los dos Zaps, cambia las URLs del túnel por el dominio del backend y el encabezado
`x-api-key` por la `AGENT_API_KEY` nueva:

- `https://dojomanager-api.onrender.com/api/agent/unpaid?dojoId=1`
- `https://dojomanager-api.onrender.com/api/agent/record-reminders?dojoId=1`
- `https://dojomanager-api.onrender.com/api/agent/recovery-stats?dias=30&dojoId=1`

Revisa el `dojoId` real del dojo en la base de producción; con un solo dojo es `1`.

## Limitaciones del plan gratis

- **El backend se duerme** tras 15 minutos sin tráfico y la primera petición tarda
  hasta un minuto en despertarlo. Zapier puede marcar ese intento como fallido; si
  pasa, súbele el tiempo de espera o usa un plan de pago.
- **La base de datos gratis expira a los 30 días.** Para algo más largo, usa un plan de
  pago o una base externa (Neon, Supabase) y pon su URL en `DATABASE_URL`.
