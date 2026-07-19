"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ledgerSlide,
  fadeInUp,
  staggerChildrenFast,
  checkmarkMorph,
  springTransition,
} from "@/lib/motion";

// ─── Types ──────────────────────────────────────────────────────

interface AuditEntry {
  timestamp: string;
  session_id: string;
  node: string;
  input: Record<string, unknown>;
  output: Record<string, unknown>;
  decision_reason: string;
  prev_hash: string;
  hash: string;
}

interface VerifyResult {
  session_id: string;
  total_entries: number;
  tampered: boolean;
  first_tampered_index: number | null;
  verified_at: string;
}

interface AuditDrawerProps {
  sessionId: string;
  isOpen: boolean;
  onClose: () => void;
}

// ─── Node display config ────────────────────────────────────────

const NODE_META: Record<string, { label: string; icon: string; color: string }> = {
  collect_slots:     { label: "Slot Collection",    icon: "📋", color: "text-brand-gold" },
  check_eligibility: { label: "Eligibility Check",  icon: "🔍", color: "text-semantic-info" },
  apply_policy:      { label: "Policy Evaluation",  icon: "⚖️", color: "text-brand-green" },
  execute_action:    { label: "Action Execution",   icon: "⚡", color: "text-semantic-success" },
  confirm:           { label: "Confirmation",        icon: "✅", color: "text-semantic-success" },
  escalate:          { label: "Escalation",          icon: "🚨", color: "text-semantic-error" },
};

// ─── Component ──────────────────────────────────────────────────

export default function AuditDrawer({ sessionId, isOpen, onClose }: AuditDrawerProps) {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [verifyResult, setVerifyResult] = useState<VerifyResult | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch audit chain
  const fetchChain = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/audit/${sessionId}`);
      if (!res.ok) {
        if (res.status === 404) {
          setEntries([]);
          return;
        }
        throw new Error(`HTTP ${res.status}`);
      }
      const data = await res.json();
      setEntries(data.entries || []);
    } catch (err) {
      setError("Failed to load audit trail");
    } finally {
      setIsLoading(false);
    }
  }, [sessionId]);

  // Verify chain integrity
  const verifyChain = useCallback(async () => {
    setIsVerifying(true);
    setVerifyResult(null);
    try {
      const res = await fetch(`/api/audit/${sessionId}/verify`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setVerifyResult(data);
    } catch {
      setVerifyResult({
        session_id: sessionId,
        total_entries: entries.length,
        tampered: true,
        first_tampered_index: null,
        verified_at: new Date().toISOString(),
      });
    } finally {
      setIsVerifying(false);
    }
  }, [sessionId, entries.length]);

  // Fetch on open
  const handleOpen = useCallback(() => {
    if (isOpen) fetchChain();
  }, [isOpen, fetchChain]);

  // Trigger fetch when drawer opens
  useState(() => {
    if (isOpen) fetchChain();
  });

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-brand-green/20 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Drawer panel */}
          <motion.aside
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 400, damping: 35 }}
            className="fixed right-0 top-0 z-50 flex h-dvh w-full max-w-md flex-col border-l border-neutral-100 bg-white shadow-elevated"
          >
            {/* ─── Header ──────────────────────────────────── */}
            <div className="flex items-center justify-between border-b border-neutral-100 px-5 py-4">
              <div>
                <h2 className="text-heading-sm font-semibold text-brand-green">
                  Audit Trail
                </h2>
                <p className="mt-0.5 text-caption text-neutral-400">
                  Hash-chained transaction log
                </p>
              </div>
              <button
                onClick={onClose}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-400 transition-colors hover:bg-neutral-50 hover:text-brand-green"
              >
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <path d="M5 5L13 13M13 5L5 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            {/* ─── Verify Bar ──────────────────────────────── */}
            <div className="border-b border-neutral-100 px-5 py-3">
              <button
                onClick={verifyChain}
                disabled={isVerifying || entries.length === 0}
                className="flex w-full items-center justify-center gap-2 rounded-button bg-brand-cream-200 px-4 py-2.5 text-body-sm font-semibold text-brand-green transition-all hover:bg-brand-cream-300 active:scale-[0.98] disabled:opacity-40"
              >
                {isVerifying ? (
                  <>
                    <motion.span
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      className="inline-block"
                    >
                      ⟳
                    </motion.span>
                    Verifying…
                  </>
                ) : (
                  <>
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <path
                        d="M7 1L2 3.5V7C2 10.5 4.2 13 7 13.5C9.8 13 12 10.5 12 7V3.5L7 1Z"
                        stroke="currentColor"
                        strokeWidth="1.2"
                        strokeLinejoin="round"
                      />
                    </svg>
                    Verify Chain Integrity
                  </>
                )}
              </button>

              {/* Verify result badge */}
              <AnimatePresence>
                {verifyResult && (
                  <motion.div
                    variants={ledgerSlide}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    className="mt-2.5 overflow-hidden"
                  >
                    <VerifyBadge result={verifyResult} />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* ─── Entries ─────────────────────────────────── */}
            <div className="flex-1 overflow-y-auto px-5 py-4">
              {isLoading && (
                <div className="flex items-center justify-center py-12 text-neutral-400">
                  <motion.span
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="mr-2 inline-block text-lg"
                  >
                    ⟳
                  </motion.span>
                  Loading…
                </div>
              )}

              {error && (
                <div className="rounded-card bg-semantic-error/10 px-4 py-3 text-body-sm text-semantic-error">
                  {error}
                </div>
              )}

              {!isLoading && entries.length === 0 && !error && (
                <div className="py-12 text-center text-body-sm text-neutral-400">
                  No audit entries yet.
                  <br />
                  Send a message to start the trail.
                </div>
              )}

              {!isLoading && entries.length > 0 && (
                <motion.div
                  variants={staggerChildrenFast}
                  initial="hidden"
                  animate="visible"
                  className="space-y-3"
                >
                  {entries.map((entry, i) => (
                    <AuditEntryCard
                      key={entry.hash}
                      entry={entry}
                      index={i}
                      isTampered={
                        verifyResult?.tampered === true &&
                        verifyResult.first_tampered_index !== null &&
                        i >= verifyResult.first_tampered_index
                      }
                    />
                  ))}
                </motion.div>
              )}
            </div>

            {/* ─── Footer ──────────────────────────────────── */}
            <div className="border-t border-neutral-100 px-5 py-3 text-center text-caption text-neutral-400">
              {entries.length} entries · SHA-256 hash chain
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

// ─── Verify Badge ───────────────────────────────────────────────

function VerifyBadge({ result }: { result: VerifyResult }) {
  const isIntact = !result.tampered;

  return (
    <div
      className={`flex items-center gap-2.5 rounded-lg px-3 py-2.5 ${
        isIntact
          ? "bg-semantic-success/10 text-semantic-success"
          : "bg-semantic-error/10 text-semantic-error"
      }`}
    >
      {/* Checkmark / flag animation */}
      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white">
        {isIntact ? (
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <motion.path
              d="M4 8.5L7 11.5L12 5"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              variants={checkmarkMorph}
              initial="hidden"
              animate="visible"
            />
          </svg>
        ) : (
          <motion.svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            initial={{ scale: 0, rotate: -45 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={springTransition}
          >
            <path
              d="M8 3V9M8 12V12.01"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </motion.svg>
        )}
      </div>

      <div className="flex-1">
        <p className="text-body-sm font-semibold">
          {isIntact ? "Chain Verified" : "Tampering Detected"}
        </p>
        <p className="text-caption opacity-80">
          {isIntact
            ? `${result.total_entries} entries · All hashes match`
            : `Mismatch at entry #${(result.first_tampered_index ?? 0) + 1}`}
        </p>
      </div>
    </div>
  );
}

