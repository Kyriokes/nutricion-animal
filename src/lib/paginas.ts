// Ajusta la página pedida (por ejemplo, de la URL) a las que existen: si se
// pide una de más, se muestra la última en vez de una lista vacía.
export function pageWithin(requested: number, total: number, size: number): { page: number; pages: number } {
  const pages = Math.max(1, Math.ceil(total / size));
  return { page: Math.min(Math.max(1, requested), pages), pages };
}
