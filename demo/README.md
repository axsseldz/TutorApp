# TutorPar · demo visual

Versión **solo visual** de TutorPar para mostrar la interfaz (por ejemplo, desplegada en Vercel).
Se ve igual que la app principal, pero:

- No tiene base de datos, Prisma, variables de entorno ni autenticación real.
- Los datos (tutores, materias, tarifas, horarios, sesiones, reseñas y notificaciones) son los
  ficticios de `prisma/seed.ts`, copiados en `src/lib/data.ts`. Las fechas se calculan relativas
  al día de hoy, igual que el seed.
- Los formularios no envían ni guardan nada. "Iniciar sesión" y "Crear cuenta" solo marcan la
  sesión como iniciada (en `localStorage`) y entras como el estudiante de ejemplo.
- El pago del checkout lleva a "Mis sesiones" con el aviso "Reserva confirmada (demo)".

No importa nada de la app principal: los componentes y estilos están copiados aquí.

## Desarrollo

```bash
cd demo
npm install
npm run dev      # http://localhost:3000
npm run lint
npm run build
```

## Vercel

Crea un proyecto apuntando a este repositorio con **Root Directory = `demo`**. Framework
"Next.js" (se detecta solo); no hace falta configurar variables de entorno.
