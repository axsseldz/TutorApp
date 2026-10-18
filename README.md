# TutorPar · v1

Plataforma de **tutorías entre pares** para la UABC Ensenada. Conecta a estudiantes de primeros semestres de ciencias e ingeniería con estudiantes avanzados **verificados** (kárdex o constancia revisados por un administrador) que dan tutorías presenciales en el campus o en línea.

Modelo de negocio: marketplace con **15% de comisión** por sesión (constante `COMMISSION_RATE` en `src/lib/config.ts`). Los pagos de la v1 son **simulados**.

## Requisitos

- Node.js **20.19 o superior** (probado con Node 24.20 y npm 11.19)
- No necesitas instalar una base de datos: se usa SQLite en un archivo local.

## Instalación

```bash
npm install                 # instala dependencias y genera el cliente de Prisma (postinstall)
cp .env.example .env        # y cambia SESSION_SECRET por un valor aleatorio largo
npm run db:setup            # aplica las migraciones y carga los datos de ejemplo
npm run dev                 # http://localhost:3000
```

Para generar un `SESSION_SECRET`:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

> Si tu versión de npm muestra avisos de `install-scripts`, el `package.json` ya incluye `allowScripts` para `better-sqlite3`, `prisma` y `esbuild`, que necesitan sus scripts de instalación.

### Scripts útiles

| Comando | Qué hace |
| --- | --- |
| `npm run dev` | Servidor de desarrollo |
| `npm run build` / `npm start` | Build y servidor de producción |
| `npm run lint` | ESLint |
| `npm run typecheck` | Verificación de tipos con TypeScript |
| `npm run db:setup` | Aplica migraciones (`migrate deploy`) y corre el seed. Úsalo la primera vez |
| `npm run db:seed` | Borra todos los datos y vuelve a cargar los de ejemplo |
| `npm run db:reset` | Borra la base, reaplica migraciones y corre el seed |
| `npm run db:migrate` | Crea/aplica migraciones nuevas después de cambiar `prisma/schema.prisma` |
| `npm run db:studio` | Abre Prisma Studio para ver la base |
| `npm run test:e2e` | Prueba de extremo a extremo con Playwright (ver abajo) |

## Cuentas de prueba

| Rol | Correo | Contraseña |
| --- | --- | --- |
| Admin | `admin@uabc.edu.mx` | `Admin123!` |
| Estudiante | `estudiante@uabc.edu.mx` (Juan Pablo Ortega) | `Estudiante123!` |
| Estudiante | `valeria.gomez@uabc.edu.mx` | `Estudiante123!` |
| Estudiante con solicitud de tutor **pendiente** | `kevin.lopez@uabc.edu.mx` | `Estudiante123!` |
| Tutora (Cálculo Dif./Int., Álgebra Lineal, $180/h) | `maria.castro@uabc.edu.mx` | `Tutor123!` |
| Tutor (Física, Cálculo Dif., $150/h) | `diego.ramirez@uabc.edu.mx` | `Tutor123!` |
| Tutora (Probabilidad y Est., Álgebra Lineal, $160/h) | `ana.torres@uabc.edu.mx` | `Tutor123!` |
| Tutor (Programación, Cálculo Int., $200/h) | `luis.mendez@uabc.edu.mx` | `Tutor123!` |

El seed crea además 36 bloques de disponibilidad, 19 sesiones (14 completadas, 3 pagadas, 2 canceladas), 12 reseñas y notificaciones de ejemplo. Las fechas son relativas al día en que corres el seed, así que siempre hay bloques futuros.

**Pago simulado:** en el checkout ya viene capturada la tarjeta `4242 4242 4242 4242`. Cualquier número de 16 dígitos funciona y no se hace ningún cargo.

## Cómo probar el flujo completo a mano

1. Regístrate con un correo `@uabc.edu.mx` (otro dominio da error).
2. En **Mi perfil → Ser tutor**, elige materias y tarifa y sube un PDF o una imagen.
3. Entra como admin → **Administración → Solicitudes** → abre el documento → **Aprobar**.
4. Vuelve a entrar con tu cuenta: ya eres tutor y tienes una notificación. En **Panel tutor** publica un bloque.
5. Entra como `estudiante@uabc.edu.mx` → **Buscar tutores** → filtra por materia → abre tu perfil → **Reservar** → paga.
6. Como tutor, en **Mis sesiones → Como tutor**, marca la sesión como completada cuando ya haya empezado. Si no la marcas, se completa sola al pasar la hora de fin.
7. Como estudiante → **Dejar reseña**.
8. Como tutor → **Ganancias**.

### Prueba automatizada (Playwright)

`e2e/flujo-completo.spec.ts` recorre ese flujo y además prueba el dominio @uabc, que un archivo no permitido se rechace, los traslapes, que un tutor no pueda reservarse a sí mismo, la regla de 24 h, que el bloque se libere al cancelar, el rechazo con motivo, que no se pueda reseñar dos veces y la completación automática.

```bash
npx playwright install chromium   # solo la primera vez
npm run db:seed                   # la prueba espera los datos del seed
npm run test:e2e                  # usa el servidor de :3000 o levanta uno; tarda ~2 min
```

Tarda unos 2 minutos porque espera a que empiece un bloque real para poder marcarlo como completado.

## Decisiones tomadas

