import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          blue:       "#4A85EF",   // primary accent — medium blue (slightly darker)
          "blue-hover": "#3A6FD8", // hover / slightly deeper
          "blue-dark":  "#1E45B8", // for text-on-white links
          "blue-light": "#EBF3FF", // hero / section backgrounds
          "blue-mid":   "#C5DBFC", // borders, dividers
        },
        ink: {
          DEFAULT: "#0F172A",  // primary text
          secondary: "#475569", // secondary text
          tertiary:  "#94A3B8", // placeholder / muted
        },
        surface: {
          DEFAULT: "#FFFFFF",
          raised:  "#F8FAFC",  // cards on white
          border:  "#E2E8F0",  // subtle borders
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      animation: {
        "fade-in":   "fadeIn 0.5s ease-in-out",
        "slide-up":  "slideUp 0.5s ease-out",
        "float":     "float 4s ease-in-out infinite",
      },
      keyframes: {
        fadeIn: {
          "0%":   { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%":   { opacity: "0", transform: "translateY(16px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%":      { transform: "translateY(-8px)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
