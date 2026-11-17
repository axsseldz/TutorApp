import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: false,
  turbopack: {
    // La demo vive dentro del repo de TutorPar: fija su propia raíz para que
    // Turbopack no tome el package-lock.json de la app principal.
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
