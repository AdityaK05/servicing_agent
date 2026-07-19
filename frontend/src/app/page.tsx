"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { useRef, useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import {
  heroReveal,
  fadeInUp,
  fadeInScale,
  staggerChildren,
  parallaxY,
  cardFloat,
} from "@/lib/motion";
import MagneticButton from "@/components/MagneticButton";

// ─── Feature card data ──────────────────────────────────────────
const features = [
  {
    title: "Fee Waiver",
    description:
      "Instantly request annual fee waivers. Our AI evaluates your account history and loyalty tier to approve in seconds — no hold queues, no transfers.",
    icon: FeatureIconWaiver,
    accent: "from-brand-gold/20 to-brand-gold/5",
  },
  {
    title: "Limit Increase",
    description:
      "Smart credit limit adjustments based on real-time spending patterns. Pre-qualified offers surface automatically when you're eligible.",
    icon: FeatureIconLimit,
    accent: "from-brand-green-100/60 to-brand-green-50/30",
  },
  {
    title: "Card Replacement",
    description:
      "Lost or damaged card? Initiate a replacement in one message. Track shipping, set temporary digital card access, and freeze instantly.",
    icon: FeatureIconReplace,
    accent: "from-brand-cream-300/60 to-brand-cream-100/30",
  },
] as const;

// ─── Page ───────────────────────────────────────────────────────
export default function Home() {
  return (
    <main className="relative overflow-x-hidden">
      <HeroSection />
      <FeaturesSection />
      <CTASection />
    </main>
  );
}

