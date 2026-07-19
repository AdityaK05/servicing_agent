/**
 * Framer Motion Variants — Hybrid Fintech
 *
 * Two distinct motion tiers:
 *   1. Landing / Marketing — rich, cinematic (staggered reveals, parallax, blur)
 *   2. Chat Flow — calm, snappy (subtle slide-ins, morphs, receipts)
 *
 * Import these variants in components. NEVER redefine animation logic inline.
 *
 * Usage:
 *   import { fadeInUp, staggerChildren } from "@/lib/motion";
 *   <motion.div variants={fadeInUp} initial="hidden" animate="visible" />
 */

import { type Variants, type Transition } from "framer-motion";

// ─────────────────────────────────────────────────────────────────
// Transition Presets
// ─────────────────────────────────────────────────────────────────

/** Organic spring — default for landing animations */
export const springTransition: Transition = {
  type: "spring",
  stiffness: 300,
  damping: 30,
};

/** Smooth cubic bezier — polished marketing feel */
export const smoothTransition: Transition = {
  type: "tween",
  ease: [0.25, 0.1, 0.25, 1],
  duration: 0.5,
};

/** Tight spring — chat interactions that need to feel instant */
export const snappyTransition: Transition = {
  type: "spring",
  stiffness: 500,
  damping: 35,
  mass: 0.8,
};

// ─────────────────────────────────────────────────────────────────
// Landing / Marketing Variants (heavy animation)
// ─────────────────────────────────────────────────────────────────

/** Standard fade + slide up — workhorse for section reveals */
export const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 40 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { ...smoothTransition, duration: 0.7 },
  },
};

/** Fade + slide down — nav bars, dropdowns */
export const fadeInDown: Variants = {
  hidden: { opacity: 0, y: -30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: smoothTransition,
  },
};

/** Scale entrance — cards, modals, feature highlights */
export const fadeInScale: Variants = {
  hidden: { opacity: 0, scale: 0.92 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: springTransition,
  },
};

/** Container variant — staggers its children's "visible" state */
export const staggerChildren: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.12,
      delayChildren: 0.1,
    },
  },
};

/** Faster stagger — lists, grids with many items */
export const staggerChildrenFast: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.06,
      delayChildren: 0.05,
    },
  },
};

/** Scroll-triggered parallax — use with whileInView */
export const parallaxY = (offset: number = 50): Variants => ({
  hidden: { y: offset },
  visible: {
    y: 0,
    transition: { ...smoothTransition, duration: 0.9 },
  },
});

/** Hero entrance — dramatic blur + slide for above-the-fold */
export const heroReveal: Variants = {
  hidden: { opacity: 0, y: 60, filter: "blur(8px)" },
  visible: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { ...smoothTransition, duration: 0.9 },
  },
};

/** Card imagery — 3D tilt entrance for credit card visuals */
export const cardFloat: Variants = {
  hidden: { opacity: 0, y: 80, rotateX: 15 },
  visible: {
    opacity: 1,
    y: 0,
    rotateX: 0,
    transition: { type: "spring", stiffness: 200, damping: 25 },
  },
};

// ─────────────────────────────────────────────────────────────────
// Chat Flow Variants (calm, snappy)
// ─────────────────────────────────────────────────────────────────

/** Agent message — slides in from left */
export const messageSlideIn: Variants = {
  hidden: { opacity: 0, x: -12, scale: 0.97 },
  visible: {
    opacity: 1,
    x: 0,
    scale: 1,
    transition: snappyTransition,
  },
  exit: {
    opacity: 0,
    x: -8,
    transition: { duration: 0.15 },
  },
};

/** User message — slides in from right */
export const messageSlideInRight: Variants = {
  hidden: { opacity: 0, x: 12, scale: 0.97 },
  visible: {
    opacity: 1,
    x: 0,
    scale: 1,
    transition: snappyTransition,
  },
  exit: {
    opacity: 0,
    x: 8,
    transition: { duration: 0.15 },
  },
};

/** Typing indicator — bouncing dots */
export const typingDot: Variants = {
  hidden: { opacity: 0.3, y: 0 },
  visible: {
    opacity: [0.3, 1, 0.3],
    y: [0, -4, 0],
    transition: {
      duration: 1.2,
      repeat: Infinity,
      ease: "easeInOut",
    },
  },
};

/** Checkmark morph — SVG path draw on approval */
export const checkmarkMorph: Variants = {
  hidden: { pathLength: 0, opacity: 0 },
  visible: {
    pathLength: 1,
    opacity: 1,
    transition: { ...springTransition, duration: 0.4 },
  },
};

/** Audit trail / ledger — receipt-like accordion reveal */
export const ledgerSlide: Variants = {
  hidden: { height: 0, opacity: 0 },
  visible: {
    height: "auto",
    opacity: 1,
    transition: {
      height: { type: "spring", stiffness: 400, damping: 35 },
      opacity: { duration: 0.25, delay: 0.05 },
    },
  },
  exit: {
    height: 0,
    opacity: 0,
    transition: {
      height: { duration: 0.2 },
      opacity: { duration: 0.1 },
    },
  },
};

/** Subtle pulse — live/active status indicators */
export const subtlePulse: Variants = {
  hidden: { opacity: 0.6 },
  visible: {
    opacity: [0.6, 1, 0.6],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: "easeInOut",
    },
  },
};
