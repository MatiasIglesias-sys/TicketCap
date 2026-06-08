"use client";

import { useEffect, useRef } from "react";

interface QRDisplayProps {
  value: string;
  size?: number;
}

export default function QRDisplay({ value, size = 120 }: QRDisplayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let mounted = true;

    async function renderQr() {
      try {
        const mod = await import("qrcode");
        const qr = (mod as unknown as { default?: { toCanvas?: (...args: unknown[]) => Promise<void> }; toCanvas?: (...args: unknown[]) => Promise<void> }).default
          ?? (mod as unknown as { toCanvas?: (...args: unknown[]) => Promise<void> });

        if (!mounted || !canvasRef.current || typeof qr.toCanvas !== "function") return;

        await qr.toCanvas(canvasRef.current, value, {
          width: size,
          margin: 1,
          color: {
            dark: "#000000",
            light: "#FFFFFF",
          },
        });
      } catch (err) {
        console.error("[QRDisplay] No se pudo renderizar el QR:", err);
      }
    }

    renderQr();
    return () => { mounted = false; };
  }, [value, size]);

  return (
    <div
      className="bg-white rounded-lg p-1.5 shrink-0 shadow-md"
      style={{ width: size + 12, height: size + 12 }}
    >
      <canvas ref={canvasRef} className="block rounded" />
    </div>
  );
}
