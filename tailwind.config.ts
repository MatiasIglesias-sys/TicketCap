import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Identidad aurinegra Peñarol
        amarillo: {
          DEFAULT: "#F5C518",
          light: "#FAD02C",
          dark: "#C4A015",
          hover: "#E8B800",
        },
        negro: {
          DEFAULT: "#1A1A1A",
          suave: "#2D2D2D",
          medio: "#3D3D3D",
        },
        gris: {
          claro: "#F0F0F0",
          medio: "#9A9A9A",
          oscuro: "#555555",
        },
        alerta: {
          rojo: "#E53935",
          verde: "#43A047",
          amarillo: "#F5C518",
        },
      },
      fontFamily: {
        bebas: ["var(--font-bebas)", "Impact", "Arial Black", "sans-serif"],
        inter: ["var(--font-inter)", "Inter", "sans-serif"],
        mono: ["var(--font-mono)", "Roboto Mono", "monospace"],
      },
      backgroundImage: {
        "gradient-aurinegro":
          "linear-gradient(135deg, #1A1A1A 0%, #2D2D2D 50%, #1A1A1A 100%)",
        "gradient-amarillo":
          "linear-gradient(135deg, #F5C518 0%, #FAD02C 100%)",
      },
      animation: {
        "pulse-yellow": "pulse-yellow 2s ease-in-out infinite",
        "slide-in": "slide-in 0.3s ease-out",
        "fade-in": "fade-in 0.4s ease-out",
        countdown: "countdown linear 1s infinite",
      },
      keyframes: {
        "pulse-yellow": {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(245, 197, 24, 0.4)" },
          "50%": { boxShadow: "0 0 0 12px rgba(245, 197, 24, 0)" },
        },
        "slide-in": {
          from: { opacity: "0", transform: "translateY(-10px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
