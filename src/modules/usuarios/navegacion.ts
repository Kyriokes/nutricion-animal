import { hasPermission, type Permission, type Role } from "./roles";

export type NavItem = { href: string; label: string };
export type NavGroup = { label: string; items: NavItem[] };

// Cada entrada se muestra solo si el usuario tiene el permiso. La pantalla
// igual lo verifica en el servidor: esto solo decide qué se ofrece.
const MENU: { label: string; items: (NavItem & { permission?: Permission })[] }[] = [
  {
    label: "Mi cuenta",
    items: [
      { href: "/perfil", label: "Mi perfil" },
      { href: "/mascotas", label: "Mis mascotas", permission: "pet.register" },
    ],
  },
  {
    label: "Nutrición",
    items: [
      { href: "/nutricionistas", label: "Nutricionistas", permission: "nutritionist.search" },
      { href: "/dietas", label: "Mis dietas", permission: "diet.manage" },
    ],
  },
  {
    label: "Administración",
    items: [
      { href: "/admin/postulaciones", label: "Postulaciones", permission: "application.decide" },
      { href: "/admin/usuarios", label: "Usuarios", permission: "user.manage_roles" },
      { href: "/admin/catalogo", label: "Catálogo", permission: "catalog.manage" },
      { href: "/admin/contenido", label: "Contenido", permission: "content.manage" },
      { href: "/admin/configuracion/apariencia", label: "Apariencia", permission: "settings.manage" },
      { href: "/admin/configuracion/envio", label: "Envío", permission: "settings.manage" },
    ],
  },
];

// Menú del usuario según sus roles, sin grupos vacíos.
export function navigationFor(roles: readonly Role[]): NavGroup[] {
  return MENU.map((group) => ({
    label: group.label,
    items: group.items
      .filter((i) => !i.permission || hasPermission(roles, i.permission))
      .map(({ href, label }) => ({ href, label })),
  })).filter((g) => g.items.length > 0);
}
