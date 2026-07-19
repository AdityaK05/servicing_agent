"use client";

import { useState, useRef, useEffect, useCallback, type FormEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  messageSlideIn,
  messageSlideInRight,
  typingDot,
  fadeInUp,
  staggerChildrenFast,
  ledgerSlide,
  subtlePulse,
} from "@/lib/motion";
import { createClient } from "@/utils/supabase/client";
import AuditDrawer from "./components/AuditDrawer";
import HandoffCard from "./components/HandoffCard";

// ─── Types ──────────────────────────────────────────────────────

interface Message {
  id: string;
  role: "user" | "agent";
  content: string;
  timestamp: Date;
  intent?: {
    intent: string;
    confidence: number;
    entities: Record<string, string | null>;
  };
  handoff_packet?: any;
}

// ─── Page ───────────────────────────────────────────────────────

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [sessionId] = useState(() => crypto.randomUUID());
  const [showAuditTrail, setShowAuditTrail] = useState<string | null>(null);
  const [auditDrawerOpen, setAuditDrawerOpen] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [messages, isTyping]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const sendMessage = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      const text = input.trim();
      if (!text || isTyping) return;

      // Add user message
      const userMsg: Message = {
        id: crypto.randomUUID(),
        role: "user",
        content: text,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, userMsg]);
      setInput("");
      setIsTyping(true);

      try {
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();
        
        const headers: Record<string, string> = { 
          "Content-Type": "application/json" 
        };
        if (session?.access_token) {
          headers["Authorization"] = `Bearer ${session.access_token}`;
        }

        const res = await fetch("/api/chat", {
          method: "POST",
          headers,
          body: JSON.stringify({ session_id: sessionId, message: text }),
        });

        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const data = await res.json();

        const agentMsg: Message = {
          id: data.message.id,
          role: "agent",
          content: data.message.content,
          timestamp: new Date(data.message.timestamp),
          intent: data.intent,
          handoff_packet: data.handoff_packet,
        };
        setMessages((prev) => [...prev, agentMsg]);
      } catch (err) {
        // Offline/error fallback
        const errorMsg: Message = {
          id: crypto.randomUUID(),
          role: "agent",
          content:
            "I'm having trouble connecting right now. Please try again in a moment.",
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, errorMsg]);
      } finally {
        setIsTyping(false);
      }
    },
    [input, isTyping, sessionId]
  );

  return (
    <div className="flex h-dvh flex-col bg-brand-cream-50">
      {/* ─── Audit Drawer ───────────────────────────────────── */}
      <AuditDrawer
        sessionId={sessionId}
        isOpen={auditDrawerOpen}
        onClose={() => setAuditDrawerOpen(false)}
      />
      {/* ─── Header ─────────────────────────────────────────── */}
      <header className="flex items-center justify-between border-b border-neutral-100 bg-white/80 px-6 py-3.5 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-green">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path
                d="M9 1.5L3 4.5V9C3 13 5.7 16.2 9 17C12.3 16.2 15 13 15 9V4.5L9 1.5Z"
                stroke="#F7F5EF"
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
              <path
                d="M7 9.5L8.5 11L11 7.5"
                stroke="#C9A44C"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <div>
            <h1 className="text-body font-semibold text-brand-green">
              Servicing Agent
            </h1>
            <div className="flex items-center gap-1.5">
              <motion.span
                variants={subtlePulse}
                initial="hidden"
                animate="visible"
                className="inline-block h-1.5 w-1.5 rounded-full bg-semantic-success"
              />
              <span className="text-caption text-neutral-400">Online</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setAuditDrawerOpen(true)}
            className="flex items-center gap-1.5 rounded-button bg-brand-cream-200 px-3 py-1.5 text-body-sm font-medium text-brand-green transition-colors hover:bg-brand-cream-300"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <rect x="2" y="2" width="10" height="10" rx="2" stroke="currentColor" strokeWidth="1.2" />
              <path d="M4.5 5.5H9.5M4.5 7.5H8M4.5 9.5H6.5" stroke="currentColor" strokeWidth="0.9" strokeLinecap="round" />
            </svg>
            Audit
          </button>
          <a
            href="/"
            className="rounded-button px-3 py-1.5 text-body-sm font-medium text-neutral-500 transition-colors hover:bg-neutral-50 hover:text-brand-green"
          >
            ← Back
          </a>
        </div>
      </header>

      {/* ─── Messages ───────────────────────────────────────── */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 py-6 md:px-6"
      >
        <div className="mx-auto max-w-chat space-y-1">
          {/* Welcome message */}
          {messages.length === 0 && !isTyping && <WelcomeState />}

          <AnimatePresence mode="popLayout">
            {messages.map((msg) => (
              <ChatBubble
                key={msg.id}
                message={msg}
                showAuditTrail={showAuditTrail === msg.id}
                onToggleAudit={() =>
                  setShowAuditTrail(
                    showAuditTrail === msg.id ? null : msg.id
                  )
                }
              />
            ))}
          </AnimatePresence>

          {/* Typing indicator */}
          <AnimatePresence>
            {isTyping && <TypingIndicator key="typing" />}
          </AnimatePresence>
        </div>
      </div>

      {/* ─── Input Bar ──────────────────────────────────────── */}
      <div className="border-t border-neutral-100 bg-white/80 px-4 py-3 backdrop-blur-md md:px-6">
        <form
          onSubmit={sendMessage}
          className="mx-auto flex max-w-chat items-center gap-3"
        >
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Describe your card issue..."
            disabled={isTyping}
            className="flex-1 rounded-input border border-neutral-200 bg-brand-cream-50 px-4 py-3 text-body text-brand-green placeholder:text-neutral-400 transition-all focus:border-brand-gold focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-gold/20 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!input.trim() || isTyping}
            className="flex h-[48px] w-[48px] shrink-0 items-center justify-center rounded-input bg-brand-green text-brand-cream-50 transition-all hover:bg-brand-green-600 active:scale-95 disabled:opacity-40 disabled:hover:bg-brand-green"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path
                d="M4 10H16M16 10L11 5M16 10L11 15"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </form>
        <p className="mx-auto mt-2 max-w-chat text-center text-caption text-neutral-400">
          AI-powered responses · Your data is encrypted end-to-end
        </p>
      </div>
    </div>
  );
}

