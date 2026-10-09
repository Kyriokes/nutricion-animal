import { describe, expect, it } from "vitest";
import { pageWithin } from "./paginas";

describe("lib/paginas: página dentro del rango", () => {
  it("calcula la cantidad de páginas (al menos una)", () => {
    expect(pageWithin(1, 0, 20)).toEqual({ page: 1, pages: 1 });
    expect(pageWithin(1, 41, 20)).toEqual({ page: 1, pages: 3 });
  });

  it("una página pedida de más muestra la última", () => {
    expect(pageWithin(50, 41, 20)).toEqual({ page: 3, pages: 3 });
  });
});
