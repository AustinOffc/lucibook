import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Coksu (cokelat susu)
        coksu: {
          50: "#FBF7F1",
          100: "#F4EBDD",
          200: "#E9D8BF",
          300: "#D2B48C",
          400: "#C8A67A",
          500: "#C19A6B",
          600: "#A9814F",
          700: "#8A6740",
          800: "#6B5033",
          900: "#4D3924",
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