// ─── Chat Bubble ────────────────────────────────────────────────

function ChatBubble({
  message,
  showAuditTrail,
  onToggleAudit,
}: {
  message: Message;
  showAuditTrail: boolean;
  onToggleAudit: () => void;
}) {
  const isUser = message.role === "user";

  return (
    <motion.div
      layout
      variants={isUser ? messageSlideInRight : messageSlideIn}
      initial="hidden"
      animate="visible"
      exit="exit"
      className={`flex ${isUser ? "justify-end" : "justify-start"}`}
    >
      <div className={`max-w-[85%] md:max-w-[75%] ${isUser ? "" : "flex gap-2.5"}`}>
        {/* Agent avatar */}
        {!isUser && (
          <div className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand-green-50">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path
                d="M7 1L2 3.5V7C2 10.5 4.2 13 7 13.5C9.8 13 12 10.5 12 7V3.5L7 1Z"
                stroke="#0B3D2E"
                strokeWidth="1.2"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        )}

        <div>
          {/* Bubble */}
          <div
            className={`rounded-chat px-4 py-3 ${
              isUser
                ? "bg-brand-green text-brand-cream-50 shadow-chat-bubble"
                : "bg-white text-brand-green shadow-chat-bubble border border-neutral-100"
            }`}
          >
            <p className="text-body-sm leading-relaxed whitespace-pre-wrap">
              {message.content}
            </p>
          </div>

          {/* Handoff Packet */}
          {message.handoff_packet && (
            <div className="mt-2 w-full max-w-sm">
              <HandoffCard packet={message.handoff_packet} />
            </div>
          )}

          {/* Meta row — timestamp + audit trail toggle */}
          <div
            className={`mt-1 flex items-center gap-2 px-1 ${
              isUser ? "justify-end" : "justify-start"
            }`}
          >
            <span className="text-[0.65rem] text-neutral-400">
              {message.timestamp.toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>

            {/* Audit trail toggle for agent messages with intent */}
            {!isUser && message.intent && (
              <button
                onClick={onToggleAudit}
                className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[0.65rem] font-medium text-neutral-400 transition-colors hover:bg-neutral-50 hover:text-brand-green"
              >
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <rect
                    x="1"
                    y="1"
                    width="8"
                    height="8"
                    rx="1.5"
                    stroke="currentColor"
                    strokeWidth="1"
                  />
                  <path d="M3 4H7M3 6H5.5" stroke="currentColor" strokeWidth="0.8" strokeLinecap="round" />
                </svg>
                {showAuditTrail ? "Hide" : "Audit"}
              </button>
            )}
          </div>

          {/* Audit trail — receipt-style ledger */}
          <AnimatePresence>
            {showAuditTrail && message.intent && (
              <motion.div
                variants={ledgerSlide}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="mt-1 overflow-hidden"
              >
                <div className="rounded-lg border border-dashed border-neutral-200 bg-neutral-50 px-3 py-2.5">
                  <p className="mb-1.5 text-[0.65rem] font-semibold uppercase tracking-widest text-neutral-400">
                    Classification Receipt
                  </p>
                  <div className="space-y-1 text-caption text-neutral-600">
                    <div className="flex justify-between">
                      <span>Intent</span>
                      <span className="font-mono font-medium text-brand-green">
                        {message.intent.intent}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Confidence</span>
                      <span className="font-mono">
                        {(message.intent.confidence * 100).toFixed(0)}%
                      </span>
                    </div>
                    {message.intent.entities &&
                      Object.entries(message.intent.entities).map(
                        ([key, val]) =>
                          val && (
                            <div key={key} className="flex justify-between">
                              <span className="capitalize">
                                {key.replace(/_/g, " ")}
                              </span>
                              <span className="font-mono">{val}</span>
                            </div>
                          )
                      )}
                  </div>
                  <div className="mt-2 h-px bg-neutral-200" />
                  <p className="mt-1.5 text-[0.6rem] text-neutral-400">
                    {message.timestamp.toISOString()}
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Typing Indicator ───────────────────────────────────────────

function TypingIndicator() {
  return (
    <motion.div
      variants={messageSlideIn}
      initial="hidden"
      animate="visible"
      exit="exit"
      className="flex justify-start"
    >
      <div className="flex gap-2.5">
        <div className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand-green-50">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path
              d="M7 1L2 3.5V7C2 10.5 4.2 13 7 13.5C9.8 13 12 10.5 12 7V3.5L7 1Z"
              stroke="#0B3D2E"
              strokeWidth="1.2"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <div className="flex items-center gap-1 rounded-chat bg-white px-4 py-3 shadow-chat-bubble border border-neutral-100">
          {[0, 1, 2].map((i) => (
            <motion.span
              key={i}
              variants={typingDot}
              initial="hidden"
              animate="visible"
              className="inline-block h-2 w-2 rounded-full bg-brand-green/40"
              style={{ animationDelay: `${i * 0.15}s` }}
              transition={{
                duration: 1.2,
                repeat: Infinity,
                ease: "easeInOut",
                delay: i * 0.2,
              }}
            />
          ))}
        </div>
      </div>
    </motion.div>
  );
}

// ─── Welcome State ──────────────────────────────────────────────

function WelcomeState() {
  return (
    <motion.div
      variants={staggerChildrenFast}
      initial="hidden"
      animate="visible"
      className="flex flex-col items-center py-16 text-center"
    >
      {/* Logo */}
      <motion.div
        variants={fadeInUp}
        className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-green shadow-card"
      >
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
          <path
            d="M14 2L6 6V14C6 20 9.5 24.5 14 26C18.5 24.5 22 20 22 14V6L14 2Z"
            stroke="#F7F5EF"
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
      </motion.div>

      <motion.h2
        variants={fadeInUp}
        className="heading-serif text-heading-lg text-brand-green"
      >
        How can I help you today?
      </motion.h2>

      <motion.p
        variants={fadeInUp}
        className="mt-2 max-w-sm text-body-sm text-neutral-500"
      >
        I can assist with fee waivers, limit increases, card replacements, and
        more. Just describe your issue below.
      </motion.p>

      {/* Quick action chips */}
      <motion.div
        variants={fadeInUp}
        className="mt-8 flex flex-wrap justify-center gap-2"
      >
        {[
          "Waive my annual fee",
          "Increase my limit",
          "Replace my card",
        ].map((label) => (
          <QuickChip key={label} label={label} />
        ))}
      </motion.div>
    </motion.div>
  );
}

function QuickChip({ label }: { label: string }) {
  return (
    <button
      onClick={() => {
        // Find the input and set its value via a native input event
        const input = document.querySelector<HTMLInputElement>(
          'input[type="text"]'
        );
        if (input) {
          const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
            window.HTMLInputElement.prototype,
            "value"
          )?.set;
          nativeInputValueSetter?.call(input, label);
          input.dispatchEvent(new Event("input", { bubbles: true }));
          input.focus();
        }
      }}
      className="rounded-pill border border-neutral-200 bg-white px-4 py-2 text-body-sm text-neutral-600 shadow-sm transition-all hover:border-brand-gold/40 hover:bg-brand-gold-50 hover:text-brand-green hover:shadow-gold-glow/20 active:scale-[0.97]"
    >
      {label}
    </button>
  );
}
