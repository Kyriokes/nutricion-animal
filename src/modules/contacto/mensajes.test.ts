import { describe, expect, it } from "vitest";
import {
  CONTACT_CHANNELS,
  ContactMessageSchema,
  canSendMore,
  isSpamTrap,
  MAX_MESSAGES_PER_HOUR,
  whatsappLink,
} from "./mensajes";

const valid = {
  name: "  Ana Pérez ",
  email: "Ana@Example.com",
  subject: "Consulta por envíos",
  message: "¿Hacen envíos a Palermo los sábados?",
};

describe("contacto/mensajes (RN-080: formulario de contacto)", () => {
  it("acepta nombre, email, motivo y mensaje, prolijos", () => {
    expect(ContactMessageSchema.parse(valid)).toEqual({
      name: "Ana Pérez",
      email: "ana@example.com",
      subject: "Consulta por envíos",
      message: "¿Hacen envíos a Palermo los sábados?",
    });
  });

  it("explica qué falta o qué está mal", () => {
    const issue = (input: object) => ContactMessageSchema.safeParse({ ...valid, ...input }).error?.issues[0]?.message;
    expect(issue({ name: " " })).toBe("Escribí tu nombre.");
    expect(issue({ email: "ana" })).toBe("Revisá el email.");
    expect(issue({ subject: "" })).toBe("Contanos el motivo.");
    expect(issue({ message: "hola" })).toBe("El mensaje es muy corto (al menos 10 caracteres).");
    expect(issue({ message: "x".repeat(4001) })).toBe("El mensaje: hasta 4000 caracteres.");
  });

  it("un campo trampa que solo completan los bots", () => {
    expect(isSpamTrap({ website: "" })).toBe(false);
    expect(isSpamTrap({})).toBe(false);
    expect(isSpamTrap({ website: "http://spam.example" })).toBe(true);
  });

  it("hasta 5 mensajes por hora por email", () => {
    expect(MAX_MESSAGES_PER_HOUR).toBe(5);
    expect(canSendMore(4)).toBe(true);
    expect(canSendMore(5)).toBe(false);
  });
});

describe("contacto/mensajes (RN-081: email y WhatsApp de contacto)", () => {
  it("tiene datos de prueba", () => {
    expect(CONTACT_CHANNELS.email).toMatch(/@/);
    expect(CONTACT_CHANNELS.whatsapp).toMatch(/^\d+$/);
  });

  it("arma el enlace de WhatsApp con un texto inicial", () => {
    expect(whatsappLink("5491100000000", "Hola, tengo una consulta")).toBe(
      "https://wa.me/5491100000000?text=Hola%2C%20tengo%20una%20consulta",
    );
  });
});
