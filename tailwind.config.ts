import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
    "./src/styles/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#1A4F7A",
          dark:    "#0F3254",
          light:   "#E8F1F8",
        },
        accent: {
          DEFAULT: "#E85D1F",
          light:   "#FEF0E9",
        },
        ciaten: {
          bg:      "#F5F7FA",
          text:    "#1C2B3A",
          muted:   "#5A7184",
          border:  "#D6E2EE",
          success: "#1B7F5A",
          warning: "#8B6200",
          error:   "#A13B3B",
        },
      },
      fontFamily: {
        sans: ["-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "Helvetica", "Arial", "sans-serif"],
      },
      borderRadius: {
        xl: "0.75rem",
        "2xl": "1rem",
      },
      boxShadow: {
        card: "0 4px 20px rgba(26,79,122,0.07)",
        "card-hover": "0 8px 30px rgba(26,79,122,0.12)",
      },
    },
  },
  plugins: [],
};
export default config;
