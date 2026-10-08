"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";

// RN-073: sigue el modo del sistema por defecto; la elección del usuario se
// guarda en su navegador. Usa la clase .dark que ya usa shadcn.
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      // React 19 avisa en desarrollo si un componente renderiza <script> en el
      // cliente. En el cliente el script queda como text/plain y no se ejecuta;
      // ya corrió desde el HTML del servidor (guía de Next:
      // preventing-flash-before-hydration).
      scriptProps={{
        type: typeof window === "undefined" ? "text/javascript" : "text/plain",
      }}
    >
      {children}
    </NextThemesProvider>
  );
}
