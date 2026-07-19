/**
 * Design Tokens — Hybrid Fintech
 *
 * Amex-inspired trust palette with Humaan motion language.
 * Single source of truth consumed by both Tailwind (via tailwind.config.ts)
 * and runtime JS/TS (Framer Motion, dynamic styles).
 *
 * If you update values here, mirror them in tailwind.config.ts
 * and globals.css CSS custom properties.
 */

export const colors = {
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
    white: "#FFFFFF",
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
    black: "#0A0908",
  },
} as const;

export const typography = {
  fontFamily: {
    serif: '"Playfair Display", Georgia, serif',
    sans: '"Inter", system-ui, -apple-system, sans-serif',
  },
  scale: {
    "display-xl": { size: "4.5rem", lineHeight: 1.1, letterSpacing: "-0.02em" },
    "display-lg": { size: "3.5rem", lineHeight: 1.15, letterSpacing: "-0.02em" },
    display: { size: "2.5rem", lineHeight: 1.2, letterSpacing: "-0.01em" },
    "heading-lg": { size: "2rem", lineHeight: 1.25, letterSpacing: "-0.01em" },
    heading: { size: "1.5rem", lineHeight: 1.3, letterSpacing: "0" },
    "heading-sm": { size: "1.25rem", lineHeight: 1.4, letterSpacing: "0" },
    "body-lg": { size: "1.125rem", lineHeight: 1.6, letterSpacing: "0" },
    body: { size: "1rem", lineHeight: 1.6, letterSpacing: "0" },
    "body-sm": { size: "0.875rem", lineHeight: 1.5, letterSpacing: "0" },
    caption: { size: "0.75rem", lineHeight: 1.5, letterSpacing: "0.01em" },
  },
  weight: {
    regular: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },
} as const;

export const spacing = {
  section: "6rem",
  sectionMobile: "3.5rem",
  container: "1200px",
  chatMaxWidth: "720px",
  cardPadding: "1.5rem",
  inputHeight: "3rem",
} as const;

export const radii = {
  card: "1rem",
  chat: "1.25rem",
  button: "0.625rem",
  pill: "9999px",
  input: "0.75rem",
} as const;

export const shadows = {
  card: "0 4px 24px rgba(11, 61, 46, 0.08)",
  cardHover: "0 8px 40px rgba(11, 61, 46, 0.12)",
  chatBubble: "0 2px 8px rgba(11, 61, 46, 0.06)",
  goldGlow: "0 0 24px rgba(201, 164, 76, 0.3)",
  elevated: "0 12px 48px rgba(11, 61, 46, 0.15)",
} as const;

export const zIndex = {
  base: 0,
  dropdown: 100,
  sticky: 200,
  overlay: 300,
  modal: 400,
  toast: 500,
} as const;
