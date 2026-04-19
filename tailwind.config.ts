import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          blue:         "#4A85EF",
          "blue-hover": "#3A6FD8",
          "blue-dark":  "#1E45B8",
          "blue-light": "#EBF3FF",
          "blue-mid":   "#C5DBFC",
          indigo:       "#6366F1",
          violet:       "#7C3AED",
        },
        ink: {
          DEFAULT:   "rgb(var(--color-ink) / <alpha-value>)",
          secondary: "rgb(var(--color-ink-secondary) / <alpha-value>)",
          tertiary:  "rgb(var(--color-ink-tertiary) / <alpha-value>)",
        },
        surface: {
          DEFAULT: "rgb(var(--color-surface) / <alpha-value>)",
          raised:  "rgb(var(--color-surface-raised) / <alpha-value>)",
          border:  "rgb(var(--color-surface-border) / <alpha-value>)",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      animation: {
        "fade-in":       "fadeIn 0.5s ease-in-out",
        "slide-up":      "slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1)",
        "float":         "float 6s ease-in-out infinite",
        "float-slow":    "float 8s ease-in-out infinite",
        "float-slower":  "float 10s ease-in-out infinite",
        "pulse-glow":    "pulseGlow 2s ease-in-out infinite",
        "spin-slow":     "spin 8s linear infinite",
        "spin-slower":   "spin 12s linear infinite",
        "gradient-x":    "gradientX 6s ease infinite",
        "particle":      "particleFloat 6s ease-in-out infinite",
        "mesh-drift":    "meshDrift 28s ease-in-out infinite alternate",
        "conic-spin":    "conicSpin 6s linear infinite",
      },
      keyframes: {
        fadeIn: {
          "0%":   { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%":   { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%":      { transform: "translateY(-12px)" },
        },
        pulseGlow: {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(74, 133, 239, 0.4)" },
          "50%":      { boxShadow: "0 0 0 8px rgba(74, 133, 239, 0)" },
        },
        gradientX: {
          "0%, 100%": { backgroundPosition: "0% 50%" },
          "50%":      { backgroundPosition: "100% 50%" },
        },
        particleFloat: {
          "0%, 100%": { transform: "translateY(0) translateX(0)", opacity: "0.3" },
          "25%":      { transform: "translateY(-20px) translateX(10px)", opacity: "0.7" },
          "50%":      { transform: "translateY(-8px) translateX(-5px)", opacity: "0.5" },
          "75%":      { transform: "translateY(-25px) translateX(8px)", opacity: "0.8" },
        },
        meshDrift: {
          "0%":   { transform: "translate3d(0,0,0) scale(1)" },
          "100%": { transform: "translate3d(-3%,2%,0) scale(1.06)" },
        },
        conicSpin: {
          "to": { transform: "rotate(360deg)" },
        },
      },
      backgroundImage: {
        "gradient-brand": "linear-gradient(135deg, #4A85EF 0%, #6366F1 100%)",
        "gradient-brand-soft": "linear-gradient(135deg, rgba(74,133,239,0.1) 0%, rgba(99,102,241,0.1) 100%)",
      },
      boxShadow: {
        "glow-blue":   "0 0 20px rgba(74, 133, 239, 0.35), 0 4px 14px rgba(74, 133, 239, 0.2)",
        "glow-indigo": "0 0 24px rgba(99, 102, 241, 0.3), 0 4px 14px rgba(99, 102, 241, 0.15)",
        "card-hover":  "0 0 0 1px rgba(74,133,239,0.07), 0 8px 24px -4px rgba(74,133,239,0.18), 0 20px 48px rgba(99,102,241,0.08)",
        "soft":        "0 1px 2px rgba(15,23,42,0.04), 0 8px 24px -8px rgba(15,23,42,0.08)",
        "lift":        "0 2px 4px rgba(15,23,42,0.05), 0 24px 48px -16px rgba(15,23,42,0.14)",
        "float":       "0 40px 80px -24px rgba(40,60,160,0.22)",
      },
      letterSpacing: {
        "tightest": "-0.04em",
        "tighter2": "-0.035em",
        "tighter3": "-0.025em",
      },
    },
  },
  plugins: [],
};

export default config;
