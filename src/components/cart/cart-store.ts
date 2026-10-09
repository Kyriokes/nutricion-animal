"use client";

import { useSyncExternalStore } from "react";
import { parseStoredCart, type CartLine } from "@/modules/pedidos/carrito";

// VP-07: el carrito vive en el navegador (funciona sin sesión). Solo guarda
// productos y cantidades; precios y stock se piden al servidor al mostrarlo.
const KEY = "nutricion-animal:carrito";
const EMPTY: CartLine[] = [];
const listeners = new Set<() => void>();
let lastRaw: string | null | undefined;
let lastCart: CartLine[] = EMPTY;

function read(): CartLine[] {
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(KEY);
  } catch {
    // Almacenamiento bloqueado (modo privado, etc.): carrito vacío.
  }
  if (raw !== lastRaw) {
    lastRaw = raw;
    try {
      lastCart = raw ? parseStoredCart(JSON.parse(raw)) : EMPTY;
    } catch {
      lastCart = EMPTY;
    }
  }
  return lastCart;
}

export function writeCart(cart: CartLine[]) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(cart));
  } catch {
    // Si no se puede guardar, el cambio no persiste; no se rompe la página.
  }
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  // Otras pestañas del mismo sitio.
  const onStorage = (e: StorageEvent) => e.key === KEY && listener();
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

export function useCart(): CartLine[] {
  return useSyncExternalStore(subscribe, read, () => EMPTY);
}

export function readCart(): CartLine[] {
  return read();
}
