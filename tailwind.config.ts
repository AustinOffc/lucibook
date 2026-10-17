import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // PinkSoft (pink soft)
        pinksoft: {
          50: "#FFF7F9",
          100: "#FFEEF3",
          200: "#FDDFE8",
          300: "#FAC8D9",
          400: "#F5ABC4",
          500: "#F092B1",
          600: "#E57C9F",
          700: "#C2567F",
          800: "#9A4262",
          900: "#6E3049",
        },
      },
      fontFamily: {
        sans: ["var(--font-jakarta)", "ui-sans-serif", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
