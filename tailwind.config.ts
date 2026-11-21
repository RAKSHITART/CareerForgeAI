import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Segoe UI Variable"', '"Segoe UI"', "system-ui", "-apple-system", "Roboto", '"Helvetica Neue"', "Arial", "sans-serif"],
      },
      // slightly larger small text so forms and tables are comfortable to read
      fontSize: {
        xs: ["0.8125rem", { lineHeight: "1.25rem" }],
        sm: ["0.9375rem", { lineHeight: "1.5rem" }],
      },
      colors: {
        // "verified" teal: replaces the default blue everywhere the app already uses blue-*
        blue: {
          50: "#effaf8", 100: "#d4f1ed", 200: "#a9e2db", 300: "#74cdc3", 400: "#3fb2a7", 500: "#1f9a90",
          600: "#0f7f78", 700: "#0e6762", 800: "#0f5350", 900: "#10443f", 950: "#072a28",
        },
        brand: {
          50: "#f0f7ff",
          100: "#e0effe",
          200: "#bae0fd",
          300: "#7cc8fb",
          400: "#36aaf5",
          500: "#0c8ee9",
          600: "#0270c7",
          700: "#0359a1",
          800: "#074c85",
          900: "#0c406e",
          950: "#082949",
        },
      },
    },
  },
  plugins: [],
};
export default config;
