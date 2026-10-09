import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Suspense } from "react";
import { AccountGate } from "@/components/account-gate";
import { AccountNotice } from "@/components/account-notice";
import { PaletteStyle } from "@/components/palette-style";
import { SignInError } from "@/components/sign-in-error";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { ThemeProvider } from "@/components/theme-provider";
import { getPalettes } from "@/modules/apariencia/repositorio";
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

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const palettes = await getPalettes();
  return (
    // next-themes agrega la clase .dark en el cliente: sin
    // suppressHydrationWarning React avisaría que la clase no coincide.
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        {/* RN-070: paleta guardada; si la base falla, la base (RN-074). */}
        <PaletteStyle palettes={palettes} />
      </head>
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <ThemeProvider>
          <SiteHeader />
          <Suspense fallback={null}>
            <SignInError />
          </Suspense>
          <Suspense fallback={null}>
            <AccountNotice />
          </Suspense>
          {/* RN-046: una cuenta suspendida no ve ninguna página. */}
          <Suspense fallback={null}>
            <AccountGate>{children}</AccountGate>
          </Suspense>
          <SiteFooter />
        </ThemeProvider>
      </body>
    </html>
  );
}
