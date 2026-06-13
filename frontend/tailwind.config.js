/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        broadcast: {
          red: "#FF0000",
          redHover: "#CC0000",
          blue: "#065FD4",
          text: "#0F0F0F",
          muted: "#606060",
          surface: "#F2F2F2",
          border: "#E5E5E5",
          success: "#2BA640",
          warning: "#FB8C00",
        },
      },
      fontFamily: {
        sans: ["Roboto", "Arial", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["Roboto Mono", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      boxShadow: {
        header: "0 1px 2px rgba(0, 0, 0, 0.1)",
        menu: "0 4px 32px rgba(0, 0, 0, 0.1)",
      },
    },
  },
  plugins: [],
};
