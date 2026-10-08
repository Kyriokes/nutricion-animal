"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";

const NEXT = { light: "dark", dark: "system", system: "light" } as const;
type ThemeChoice = keyof typeof NEXT;

const LABELS: Record<ThemeChoice, string> = {
  light: "Modo claro",
  dark: "Modo oscuro",
  system: "Modo del sistema",
};

const ICONS = { light: Sun, dark: Moon, system: Monitor };

// En el servidor no se conoce la elección guardada en el navegador:
// hasta montar se muestra un botón sin ícono, sin error de hidratación.
const subscribe = () => () => {};
const useMounted = () =>
  useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );

// RN-073: cicla claro → oscuro → sistema.
export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const mounted = useMounted();
  const current: ThemeChoice =
    theme === "light" || theme === "dark" ? theme : "system";
  const Icon = ICONS[current];

  return (
    <Button
      variant="outline"
      size="icon"
      onClick={() => setTheme(NEXT[current])}
      aria-label={
        mounted ? `${LABELS[current]}. Cambiar a ${LABELS[NEXT[current]].toLowerCase()}` : "Cambiar modo de color"
      }
    >
      {mounted && <Icon />}
    </Button>
  );
}
