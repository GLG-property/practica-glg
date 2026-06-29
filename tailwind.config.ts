import type { Config } from "tailwindcss";

/**
 * Temă Tailwind: lizibilă pentru orice vârstă, dar discretă și modernă.
 * Folosim scala implicită Tailwind (nu o umflăm), cu accente de brand.
 */
const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "var(--font-sans)",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "sans-serif",
        ],
      },
      colors: {
        // Coduri de culori pentru statusuri.
        status: {
          scheduled: "#2563eb", // albastru = programat
          completed: "#16a34a", // verde = efectuat
          noshow: "#dc2626", // roșu = nu s-a prezentat
          cancelled: "#94a3b8", // gri = anulat
        },
        brand: {
          50: "#eff4ff",
          100: "#dbe6fe",
          500: "#2563eb",
          DEFAULT: "#2563eb",
          600: "#1d4ed8",
          dark: "#1e3a8a",
        },
      },
      borderRadius: {
        xl: "0.875rem",
        "2xl": "1.125rem",
      },
      boxShadow: {
        card: "0 1px 2px 0 rgb(15 23 42 / 0.04), 0 1px 3px 0 rgb(15 23 42 / 0.06)",
        soft: "0 4px 16px -4px rgb(15 23 42 / 0.10)",
      },
      minHeight: { tap: "44px" },
      minWidth: { tap: "44px" },
    },
  },
  plugins: [],
};

export default config;
