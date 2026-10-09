import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  images: {
    remotePatterns: [
      // Fotos de perfil de Google (RN-024: se toman en el primer ingreso).
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      // Fotos subidas por los usuarios al bucket "avatars" (RN-016).
      {
        protocol: "https",
        hostname: new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://invalid.local").hostname,
        pathname: "/storage/v1/object/public/avatars/**",
      },
      // Imágenes de productos del catálogo.
      {
        protocol: "https",
        hostname: new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://invalid.local").hostname,
        pathname: "/storage/v1/object/public/products/**",
      },
    ],
  },
  experimental: {
    // RN-016: la foto puede pesar hasta 1 MB; el límite por defecto de las
    // Server Actions (1 MB) no deja margen para el resto del pedido.
    serverActions: { bodySizeLimit: "2mb" },
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
