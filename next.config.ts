import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // TutorPar es una app 100% dinámica (todo depende de la sesión), así que
  // usamos el modelo de renderizado clásico en lugar de Cache Components.
  cacheComponents: false,
  // better-sqlite3 es un módulo nativo: no se empaqueta.
  serverExternalPackages: ["better-sqlite3"],
  experimental: {
    serverActions: {
      // Permite subir el kárdex/constancia (máx. 5 MB) más el overhead multipart.
      bodySizeLimit: "6mb",
    },
  },
  turbopack: {
    // Fija la raíz del proyecto (evita que Turbopack tome un package-lock.json de una carpeta superior).
    root: path.join(__dirname),
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
