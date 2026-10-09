import { describe, expect, it } from "vitest";
import { navigationFor } from "./navegacion";

const hrefs = (roles: Parameters<typeof navigationFor>[0]) =>
  navigationFor(roles).flatMap((g) => g.items.map((i) => i.href));

describe("usuarios/navegacion", () => {
  it("un cliente ve su cuenta y la búsqueda de nutricionistas", () => {
    expect(hrefs(["customer"])).toEqual(["/perfil", "/mascotas", "/nutricionistas"]);
  });

  it("un nutricionista suma sus dietas", () => {
    expect(hrefs(["customer", "nutritionist"])).toContain("/dietas");
  });

  it("un auditor ve postulaciones pero no usuarios ni apariencia", () => {
    const h = hrefs(["customer", "auditor"]);
    expect(h).toContain("/admin/postulaciones");
    expect(h).not.toContain("/admin/usuarios");
    expect(h).not.toContain("/admin/configuracion/apariencia");
  });

  it("el admin ve todo, agrupado", () => {
    const groups = navigationFor(["admin"]);
    expect(groups.map((g) => g.label)).toEqual(["Mi cuenta", "Nutrición", "Administración"]);
    expect(hrefs(["admin"])).toEqual(
      expect.arrayContaining(["/admin/usuarios", "/admin/configuracion/apariencia", "/dietas"]),
    );
  });

  it("no hay grupos vacíos; una cuenta sin roles solo ve su perfil", () => {
    expect(navigationFor([])).toEqual([
      { label: "Mi cuenta", items: [{ href: "/perfil", label: "Mi perfil" }] },
    ]);
  });
});
