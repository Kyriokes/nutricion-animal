// RN-067, DT-055: hasta integrar Mercado Pago, el pago es de prueba: el
// cliente elige "aprobado" o "rechazado". Eso no puede llegar a un sitio real
// por descuido, donde cualquiera marcaría su pedido como pagado sin pagar: en
// producción queda apagado salvo que se active con PAYMENTS_SIMULATED=true
// (por ejemplo, en una demo).
export function simulatedPaymentsEnabled(env: { NODE_ENV?: string; PAYMENTS_SIMULATED?: string } = process.env) {
  return env.NODE_ENV !== "production" || env.PAYMENTS_SIMULATED === "true";
}
