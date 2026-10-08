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
    >
      {children}
    </NextThemesProvider>
  );
}
