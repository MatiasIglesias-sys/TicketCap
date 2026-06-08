/**
 * Tests para src/lib/utils.ts
 * Cubre: cn, formatDate, formatDateTime, formatCurrency,
 *        torneoLabel, deporteLabel, ventaEstadoLabel, categoriaLabel
 */
import {
  cn,
  formatDate,
  formatDateTime,
  formatCurrency,
  torneoLabel,
  deporteLabel,
  ventaEstadoLabel,
  categoriaLabel,
} from "@/lib/utils";

describe("cn (classnames merge)", () => {
  it("combina clases simples", () => {
    expect(cn("foo", "bar")).toBe("foo bar");
  });

  it("resuelve conflictos de tailwind correctamente", () => {
    expect(cn("p-2", "p-4")).toBe("p-4");
  });

  it("filtra valores falsy", () => {
    expect(cn("foo", false && "bar", undefined, null as any, "baz")).toBe("foo baz");
  });

  it("acepta objetos condicionales", () => {
    expect(cn({ active: true, disabled: false })).toBe("active");
  });
});

describe("formatDate", () => {
  it("formatea fecha como string en español", () => {
    const result = formatDate("2024-06-15T12:00:00.000Z");
    expect(result).toMatch(/15 de junio 2024/);
  });

  it("acepta objeto Date", () => {
    // Usamos el 15 de enero al mediodía UTC para evitar problemas de timezone
    const date = new Date("2025-01-15T12:00:00.000Z");
    const result = formatDate(date);
    expect(result).toMatch(/enero/i);
    expect(result).toMatch(/2025/);
  });
});

describe("formatDateTime", () => {
  it("incluye hora en la salida", () => {
    const result = formatDateTime("2024-06-15T18:30:00.000Z");
    expect(result).toMatch(/15/);
    expect(result).toMatch(/2024/);
  });

  it("retorna string no vacío", () => {
    expect(formatDateTime(new Date())).toBeTruthy();
  });
});

describe("formatCurrency", () => {
  it("formatea en pesos uruguayos", () => {
    const result = formatCurrency(1500);
    expect(result).toContain("1.500");
  });

  it("no incluye decimales", () => {
    const result = formatCurrency(100.99);
    expect(result).not.toMatch(/,\d{2}/);
  });
});

describe("torneoLabel", () => {
  it("mapea CLAUSURA correctamente", () => {
    expect(torneoLabel("CLAUSURA")).toBe("Clausura");
  });

  it("mapea LIBERTADORES correctamente", () => {
    expect(torneoLabel("LIBERTADORES")).toBe("Copa Libertadores");
  });

  it("mapea BASQUETBOL correctamente", () => {
    expect(torneoLabel("BASQUETBOL")).toBe("Liga Uruguaya");
  });

  it("retorna el valor original si no está mapeado", () => {
    expect(torneoLabel("TORNEO_DESCONOCIDO")).toBe("TORNEO_DESCONOCIDO");
  });

  const cases = [
    ["APERTURA", "Apertura"],
    ["COPA_URUGUAY", "Copa AUF Uruguay"],
    ["SUPERCOPA", "Supercopa"],
    ["AMISTOSO", "Amistoso"],
    ["PARKING", "Estacionamiento"],
    ["RUGBY", "Rugby"],
  ] as const;

  it.each(cases)("torneoLabel(%s) === %s", (key, expected) => {
    expect(torneoLabel(key)).toBe(expected);
  });
});

describe("deporteLabel", () => {
  it("retorna Fútbol para torneos de fútbol", () => {
    expect(deporteLabel("CLAUSURA")).toBe("Fútbol");
    expect(deporteLabel("LIBERTADORES")).toBe("Fútbol");
  });

  it("retorna Básquetbol para torneos de básquetbol", () => {
    expect(deporteLabel("BASQUETBOL")).toBe("Básquetbol");
    expect(deporteLabel("BASQUETBOL_COPA")).toBe("Básquetbol");
  });

  it("retorna Rugby para torneos de rugby", () => {
    expect(deporteLabel("RUGBY")).toBe("Rugby");
    expect(deporteLabel("RUGBY_COPA")).toBe("Rugby");
  });

  it("retorna Parking para PARKING", () => {
    expect(deporteLabel("PARKING")).toBe("Parking");
  });
});

describe("ventaEstadoLabel", () => {
  it("mapea PREVENTA_SOCIOS", () => {
    expect(ventaEstadoLabel("PREVENTA_SOCIOS")).toBe("Preventa — Solo Socios");
  });

  it("mapea VENTA_GENERAL", () => {
    expect(ventaEstadoLabel("VENTA_GENERAL")).toBe("Venta General");
  });

  it("mapea AGOTADO", () => {
    expect(ventaEstadoLabel("AGOTADO")).toBe("Agotado");
  });

  it("retorna valor original si no está mapeado", () => {
    expect(ventaEstadoLabel("DESCONOCIDO")).toBe("DESCONOCIDO");
  });
});

describe("categoriaLabel", () => {
  it("mapea ACTIVO", () => {
    expect(categoriaLabel("ACTIVO")).toBe("Socio Activo");
  });

  it("mapea ADHERENTE", () => {
    expect(categoriaLabel("ADHERENTE")).toBe("Adherente");
  });

  it("mapea VITALICIO", () => {
    expect(categoriaLabel("VITALICIO")).toBe("Socio Vitalicio");
  });

  it("retorna valor original si no está mapeado", () => {
    expect(categoriaLabel("GOLD_PREMIUM")).toBe("GOLD_PREMIUM");
  });
});
