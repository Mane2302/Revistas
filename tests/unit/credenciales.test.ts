import { describe, expect, it } from "vitest";
import { generateTemporaryPassword, normalizeUsername, passwordSchema, usernameSchema, usernameToEmail } from "@/lib/auth/credentials";

describe("nombres de usuario", () => {
  it("normaliza acentos, mayúsculas y espacios", () => {
    expect(normalizeUsername("  José Pérez ")).toBe("jose.perez");
    expect(normalizeUsername("ALUMNO01")).toBe("alumno01");
    expect(normalizeUsername("Ñandú")).toBe("nandu");
  });

  it("rechaza nombres demasiado cortos o con símbolos", () => {
    expect(usernameSchema.safeParse("ab").success).toBe(false);
    expect(usernameSchema.safeParse(".alumno").success).toBe(false);
    expect(usernameSchema.safeParse("alumno01").success).toBe(true);
  });

  it("genera un correo interno que no puede colisionar ni inyectar dominios", () => {
    expect(usernameToEmail("alumno01", "alumnos.revista-escolar.invalid")).toBe("alumno01@alumnos.revista-escolar.invalid");
    expect(() => usernameToEmail("x@gmail.com", "d.invalid")).toThrow();
  });
});

describe("contraseñas", () => {
  it("las temporales cumplen la política y no se repiten", () => {
    const set = new Set<string>();
    for (let i = 0; i < 200; i++) {
      const p = generateTemporaryPassword();
      expect(passwordSchema.safeParse(p).success).toBe(true);
      expect(p).toMatch(/^[A-Za-z2-9]{4}-[A-Za-z2-9]{4}-[A-Za-z2-9]{4}$/);
      set.add(p);
    }
    expect(set.size).toBe(200);
  });

  it("exige longitud mínima, letras y números", () => {
    expect(passwordSchema.safeParse("corta1").success).toBe(false);
    expect(passwordSchema.safeParse("sinnumeros").success).toBe(false);
    expect(passwordSchema.safeParse("12345678").success).toBe(false);
    expect(passwordSchema.safeParse("revista2026").success).toBe(true);
  });
});
