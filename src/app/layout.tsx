import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { PaletteStyle } from "@/components/palette-style";
import { SiteHeader } from "@/components/site-header";
import { ThemeProvider } from "@/components/theme-provider";
import { DEFAULT_PALETTES } from "@/modules/apariencia/paleta";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Nutrición animal",
  description: "Comida natural para mascotas, con dietas de nutricionistas.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // next-themes agrega la clase .dark en el cliente: sin
    // suppressHydrationWarning React avisaría que la clase no coincide.
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        {/* RN-074: paleta base hasta que exista la tabla (plan, Task 7). */}
        <PaletteStyle palettes={DEFAULT_PALETTES} />
      </head>
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <ThemeProvider>
          <SiteHeader />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
