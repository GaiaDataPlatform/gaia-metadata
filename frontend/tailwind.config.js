export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        navy: {
          950: "#060f1e",
          900: "#0a1628",
          800: "#0f2140",
          700: "#162a50",
          600: "#1e3a6e",
        },
        ocean: {
          500: "#0077b6",
          400: "#0096c7",
          300: "#00b4d8",
          200: "#48cae4",
          100: "#90e0ef",
          50:  "#caf0f8",
        },
      },
      fontFamily: {
        display: ['"Exo 2"', "sans-serif"],
        body: ['"DM Sans"', "sans-serif"],
        mono: ['"JetBrains Mono"', "monospace"],
      },
    },
  },
  plugins: [],
};
