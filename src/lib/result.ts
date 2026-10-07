// Resultado de una operación de dominio: éxito con datos, o un código de error.
export type Result<T, E extends string> =
  | ({ ok: true } & T)
  | { ok: false; error: E };
