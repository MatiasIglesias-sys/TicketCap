"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface CartItem {
  sectorId: string;
  sectorNombre: string;
  eventId: string;
  eventNombre: string;
  eventFecha: string;
  precio: number;
  precioOriginal: number;
  esSocio: boolean;
  cantidad: number;
}

interface CartState {
  items: CartItem[];
  expiresAt: number | null;
  addItem: (item: CartItem) => void;
  removeItem: (sectorId: string) => void;
  clearCart: () => void;
  setExpiry: (expiresAt: number) => void;
  total: () => number;
  isExpired: () => boolean;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      expiresAt: null,

      addItem: (item) => {
        const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutos
        set((state) => ({
          items: [...state.items.filter((i) => i.sectorId !== item.sectorId), item],
          expiresAt,
        }));
      },

      removeItem: (sectorId) => {
        set((state) => ({
          items: state.items.filter((i) => i.sectorId !== sectorId),
        }));
      },

      clearCart: () => set({ items: [], expiresAt: null }),

      setExpiry: (expiresAt) => set({ expiresAt }),

      total: () => {
        return get().items.reduce((acc, item) => acc + item.precio * item.cantidad, 0);
      },

      isExpired: () => {
        const { expiresAt } = get();
        if (!expiresAt) return false;
        return Date.now() > expiresAt;
      },
    }),
    { name: "ticketscap-cart" }
  )
);