- **Next.js 16.4 con App Router, Server Components y Server Actions.** Las mutaciones son Server Actions en `src/actions/`. La única Route Handler sirve los documentos de verificación.
- **`cacheComponents` desactivado.** Next 16.4 lo trae activado por defecto, pero TutorPar es 100% dinámica (todo depende de la sesión), así que se usa el modelo clásico de renderizado dinámico, que es más simple.
- **Prisma 7 con el adaptador `better-sqlite3`.** Prisma 7 ya no trae motor en Rust y pide un *driver adapter*. El cliente se genera en `src/generated/prisma` (está ignorado en git y se regenera en `postinstall`). Se usó la versión estable 7.10.1, no la 8 en *release candidate*.
- **Sesión propia en lugar de Auth.js.** Es un JWT HS256 firmado con `jose` en una cookie `httpOnly` y `sameSite=lax`, con duración de 7 días. Solo guarda el id del usuario; **el rol se lee siempre de la base**, así que la aprobación como tutor aplica al instante sin volver a iniciar sesión. Las contraseñas se guardan con **bcrypt** (`bcryptjs`, implementación en JS puro para evitar compilar código nativo), con costo 10.
- **Protección de rutas en dos capas.** `src/proxy.ts` (el antiguo *middleware*) redirige al login si no hay cookie válida. La autorización real por rol está en el servidor con `requireUser` y `requireRole`: en los layouts, en cada página y en cada Server Action. La interfaz solo muestra los enlaces que corresponden al rol.
- **Dinero en centavos (enteros).** Cada pago guarda el monto total, la tasa aplicada, la comisión y lo que recibe el tutor, para que un cambio futuro de comisión no altere el historial.
- **Precio = tarifa por hora × duración del bloque**, calculado al momento de reservar. Si el tutor cambia su tarifa, solo afecta reservas nuevas.
- **La sesión copia los datos del bloque** (horario, modalidad, lugar o enlace) para conservar el historial aunque el bloque se borre después.
- **Un bloque puede reservarse de nuevo tras una cancelación.** Por eso la relación sesión → bloque no es única y se usa la bandera `isBooked`. La reserva hace un `updateMany ... where isBooked = false` dentro de una transacción para evitar dobles reservas.
- **Completado automático "perezoso".** No hay cron. `completeExpiredSessions()` pasa a COMPLETADA las sesiones PAGADA cuya hora de fin ya pasó, cada vez que se cargan Mis sesiones, Panel tutor, Ganancias, Administración o la página de reseña. El tutor también puede marcarla a mano, pero solo cuando la sesión ya empezó.
- **Reglas de cancelación.** El estudiante puede cancelar hasta 24 h antes. El tutor puede cancelar en cualquier momento antes de que empiece. En ambos casos el pago se marca REEMBOLSADO y el bloque vuelve a estar libre.
- **Reglas adicionales razonables:**
  - bloques de 30 min a 4 h y hasta 90 días adelante;
  - tarifa entre $50 y $1,000 MXN;
  - hasta 6 materias por tutor;
  - un estudiante no puede tener dos sesiones pagadas que se traslapen;
  - los administradores no pueden reservar ni ser tutores;
  - solo puede haber una solicitud pendiente a la vez; si te rechazan, puedes volver a solicitar.
- **Enlaces de videollamada:** solo se aceptan Google Meet, Zoom o Teams, y el enlace se muestra únicamente al estudiante que reservó.
- **Documentos:** PDF, JPG, PNG o WEBP de máximo 5 MB. El tipo se valida por la firma binaria del archivo, no solo por la extensión. Se guardan en `/uploads` (fuera de `public/`) y se sirven solo al admin y al propio solicitante en `/api/documentos/[id]`.
- **Zona horaria:** todo se guarda en UTC y se muestra en `America/Tijuana`, sin importar la zona del servidor o del navegador.
- **Notificaciones extra:** además de las pedidas, hay una de "sesión completada" que invita al estudiante a dejar reseña.
- **Mensajes tras una acción.** Después de enviar una solicitud, aprobar o rechazar, o cancelar, se redirige con un parámetro en la URL (`?cancelada=…`) para mostrar el aviso. Así el mensaje no se pierde cuando la tarjeta desaparece de la lista.

## Qué quedó fuera de la v1

- Pagos reales (Stripe, Mercado Pago, Conekta) y pago de las ganancias a los tutores
- Correos electrónicos: verificación de cuenta, recuperación de contraseña y avisos
- Cambio de contraseña desde el perfil y foto de perfil
- Chat entre estudiante y tutor
- Reprogramar sesiones (hoy hay que cancelar y volver a reservar)
- Bloques recurrentes ("todos los martes de 4 a 5")
- Gestión de materias desde el admin, y suspender o cambiar el rol de usuarios
- Reportes o moderación de reseñas, y respuesta del tutor a una reseña
- Cron o job para completar sesiones (hoy es perezoso) y recordatorios antes de la sesión
- Despliegue en producción: SQLite y `/uploads` locales no sirven en plataformas *serverless*

## Estructura

```
prisma/            esquema, migraciones y seed
src/proxy.ts       verificación optimista de sesión por ruta
src/lib/           configuración, auth, base de datos, validación, fechas, dinero y reglas de sesión
src/actions/       Server Actions (todas las mutaciones)
src/app/           páginas (App Router) y /api/documentos/[id]
src/components/    UI compartida y formularios cliente
e2e/               prueba Playwright del flujo completo
uploads/           documentos subidos (ignorado en git)
```
