import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // PinkSoft (pink soft)
        pinksoft: {
          50: "#FFF5F8",
          100: "#FFE8EF",
          200: "#FBD0DE",
          300: "#F5B0C6",
          400: "#EE8FAE",
          500: "#E46F96",
          600: "#C94675",
          700: "#A93564",
          800: "#862A50",
          900: "#5C1F38",
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
