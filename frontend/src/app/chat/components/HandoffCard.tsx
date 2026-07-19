"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
  fadeInScale,
  fadeInUp,
  staggerChildren,
  checkmarkMorph,
  springTransition,
} from "@/lib/motion";

// ─── Types ──────────────────────────────────────────────────────

interface HandoffPacket {
  intent: string;
  confidence: number;
  failed_node: string;
  break_reason: string;
  customer_id: string | null;
  slots: Record<string, string>;
  checks_passed: string[];
  checks_failed: string[];
  policy_result: {
    eligible: boolean | null;
    reason: string | null;
  } | null;
  summary: string | null;
  timestamp: string;
}

interface HandoffCardProps {
  packet: HandoffPacket;
}

// ─── Component ──────────────────────────────────────────────────

export default function HandoffCard({ packet }: HandoffCardProps) {
  return (
    <motion.div
      variants={fadeInScale}
      initial="hidden"
      animate="visible"
      className="my-3 overflow-hidden rounded-card border border-brand-gold/30 bg-gradient-to-br from-white to-brand-gold-50/30 shadow-card"
    >
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-brand-gold/15 px-5 py-3.5">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-gold/10">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path
              d="M9 2L4 5V9.5C4 13.5 6.5 16 9 17C11.5 16 14 13.5 14 9.5V5L9 2Z"
              stroke="#C9A44C"
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
            <path
              d="M9 7V10M9 12.5V12.51"
              stroke="#C9A44C"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </div>
        <div className="flex-1">
          <p className="text-body-sm font-semibold text-brand-green">
            Escalation Handoff
          </p>
          <p className="text-caption text-neutral-400">
            Here&apos;s exactly what the agent will see
          </p>
        </div>
        <span className="rounded-pill bg-brand-gold/15 px-2.5 py-1 text-[0.65rem] font-bold uppercase tracking-wider text-brand-gold-600">
          {packet.intent.replace(/_/g, " ")}
        </span>
      </div>

      {/* Body */}
      <motion.div
        variants={staggerChildren}
        initial="hidden"
        animate="visible"
        className="px-5 py-4 space-y-3"
      >
        {/* Summary */}
        {packet.summary && (
          <motion.div variants={fadeInUp}>
            <p className="text-body-sm leading-relaxed text-brand-green">
              {packet.summary}
            </p>
          </motion.div>
        )}

        {/* Checks section */}
        <motion.div variants={fadeInUp} className="space-y-1.5">
          {/* Passed checks */}
          {packet.checks_passed.map((check, i) => (
            <div key={`pass-${i}`} className="flex items-start gap-2">
              <svg
                width="14"
                height="14"
                viewBox="0 0 14 14"
                fill="none"
                className="mt-0.5 shrink-0 text-semantic-success"
              >
                <motion.path
                  d="M3.5 7.5L5.5 9.5L10.5 4.5"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  variants={checkmarkMorph}
                  initial="hidden"
                  animate="visible"
                />
              </svg>
              <span className="text-caption text-neutral-600">{check}</span>
            </div>
          ))}

          {/* Failed checks */}
          {packet.checks_failed.map((check, i) => (
            <div key={`fail-${i}`} className="flex items-start gap-2">
              <motion.svg
                width="14"
                height="14"
                viewBox="0 0 14 14"
                fill="none"
                className="mt-0.5 shrink-0 text-semantic-error"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={springTransition}
              >
                <path
                  d="M4.5 4.5L9.5 9.5M9.5 4.5L4.5 9.5"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </motion.svg>
              <span className="text-caption text-semantic-error font-medium">
                {check}
              </span>
            </div>
          ))}
        </motion.div>

        {/* Details grid */}
        <motion.div
          variants={fadeInUp}
          className="rounded-lg border border-dashed border-neutral-200 bg-neutral-50/50 px-3.5 py-2.5"
        >
          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-caption">
            <DetailRow
              label="Failed At"
              value={packet.failed_node.replace(/_/g, " ")}
              highlight
            />
            <DetailRow
              label="Confidence"
              value={`${(packet.confidence * 100).toFixed(0)}%`}
            />
            {packet.customer_id && (
              <DetailRow label="Customer" value={packet.customer_id} />
            )}
            {packet.slots &&
              Object.entries(packet.slots).map(([k, v]) => (
                <DetailRow
                  key={k}
                  label={k.replace(/_/g, " ")}
                  value={v}
                />
              ))}
            {packet.policy_result?.reason && (
              <DetailRow
                label="Policy"
                value={packet.policy_result.reason.replace(/_/g, " ")}
                span
              />
            )}
          </div>
        </motion.div>
      </motion.div>

      {/* Footer */}
      <div className="border-t border-brand-gold/15 px-5 py-2.5">
        <p className="text-[0.6rem] text-neutral-400">
          Handoff generated at{" "}
          {new Date(packet.timestamp).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          })}
          {" · "}
          Full audit trail available in the Audit panel
        </p>
      </div>
    </motion.div>
  );
}

// ─── Detail Row ─────────────────────────────────────────────────

function DetailRow({
  label,
  value,
  highlight,
  span,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  span?: boolean;
}) {
  return (
    <div className={`flex justify-between ${span ? "col-span-2" : ""}`}>
      <span className="capitalize text-neutral-400">{label}</span>
      <span
        className={`font-mono ${
          highlight ? "font-medium text-semantic-error" : "text-neutral-600"
        }`}
      >
        {value}
      </span>
    </div>
  );
}
