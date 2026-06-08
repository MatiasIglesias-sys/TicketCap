/**
 * Tests para src/store/cartStore.ts
 * Cubre: addItem, removeItem, clearCart, total, isExpired, setExpiry
 */

// El store usa zustand/persist que accede a localStorage.
// En JSDOM localStorage existe pero persistMiddleware puede dar problemas → reseteamos antes de cada test.

import { renderHook, act } from "@testing-library/react";
import { useCartStore, CartItem } from "@/store/cartStore";

const makeItem = (overrides: Partial<CartItem> = {}): CartItem => ({
  sectorId:      "sector-1",
  sectorNombre:  "Platea VIP",
  eventId:       "event-1",
  eventNombre:   "Peñarol vs Nacional",
  eventFecha:    "2025-06-15T20:00:00.000Z",
  precio:        1500,
  precioOriginal: 2000,
  esSocio:       false,
  cantidad:      1,
  ...overrides,
});

beforeEach(() => {
  // Resetear el store entre tests
  useCartStore.setState({ items: [], expiresAt: null });
});

describe("addItem", () => {
  it("agrega un item al carrito vacío", () => {
    const { result } = renderHook(() => useCartStore());
    act(() => { result.current.addItem(makeItem()); });
    expect(result.current.items).toHaveLength(1);
  });

  it("reemplaza el item si el sectorId ya existe", () => {
    const { result } = renderHook(() => useCartStore());
    act(() => { result.current.addItem(makeItem({ cantidad: 1 })); });
    act(() => { result.current.addItem(makeItem({ cantidad: 3 })); });
    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0].cantidad).toBe(3);
  });

  it("agrega ítems de sectores distintos", () => {
    const { result } = renderHook(() => useCartStore());
    act(() => { result.current.addItem(makeItem({ sectorId: "s1" })); });
    act(() => { result.current.addItem(makeItem({ sectorId: "s2" })); });
    expect(result.current.items).toHaveLength(2);
  });

  it("setea expiresAt al agregar un item", () => {
    const { result } = renderHook(() => useCartStore());
    act(() => { result.current.addItem(makeItem()); });
    expect(result.current.expiresAt).not.toBeNull();
    expect(result.current.expiresAt).toBeGreaterThan(Date.now());
  });
});

describe("removeItem", () => {
  it("elimina el item correcto", () => {
    const { result } = renderHook(() => useCartStore());
    act(() => {
      result.current.addItem(makeItem({ sectorId: "s1" }));
      result.current.addItem(makeItem({ sectorId: "s2" }));
    });
    act(() => { result.current.removeItem("s1"); });
    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0].sectorId).toBe("s2");
  });

  it("no falla si el item no existe", () => {
    const { result } = renderHook(() => useCartStore());
    expect(() => {
      act(() => { result.current.removeItem("sector-inexistente"); });
    }).not.toThrow();
  });
});

describe("clearCart", () => {
  it("vacía el carrito completamente", () => {
    const { result } = renderHook(() => useCartStore());
    act(() => {
      result.current.addItem(makeItem({ sectorId: "s1" }));
      result.current.addItem(makeItem({ sectorId: "s2" }));
    });
    act(() => { result.current.clearCart(); });
    expect(result.current.items).toHaveLength(0);
    expect(result.current.expiresAt).toBeNull();
  });
});

describe("total()", () => {
  it("retorna 0 con carrito vacío", () => {
    const { result } = renderHook(() => useCartStore());
    expect(result.current.total()).toBe(0);
  });

  it("calcula el total correctamente con un item", () => {
    const { result } = renderHook(() => useCartStore());
    act(() => { result.current.addItem(makeItem({ precio: 1500, cantidad: 2 })); });
    expect(result.current.total()).toBe(3000);
  });

  it("calcula el total con múltiples ítems", () => {
    const { result } = renderHook(() => useCartStore());
    act(() => {
      result.current.addItem(makeItem({ sectorId: "s1", precio: 1000, cantidad: 2 }));
      result.current.addItem(makeItem({ sectorId: "s2", precio: 500, cantidad: 3 }));
    });
    expect(result.current.total()).toBe(2000 + 1500);
  });
});

describe("isExpired()", () => {
  it("retorna false cuando no hay expiresAt", () => {
    const { result } = renderHook(() => useCartStore());
    expect(result.current.isExpired()).toBe(false);
  });

  it("retorna false cuando el carrito no ha expirado", () => {
    const { result } = renderHook(() => useCartStore());
    act(() => { result.current.setExpiry(Date.now() + 60_000); });
    expect(result.current.isExpired()).toBe(false);
  });

  it("retorna true cuando el carrito ya expiró", () => {
    const { result } = renderHook(() => useCartStore());
    act(() => { result.current.setExpiry(Date.now() - 1000); });
    expect(result.current.isExpired()).toBe(true);
  });
});

describe("setExpiry()", () => {
  it("actualiza expiresAt", () => {
    const { result } = renderHook(() => useCartStore());
    const future = Date.now() + 999_999;
    act(() => { result.current.setExpiry(future); });
    expect(result.current.expiresAt).toBe(future);
  });
});
