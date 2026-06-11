/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        midnight: "#0b0f14",
        ink: "#111827",
        panel: "rgba(17, 24, 39, 0.72)",
        teal: "#22c55e",
        gold: "#fbbf24",
        environmental: "#22c55e",
        social: "#38bdf8",
        governance: "#c084fc",
        warning: "#f59e0b",
        danger: "#fb7185",
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(255, 255, 255, 0.045), 0 12px 30px rgba(0, 0, 0, 0.22)",
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
