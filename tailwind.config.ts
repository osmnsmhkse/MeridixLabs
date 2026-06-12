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
          azure:        "#2F6BE0",
          indigo:       "#6366F1",
          violet:       "#7C3AED",
          cyan:         "#22D3EE",
          sky:          "#38BDF8",
        },
        /* Near-black scale for dark sections */
        night: {
          DEFAULT: "#0A0C10",
          950:     "#06080B",
          900:     "#0A0C10",
          800:     "#12151B",
          700:     "#1A1E26",
          600:     "#232831",
        },
        /* Editorial paper tints (dark-aware section bgs use the
           .bg-paper/.bg-duck/.bg-navy utilities in globals.css) */
        paper: {
          beige: "#F1F0EB",
          duck:  "#F1F5F8",
          sky:   "#D9E8FA",
          navy:  "#232B38",
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
        sans:    ["Inter", "-apple-system", "BlinkMacSystemFont", '"Helvetica Neue"', "Arial", "sans-serif"],
        display: ['"Geist"', "-apple-system", "BlinkMacSystemFont", "Inter", '"Helvetica Neue"', "Arial", "sans-serif"],
        mono:    ["JetBrains Mono", "monospace"],
      },
      fontWeight: {
        thin2: "250",
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
        "aurora":        "aurora 18s ease-in-out infinite alternate",
        "sheen":         "sheen 1.1s ease-out",
        "shimmer-x":     "shimmerX 2.4s linear infinite",
        "pop-in":        "popIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) both",
        "marquee":       "marquee 36s linear infinite",
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
        aurora: {
          "0%":   { transform: "translate3d(-6%, -3%, 0) scale(1) rotate(0deg)",      opacity: "0.75" },
          "33%":  { transform: "translate3d(5%, 2%, 0) scale(1.16) rotate(4deg)",     opacity: "1" },
          "66%":  { transform: "translate3d(-3%, 6%, 0) scale(1.08) rotate(-3deg)",   opacity: "0.85" },
          "100%": { transform: "translate3d(4%, -4%, 0) scale(1.13) rotate(2deg)",    opacity: "0.95" },
        },
        sheen: {
          "0%":   { transform: "translateX(-120%) skewX(-12deg)" },
          "100%": { transform: "translateX(220%) skewX(-12deg)" },
        },
        shimmerX: {
          "0%":   { backgroundPosition: "0% 50%" },
          "100%": { backgroundPosition: "200% 50%" },
        },
        popIn: {
          "0%":   { opacity: "0", transform: "translateY(14px) scale(0.96)" },
          "100%": { opacity: "1", transform: "translateY(0) scale(1)" },
        },
        marquee: {
          "0%":   { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
      },
      backgroundImage: {
        /* Legacy names kept — flattened to the single brand color */
        "gradient-brand": "linear-gradient(135deg, #4A85EF 0%, #4A85EF 100%)",
        "gradient-brand-soft": "linear-gradient(135deg, rgba(74,133,239,0.08) 0%, rgba(74,133,239,0.08) 100%)",
      },
      boxShadow: {
        /* Editorial system: shadows are whispers, glows are gone */
        "glow-blue":   "none",
        "glow-indigo": "none",
        "card-hover":  "none",
        "soft":        "0 1px 2px rgba(27,30,36,0.04)",
        "lift":        "0 12px 32px -16px rgba(27,30,36,0.14)",
        "float":       "0 24px 56px -28px rgba(27,30,36,0.18)",
        "premium":     "0 1px 2px rgba(27,30,36,0.05)",
        "bento":       "none",
        "glow-lg":     "none",
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
