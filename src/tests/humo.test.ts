import { describe, expect, it } from "vitest";
import { z } from "zod";
import { cn } from "@/lib/utils";

// Test de humo: verifica que Vitest, Zod y el alias "@/" funcionan.
// Borrar cuando exista el primer test real de un módulo de dominio.
describe("entorno de pruebas", () => {
  it("resuelve el alias @/ y valida con Zod", () => {
    expect(cn("a", "b")).toBe("a b");
    expect(z.string().min(1).safeParse("").success).toBe(false);
  });
});
