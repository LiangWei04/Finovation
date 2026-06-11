/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        midnight: "#061421",
        ink: "#0a1d2e",
        panel: "rgba(11, 31, 49, 0.78)",
        teal: "#2dd4bf",
        environmental: "#34d399",
        social: "#60a5fa",
        governance: "#a78bfa",
        warning: "#f59e0b",
        danger: "#fb7185",
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(45, 212, 191, 0.18), 0 24px 70px rgba(0, 0, 0, 0.35)",
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
