import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      /* ─── Brand Palette ──────────────────────────────────────── */
      colors: {
        brand: {
          green: {
            DEFAULT: "#0B3D2E",
            50: "#E8F5F0",
            100: "#C5E6D9",
            200: "#8ECDB3",
            300: "#57B48D",
            400: "#2E8B67",
            500: "#0B3D2E",
            600: "#093425",
            700: "#072A1E",
            800: "#052017",
            900: "#031610",
          },
          cream: {
            DEFAULT: "#F7F5EF",
            50: "#FDFCFA",
            100: "#FAF9F5",
            200: "#F7F5EF",
            300: "#EDE8DA",
            400: "#E3DBC5",
          },
          gold: {
            DEFAULT: "#C9A44C",
            50: "#FBF6EA",
            100: "#F5E9C9",
            200: "#EDD48F",
            300: "#DBBF65",
            400: "#C9A44C",
            500: "#B08E3A",
            600: "#8E7230",
          },
        },
        semantic: {
          success: "#2E8B67",
          warning: "#C9A44C",
          error: "#C44D4D",
          info: "#4A90A4",
        },
        neutral: {
          50: "#FAFAF8",
          100: "#F0EFEB",
          200: "#E0DED8",
          300: "#C8C5BC",
          400: "#A09D94",
          500: "#78756C",
          600: "#585550",
          700: "#3A3835",
          800: "#252420",
          900: "#141310",
        },
      },

      /* ─── Typography ─────────────────────────────────────────── */
      fontFamily: {
        serif: ['"Playfair Display"', "Georgia", "serif"],
        sans: ['"Inter"', "system-ui", "-apple-system", "sans-serif"],
      },
      fontSize: {
        "display-xl": ["4.5rem", { lineHeight: "1.1", letterSpacing: "-0.02em" }],
        "display-lg": ["3.5rem", { lineHeight: "1.15", letterSpacing: "-0.02em" }],
        display: ["2.5rem", { lineHeight: "1.2", letterSpacing: "-0.01em" }],
        "heading-lg": ["2rem", { lineHeight: "1.25", letterSpacing: "-0.01em" }],
        heading: ["1.5rem", { lineHeight: "1.3" }],
        "heading-sm": ["1.25rem", { lineHeight: "1.4" }],
        "body-lg": ["1.125rem", { lineHeight: "1.6" }],
        body: ["1rem", { lineHeight: "1.6" }],
        "body-sm": ["0.875rem", { lineHeight: "1.5" }],
        caption: ["0.75rem", { lineHeight: "1.5", letterSpacing: "0.01em" }],
      },

      /* ─── Spacing & Layout ───────────────────────────────────── */
      maxWidth: {
        container: "1200px",
        chat: "720px",
      },
      spacing: {
        section: "6rem",
        "section-mobile": "3.5rem",
      },

      /* ─── Radii ──────────────────────────────────────────────── */
      borderRadius: {
        card: "1rem",
        chat: "1.25rem",
        button: "0.625rem",
        pill: "9999px",
        input: "0.75rem",
      },

      /* ─── Shadows ────────────────────────────────────────────── */
      boxShadow: {
        card: "0 4px 24px rgba(11, 61, 46, 0.08)",
        "card-hover": "0 8px 40px rgba(11, 61, 46, 0.12)",
        "chat-bubble": "0 2px 8px rgba(11, 61, 46, 0.06)",
        "gold-glow": "0 0 24px rgba(201, 164, 76, 0.3)",
        elevated: "0 12px 48px rgba(11, 61, 46, 0.15)",
      },

      /* ─── Keyframes (CSS fallbacks — prefer Framer Motion) ──── */
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(16px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "fade-in": "fadeIn 0.6s ease-out",
        "slide-up": "slideUp 0.5s ease-out",
      },
    },
  },
  plugins: [],
};

export default config;