// ─── Hero ───────────────────────────────────────────────────────
function HeroSection() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"],
  });
  const backgroundY = useTransform(scrollYProgress, [0, 1], ["0%", "30%"]);
  const opacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);

  const [user, setUser] = useState<any>(null);
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
    });
  }, []);

  return (
    <section
      ref={containerRef}
      className="relative flex min-h-[100dvh] items-center justify-center overflow-hidden"
    >
      {/* Parallax background gradient */}
      <motion.div
        className="pointer-events-none absolute inset-0 -z-10"
        style={{ y: backgroundY }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-brand-cream-50 via-brand-cream-200 to-brand-cream-300" />
        {/* Decorative radial glow */}
        <div
          className="absolute left-1/2 top-1/3 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-30"
          style={{
            background:
              "radial-gradient(circle, rgba(201,164,76,0.25) 0%, transparent 70%)",
          }}
        />
      </motion.div>

      <motion.div
        className="relative z-10 mx-auto max-w-container px-6 text-center"
        style={{ opacity }}
      >
        {/* Stagger container for sequential child reveals */}
        <motion.div
          variants={staggerChildren}
          initial="hidden"
          animate="visible"
        >
          {/* Badge */}
          <motion.div variants={fadeInUp} className="mb-6 flex justify-center items-center gap-4">
            <span className="inline-flex items-center gap-2 rounded-pill border border-brand-gold/30 bg-brand-gold-50 px-4 py-1.5 text-caption font-medium text-brand-gold-600">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-brand-gold animate-pulse" />
              AI-Powered Card Servicing
            </span>
            {user && (
              <form action="/login" method="GET">
                <button
                  type="submit"
                  className="text-caption font-medium text-neutral-500 hover:text-brand-gold-600"
                  onClick={async (e) => {
                    e.preventDefault();
                    await supabase.auth.signOut();
                    window.location.reload();
                  }}
                >
                  Log out
                </button>
              </form>
            )}
          </motion.div>

          {/* Headline */}
          <motion.h1
            variants={heroReveal}
            className="heading-serif text-display-xl text-brand-green mx-auto max-w-[820px]"
          >
            Your card, managed{" "}
            <span className="text-gradient-gold">intelligently</span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            variants={fadeInUp}
            className="mx-auto mt-6 max-w-[560px] text-body-lg text-neutral-600"
          >
            Resolve account issues, adjust limits, and manage disputes — all
            through a single intelligent conversation.
          </motion.p>

          {/* CTA pair */}
          <motion.div
            variants={fadeInUp}
            className="mt-10 flex flex-wrap items-center justify-center gap-4"
          >
            <MagneticButton size="lg" href="#features">
              Explore Features
              <ArrowDown />
            </MagneticButton>
            {user ? (
              <MagneticButton variant="outline" size="lg" href="/chat">
                Open Chat
              </MagneticButton>
            ) : (
              <MagneticButton variant="outline" size="lg" href="/login">
                Log In / Sign Up
              </MagneticButton>
            )}
          </motion.div>
        </motion.div>

        {/* Floating card visual */}
        <motion.div
          variants={cardFloat}
          initial="hidden"
          animate="visible"
          className="mx-auto mt-16 max-w-[480px]"
        >
          <CreditCardVisual />
        </motion.div>
      </motion.div>

      {/* Scroll indicator */}
      <motion.div
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.8, duration: 0.6 }}
      >
        <motion.div
          className="flex h-10 w-6 items-start justify-center rounded-pill border-2 border-brand-green/20 p-1"
          animate={{ y: [0, 6, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        >
          <div className="h-2 w-1 rounded-full bg-brand-green/40" />
        </motion.div>
      </motion.div>
    </section>
  );
}

// ─── Features ───────────────────────────────────────────────────
function FeaturesSection() {
  return (
    <section
      id="features"
      className="relative bg-white py-section"
    >
      {/* Top divider */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-green/10 to-transparent" />

      <div className="mx-auto max-w-container px-6">
        {/* Section header */}
        <motion.div
          variants={staggerChildren}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          className="mb-16 text-center"
        >
          <motion.span
            variants={fadeInUp}
            className="mb-3 block text-caption font-semibold uppercase tracking-widest text-brand-gold"
          >
            What We Handle
          </motion.span>
          <motion.h2
            variants={fadeInUp}
            className="heading-serif text-display text-brand-green"
          >
            Servicing, simplified
          </motion.h2>
          <motion.p
            variants={fadeInUp}
            className="mx-auto mt-4 max-w-[480px] text-body text-neutral-500"
          >
            Three of the most requested card operations — resolved in a single
            conversation turn.
          </motion.p>
        </motion.div>

        {/* Cards grid */}
        <motion.div
          variants={staggerChildren}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-60px" }}
          className="grid gap-8 md:grid-cols-3"
        >
          {features.map((feature, i) => (
            <FeatureCard key={feature.title} feature={feature} index={i} />
          ))}
        </motion.div>
      </div>
    </section>
  );
}

// ─── Feature Card ───────────────────────────────────────────────
function FeatureCard({
  feature,
  index,
}: {
  feature: (typeof features)[number];
  index: number;
}) {
  const Icon = feature.icon;

  return (
    <motion.div
      variants={fadeInScale}
      className="group relative rounded-card border border-neutral-100 bg-white p-8 shadow-card transition-shadow duration-300 hover:shadow-card-hover"
    >
      {/* Accent gradient */}
      <div
        className={`absolute inset-0 rounded-card bg-gradient-to-br ${feature.accent} opacity-0 transition-opacity duration-300 group-hover:opacity-100`}
      />

      <div className="relative z-10">
        {/* Icon */}
        <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-xl bg-brand-cream-200">
          <Icon />
        </div>

        {/* Number badge */}
        <span className="mb-4 block text-caption font-semibold text-brand-gold">
          0{index + 1}
        </span>

        <h3 className="heading-serif text-heading text-brand-green">
          {feature.title}
        </h3>
        <p className="mt-3 text-body-sm text-neutral-500 leading-relaxed">
          {feature.description}
        </p>

        {/* Learn more link */}
        <motion.a
          href="/chat"
          className="mt-6 inline-flex items-center gap-1.5 text-body-sm font-semibold text-brand-green cursor-pointer"
          whileHover={{ x: 4 }}
          transition={{ type: "spring", stiffness: 400, damping: 25 }}
        >
          Learn more
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            className="transition-transform duration-200 group-hover:translate-x-0.5"
          >
            <path
              d="M6 12L10 8L6 4"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </motion.a>
      </div>
    </motion.div>
  );
}

// ─── CTA Section ────────────────────────────────────────────────
function CTASection() {
  return (
    <section className="relative overflow-hidden bg-brand-green py-section">
      {/* Decorative elements */}
      <div
        className="pointer-events-none absolute -right-32 -top-32 h-[400px] w-[400px] rounded-full opacity-10"
        style={{
          background:
            "radial-gradient(circle, rgba(201,164,76,0.6) 0%, transparent 70%)",
        }}
      />
      <div
        className="pointer-events-none absolute -bottom-20 -left-20 h-[300px] w-[300px] rounded-full opacity-10"
        style={{
          background:
            "radial-gradient(circle, rgba(201,164,76,0.4) 0%, transparent 70%)",
        }}
      />

      <motion.div
        variants={staggerChildren}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-80px" }}
        className="relative z-10 mx-auto max-w-container px-6 text-center"
      >
        <motion.h2
          variants={fadeInUp}
          className="heading-serif text-display-lg text-brand-cream-50"
        >
          Ready to get started?
        </motion.h2>
        <motion.p
          variants={fadeInUp}
          className="mx-auto mt-5 max-w-[440px] text-body-lg text-brand-cream-300"
        >
          Start a conversation with our AI agent and resolve your card issue in
          under two minutes.
        </motion.p>
        <motion.div variants={fadeInUp} className="mt-10">
          <MagneticButton
            size="lg"
            variant="outline"
            href="/chat"
            className="!border-brand-cream-300 !text-brand-cream-50 hover:!bg-brand-cream-50 hover:!text-brand-green"
          >
            Launch Servicing Agent
            <svg
              width="18"
              height="18"
              viewBox="0 0 18 18"
              fill="none"
              className="ml-1"
            >
              <path
                d="M9 3.75V14.25M9 3.75L4.5 8.25M9 3.75L13.5 8.25"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="rotate-90"
              />
            </svg>
          </MagneticButton>
        </motion.div>

        {/* Trust bar */}
        <motion.div
          variants={fadeInUp}
          className="mt-16 flex flex-wrap items-center justify-center gap-8 text-caption text-brand-cream-400"
        >
          <span className="flex items-center gap-2">
            <LockIcon />
            256-bit encryption
          </span>
          <span className="h-4 w-px bg-brand-cream-400/30" />
          <span className="flex items-center gap-2">
            <ShieldIcon />
            PCI DSS compliant
          </span>
          <span className="h-4 w-px bg-brand-cream-400/30" />
          <span className="flex items-center gap-2">
            <ClockIcon />
            24/7 availability
          </span>
        </motion.div>
      </motion.div>
    </section>
  );
}

// ─── Inline SVG Icons ───────────────────────────────────────────
// Kept as small components to avoid an icon library dependency.

function ArrowDown() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path
        d="M8 3V13M8 13L13 8M8 13L3 8"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <rect x="2.5" y="6" width="9" height="6.5" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
      <path d="M4.5 6V4.5a2.5 2.5 0 015 0V6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path
        d="M7 1.5L2.5 3.5V6.5C2.5 9.5 4.5 11.8 7 12.5C9.5 11.8 11.5 9.5 11.5 6.5V3.5L7 1.5Z"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.2" />
      <path d="M7 4V7.5L9 9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

function FeatureIconWaiver() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
      <path
        d="M14 2L6 6V14C6 20 9.5 24.5 14 26C18.5 24.5 22 20 22 14V6L14 2Z"
        stroke="#0B3D2E"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="M10 14L13 17L18 11"
        stroke="#C9A44C"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function FeatureIconLimit() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
      <rect
        x="4"
        y="6"
        width="20"
        height="16"
        rx="3"
        stroke="#0B3D2E"
        strokeWidth="1.8"
      />
      <path
        d="M14 11V17M14 11L11 14M14 11L17 14"
        stroke="#C9A44C"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function FeatureIconReplace() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
      <rect
        x="3"
        y="7"
        width="16"
        height="12"
        rx="2.5"
        stroke="#0B3D2E"
        strokeWidth="1.8"
      />
      <rect
        x="9"
        y="10"
        width="16"
        height="12"
        rx="2.5"
        stroke="#0B3D2E"
        strokeWidth="1.8"
        fill="white"
      />
      <path
        d="M14 16H21"
        stroke="#C9A44C"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M14 19H18"
        stroke="#C9A44C"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

// ─── Credit Card Visual ─────────────────────────────────────────
function CreditCardVisual() {
  return (
    <div className="perspective-[1200px]">
      <div className="relative mx-auto aspect-[1.6/1] w-full max-w-[420px] rounded-2xl bg-gradient-to-br from-brand-green via-brand-green-600 to-brand-green-800 p-8 shadow-elevated">
        {/* Card sheen */}
        <div
          className="pointer-events-none absolute inset-0 rounded-2xl opacity-20"
          style={{
            background:
              "linear-gradient(135deg, transparent 30%, rgba(255,255,255,0.15) 50%, transparent 70%)",
          }}
        />

        {/* Chip */}
        <div className="mb-8 flex items-start justify-between">
          <div className="h-10 w-14 rounded-lg bg-gradient-to-br from-brand-gold-200 to-brand-gold shadow-sm">
            <div className="ml-2 mt-2.5 h-5 w-8 rounded-sm border border-brand-gold-600/20" />
          </div>
          <svg width="40" height="28" viewBox="0 0 40 28" fill="none">
            <circle cx="14" cy="14" r="12" fill="#C9A44C" opacity="0.8" />
            <circle cx="26" cy="14" r="12" fill="#C9A44C" opacity="0.5" />
          </svg>
        </div>

        {/* Card number */}
        <div className="mb-6 flex gap-4 font-mono text-body-lg tracking-[0.2em] text-brand-cream-100">
          <span>••••</span>
          <span>••••</span>
          <span>••••</span>
          <span>4821</span>
        </div>

        {/* Footer */}
        <div className="flex items-end justify-between">
          <div>
            <p className="text-[0.6rem] uppercase tracking-widest text-brand-cream-400">
              Card Member
            </p>
            <p className="mt-0.5 font-sans text-body-sm font-medium tracking-wide text-brand-cream-100">
              A. SERVICING
            </p>
          </div>
          <div className="text-right">
            <p className="text-[0.6rem] uppercase tracking-widest text-brand-cream-400">
              Valid Thru
            </p>
            <p className="mt-0.5 font-mono text-body-sm text-brand-cream-100">
              12/28
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
