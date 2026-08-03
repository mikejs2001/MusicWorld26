export default function ChatPromo() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-4 sm:px-6 lg:px-8">
      <div className="grid grid-cols-1 items-center gap-8 rounded-[2rem] bg-blush px-6 py-10 sm:px-10 lg:grid-cols-[1.1fr_1fr] lg:gap-12 lg:py-14">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-rose-dark">Meet Lumi</p>
          <h2 className="text-balance font-display text-3xl leading-[1.1] text-ink sm:text-4xl">
            Questions about a service or product? Just ask.
          </h2>
          <p className="mt-3 max-w-md text-[15px] leading-relaxed text-ink-soft">
            Our AI beauty assistant knows the full menu, retail shelf, and studio policies — available
            24/7 from the chat bubble in the corner. Try asking "how much is balayage?" or "what's in
            the argan oil?"
          </p>
        </div>
        <div className="rounded-2xl border border-rose-dark/10 bg-white p-4 shadow-lg sm:p-5">
          <div className="flex items-center gap-2 border-b border-line pb-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-rose-light font-display text-sm text-ink">
              L
            </div>
            <div>
              <p className="text-xs font-semibold text-ink">Lumi · AI Assistant</p>
              <p className="text-[10px] text-emerald-600">● Online now</p>
            </div>
          </div>
          <div className="space-y-2.5 pt-3">
            <p className="ml-auto w-fit max-w-[80%] rounded-2xl rounded-br-sm bg-ink px-3 py-2 text-xs text-cream">
              How much is balayage?
            </p>
            <p className="mr-auto w-fit max-w-[85%] rounded-2xl rounded-bl-sm border border-line bg-cream px-3 py-2 text-xs text-ink">
              Balayage starts at $185 and takes about 2.5 hours — hand-painted for soft, low-maintenance
              regrowth. Want to book it?
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
