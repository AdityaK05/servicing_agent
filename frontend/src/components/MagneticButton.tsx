"use client";

import { useRef, useState, type ReactNode, type MouseEvent } from "react";
import { motion } from "framer-motion";
import { springTransition } from "@/lib/motion";

/**
 * MagneticButton — reusable CTA with magnetic hover effect.
 *
 * The button subtly follows the cursor within a configurable radius,
 * snapping back on leave via the shared `springTransition`.
 *
 * Usage:
 *   <MagneticButton>Get Started</MagneticButton>
 *   <MagneticButton variant="outline" size="lg">Learn More</MagneticButton>
 */

interface MagneticButtonProps {
  children: ReactNode;
  variant?: "primary" | "outline" | "ghost";
  size?: "md" | "lg";
  /** How far the button follows the cursor (px). Default 0.35 = 35% of distance */
  strength?: number;
  className?: string;
  onClick?: () => void;
  href?: string;
}

const variantStyles: Record<string, string> = {
  primary:
    "bg-brand-green text-brand-cream-50 shadow-card hover:shadow-card-hover",
  outline:
    "bg-transparent text-brand-green border-2 border-brand-green hover:bg-brand-green hover:text-brand-cream-50",
  ghost:
    "bg-transparent text-brand-green hover:bg-brand-green-50",
};

const sizeStyles: Record<string, string> = {
  md: "px-7 py-3 text-body-sm",
  lg: "px-10 py-4 text-body",
};

export default function MagneticButton({
  children,
  variant = "primary",
  size = "md",
  strength = 0.35,
  className = "",
  onClick,
  href,
}: MagneticButtonProps) {
  const ref = useRef<HTMLButtonElement | HTMLAnchorElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e: MouseEvent) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    setPosition({
      x: (e.clientX - centerX) * strength,
      y: (e.clientY - centerY) * strength,
    });
  };

  const handleMouseLeave = () => {
    setPosition({ x: 0, y: 0 });
  };

  const baseClasses = [
    "relative inline-flex items-center justify-center gap-2",
    "rounded-button font-sans font-semibold",
    "transition-colors duration-200",
    "cursor-pointer select-none",
    variantStyles[variant],
    sizeStyles[size],
    className,
  ].join(" ");

  const motionProps = {
    ref: ref as React.RefObject<HTMLButtonElement>,
    className: baseClasses,
    animate: { x: position.x, y: position.y },
    transition: springTransition,
    onMouseMove: handleMouseMove,
    onMouseLeave: handleMouseLeave,
    whileTap: { scale: 0.97 },
  };

  if (href) {
    return (
      <motion.a
        {...motionProps}
        ref={ref as React.RefObject<HTMLAnchorElement>}
        href={href}
      >
        {children}
        <GoldSheen />
      </motion.a>
    );
  }

  return (
    <motion.button {...motionProps} onClick={onClick}>
      {children}
      <GoldSheen />
    </motion.button>
  );
}

/** Subtle gold shimmer overlay on hover — keeps the Amex premium feel */
function GoldSheen() {
  return (
    <span
      aria-hidden
      className="pointer-events-none absolute inset-0 rounded-button opacity-0 transition-opacity duration-300 group-hover:opacity-100"
      style={{
        background:
          "linear-gradient(105deg, transparent 40%, rgba(201,164,76,0.12) 50%, transparent 60%)",
      }}
    />
  );
}