// ─── Audit Entry Card ───────────────────────────────────────────

function AuditEntryCard({
  entry,
  index,
  isTampered,
}: {
  entry: AuditEntry;
  index: number;
  isTampered: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const meta = NODE_META[entry.node] || {
    label: entry.node,
    icon: "🔷",
    color: "text-neutral-600",
  };

  const time = new Date(entry.timestamp).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  const isChainBreak = entry.decision_reason?.startsWith("CHAIN_BREAK");

  return (
    <motion.div
      variants={fadeInUp}
      className={`group rounded-lg border transition-colors ${
        isTampered
          ? "border-semantic-error/30 bg-semantic-error/5"
          : isChainBreak
          ? "border-brand-gold/30 bg-brand-gold-50/30"
          : "border-neutral-100 bg-white"
      }`}
    >
      {/* Header — always visible */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-3 px-3.5 py-3 text-left"
      >
        {/* Step number + icon */}
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-cream-100 text-sm">
          {meta.icon}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={`text-body-sm font-semibold ${meta.color}`}>
              {meta.label}
            </span>
            {isChainBreak && (
              <span className="rounded bg-brand-gold/15 px-1.5 py-0.5 text-[0.6rem] font-bold uppercase tracking-wider text-brand-gold-600">
                Break
              </span>
            )}
            {isTampered && (
              <span className="rounded bg-semantic-error/15 px-1.5 py-0.5 text-[0.6rem] font-bold uppercase tracking-wider text-semantic-error">
                Tampered
              </span>
            )}
          </div>
          <p className="truncate text-caption text-neutral-400">
            {entry.decision_reason}
          </p>
        </div>

        <span className="shrink-0 text-caption text-neutral-400">{time}</span>
        <svg
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="none"
          className={`shrink-0 text-neutral-300 transition-transform ${expanded ? "rotate-180" : ""}`}
        >
          <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </button>

      {/* Expanded detail — hash + data */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            variants={ledgerSlide}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="overflow-hidden"
          >
            <div className="border-t border-dashed border-neutral-100 px-3.5 py-3 text-caption">
              {/* Hash */}
              <div className="mb-2">
                <span className="font-semibold text-neutral-500">Hash</span>
                <p className="mt-0.5 break-all font-mono text-[0.65rem] text-neutral-400">
                  {entry.hash}
                </p>
              </div>

              {/* Prev hash */}
              <div className="mb-2">
                <span className="font-semibold text-neutral-500">Prev Hash</span>
                <p className="mt-0.5 break-all font-mono text-[0.65rem] text-neutral-400">
                  {entry.prev_hash}
                </p>
              </div>

              {/* Input snapshot */}
              {entry.input && Object.keys(entry.input).length > 0 && (
                <div className="mb-2">
                  <span className="font-semibold text-neutral-500">Input</span>
                  <pre className="mt-0.5 max-h-24 overflow-auto rounded bg-neutral-50 p-2 font-mono text-[0.65rem] text-neutral-600">
                    {JSON.stringify(entry.input, null, 2)}
                  </pre>
                </div>
              )}

              {/* Output snapshot */}
              {entry.output && Object.keys(entry.output).length > 0 && (
                <div>
                  <span className="font-semibold text-neutral-500">Output</span>
                  <pre className="mt-0.5 max-h-24 overflow-auto rounded bg-neutral-50 p-2 font-mono text-[0.65rem] text-neutral-600">
                    {JSON.stringify(entry.output, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
