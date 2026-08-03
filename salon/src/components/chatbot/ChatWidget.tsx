import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { getBotReply } from "./chatEngine";

type Message = {
  id: number;
  role: "user" | "bot";
  text: string;
  quickReplies?: string[];
};

const ROUTE_MAP: Record<string, string> = {
  "Book an appointment": "/booking",
  "Take me to booking": "/booking",
  "Book a keratin treatment": "/booking",
  "Book lash extensions": "/booking",
  "Book a manicure": "/booking",
  "Book with": "/booking",
  "Shop products": "/products",
  "Shop all products": "/products",
  "See products": "/products",
  "Buy a gift card": "/products",
  "See services": "/services",
  "See full menu": "/services",
  "See color services": "/services",
  "See beauty services": "/services",
  "See related services": "/services",
  "Meet the team": "/team",
  "Contact page": "/contact",
  "Contact us": "/contact",
};

let idSeq = 1;
const nextId = () => idSeq++;

const GREETING: Message = {
  id: 0,
  role: "bot",
  text: "Hi, I'm Lumi ✨ Lumière's AI beauty assistant. Ask me about services, pricing, products, or booking — I'm happy to help!",
  quickReplies: ["See services", "Shop products", "Book an appointment", "Studio hours"],
};

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([GREETING]);
  const [draft, setDraft] = useState("");
  const [typing, setTyping] = useState(false);
  const [hasNotified, setHasNotified] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, typing]);

  useEffect(() => {
    if (open) {
      setHasNotified(true);
      setTimeout(() => inputRef.current?.focus(), 250);
    }
  }, [open]);

  function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed) return;
    const userMsg: Message = { id: nextId(), role: "user", text: trimmed };
    setMessages((prev) => [...prev, userMsg]);
    setDraft("");
    setTyping(true);
    const delay = 450 + Math.random() * 500;
    setTimeout(() => {
      const reply = getBotReply(trimmed);
      setMessages((prev) => [...prev, { id: nextId(), role: "bot", text: reply.text, quickReplies: reply.quickReplies }]);
      setTyping(false);
    }, delay);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    send(draft);
  }

  return (
    <>
      {/* Floating launcher */}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Close chat with Lumi" : "Chat with Lumi, our AI beauty assistant"}
        className="fixed bottom-5 right-4 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-ink text-cream shadow-xl shadow-ink/20 transition-transform active:scale-95 sm:bottom-6 sm:right-6 sm:h-16 sm:w-16"
      >
        {open ? (
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
          </svg>
        ) : (
          <span className="relative flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.6">
              <path
                d="M4 12a8 8 0 1 1 3.2 6.4L4 20l1.1-3.5A7.96 7.96 0 0 1 4 12Z"
                strokeLinejoin="round"
                strokeLinecap="round"
              />
              <circle cx="9" cy="12" r="0.9" fill="currentColor" stroke="none" />
              <circle cx="12" cy="12" r="0.9" fill="currentColor" stroke="none" />
              <circle cx="15" cy="12" r="0.9" fill="currentColor" stroke="none" />
            </svg>
            {!hasNotified && (
              <span className="absolute -right-1 -top-1 h-3 w-3 animate-bounce-slow rounded-full border-2 border-cream bg-rose" />
            )}
          </span>
        )}
      </button>

      {/* Chat panel */}
      <div
        className={`fixed inset-x-0 bottom-0 z-50 flex flex-col overflow-hidden bg-cream shadow-2xl transition-all duration-300 ease-out sm:bottom-24 sm:right-6 sm:left-auto sm:h-[36rem] sm:w-[23rem] sm:rounded-3xl sm:border sm:border-line ${
          open ? "h-[85dvh] translate-y-0 opacity-100" : "pointer-events-none h-[85dvh] translate-y-6 opacity-0 sm:translate-y-3"
        } rounded-t-3xl border border-line`}
      >
        {/* header */}
        <div className="flex items-center gap-3 border-b border-line bg-ink px-4 py-3.5 text-cream sm:rounded-t-3xl">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-light font-display text-base text-ink">
            L
          </div>
          <div className="flex-1">
            <p className="font-display text-sm leading-tight">Lumi · AI Beauty Assistant</p>
            <p className="flex items-center gap-1.5 text-[11px] text-cream/70">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Online now
            </p>
          </div>
          <button
            onClick={() => setOpen(false)}
            aria-label="Minimize chat"
            className="rounded-full p-1.5 text-cream/80 hover:bg-white/10 hover:text-cream sm:hidden"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* messages */}
        <div ref={scrollRef} className="scroll-thin flex-1 space-y-3 overflow-y-auto px-4 py-4">
          {messages.map((m) => (
            <div key={m.id} className="animate-fade-up">
              <div
                className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-[13.5px] leading-relaxed ${
                  m.role === "user"
                    ? "ml-auto rounded-br-sm bg-ink text-cream"
                    : "mr-auto rounded-bl-sm border border-line bg-white text-ink"
                }`}
              >
                {m.text}
              </div>
              {m.role === "bot" && m.quickReplies && m.quickReplies.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {m.quickReplies.map((qr) =>
                    ROUTE_MAP[qr] ? (
                      <Link
                        key={qr}
                        to={ROUTE_MAP[qr]}
                        onClick={() => setOpen(false)}
                        className="rounded-full border border-rose-dark/30 bg-blush px-3 py-1.5 text-xs font-medium text-rose-dark transition-colors hover:bg-rose-light"
                      >
                        {qr} →
                      </Link>
                    ) : (
                      <button
                        key={qr}
                        onClick={() => send(qr)}
                        className="rounded-full border border-line bg-cream-dim px-3 py-1.5 text-xs font-medium text-ink-soft transition-colors hover:border-rose-dark/40 hover:text-rose-dark"
                      >
                        {qr}
                      </button>
                    )
                  )}
                </div>
              )}
            </div>
          ))}
          {typing && (
            <div className="mr-auto flex w-fit items-center gap-1 rounded-2xl rounded-bl-sm border border-line bg-white px-4 py-3">
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-ink-soft/50 [animation-delay:-0.3s]" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-ink-soft/50 [animation-delay:-0.15s]" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-ink-soft/50" />
            </div>
          )}
        </div>

        {/* input */}
        <form onSubmit={handleSubmit} className="flex items-center gap-2 border-t border-line bg-white p-3">
          <input
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Ask about services, pricing…"
            className="min-w-0 flex-1 rounded-full border border-line bg-cream px-4 py-2.5 text-sm text-ink placeholder:text-ink-soft/50 focus:border-rose focus:outline-none"
          />
          <button
            type="submit"
            disabled={!draft.trim()}
            aria-label="Send message"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-rose-dark text-cream transition-opacity disabled:opacity-30"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
              <path d="M3 11.5 21 3l-6 18-4-7-8-2.5Z" />
            </svg>
          </button>
        </form>
        <p className="bg-white pb-2 text-center text-[10px] text-ink-soft/60">
          Lumi gives general guidance — for medical or allergy concerns, please consult your stylist in person.
        </p>
      </div>
    </>
  );
}
