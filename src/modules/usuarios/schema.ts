import { z } from "zod";
import { RoleSchema } from "./roles";

export const UserSchema = z.object({
  id: z.uuid(),
  email: z.email(),
  name: z.string().trim().min(1, "El nombre es requerido"),
  photoUrl: z.url().optional(),
  roles: z.array(RoleSchema),
  // Nota interna del administrador sobre el usuario. Por ejemplo, el motivo
  // por el que se lo dejó sin roles (y por lo tanto sin permisos).
  adminNote: z.string().trim().optional(),
});

export type User = z.infer<typeof UserSchema>;

// VU-01: lo que el usuario puede editar de su perfil. La foto viene de Google
// en el primer ingreso (RN-024); cambiarla requiere guardar archivos.
export const ProfileUpdateSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "El nombre es requerido")
    .max(80, "El nombre puede tener hasta 80 caracteres"),
});
