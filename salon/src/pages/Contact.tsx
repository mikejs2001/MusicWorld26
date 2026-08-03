import { useState } from "react";
import PageHeader from "../components/ui/PageHeader";
import Button from "../components/ui/Button";
import { salon } from "../data/salon";

export default function Contact() {
  const [form, setForm] = useState({ name: "", email: "", topic: "General question", message: "" });
  const [sent, setSent] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSent(true);
  }

  return (
    <>
      <PageHeader
        eyebrow="Get In Touch"
        title="We'd love to hear from you"
        blurb="Questions about a service, a group booking, or press? Reach out below or chat with Lumi any time."
        image="1560066984-138dadb4c035"
      />

      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-12 px-4 py-14 sm:px-6 lg:grid-cols-[1fr_1.2fr] lg:px-8">
        <div>
          <h2 className="font-display text-xl text-ink">Visit the studio</h2>
          <div className="mt-4 space-y-1 text-sm text-ink-soft">
            <p>{salon.address}</p>
            <p>{salon.city}</p>
          </div>

          {/* Stylized map block (no external map dependency) */}
          <div className="relative mt-5 aspect-[4/3] w-full overflow-hidden rounded-2xl border border-line bg-cream-dim">
            <svg viewBox="0 0 400 300" className="h-full w-full text-line">
              <defs>
                <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                  <path d="M 20 0 L 0 0 0 20" fill="none" stroke="currentColor" strokeWidth="1" />
                </pattern>
              </defs>
              <rect width="400" height="300" fill="url(#grid)" />
              <path d="M0 90 H400 M0 190 H400 M120 0 V300 M280 0 V300" stroke="currentColor" strokeWidth="3" />
            </svg>
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-[calc(50%+10px)]">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-rose-dark text-cream shadow-lg">
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
                  <path d="M12 2a7 7 0 0 0-7 7c0 5.2 7 13 7 13s7-7.8 7-13a7 7 0 0 0-7-7Zm0 9.5A2.5 2.5 0 1 1 12 6a2.5 2.5 0 0 1 0 5.5Z" />
                </svg>
              </div>
            </div>
          </div>

          <h2 className="mt-8 font-display text-xl text-ink">Studio hours</h2>
          <dl className="mt-4 space-y-1.5 text-sm">
            {salon.hours.map((h) => (
              <div key={h.day} className="flex justify-between border-b border-line py-1.5">
                <dt className="text-ink-soft">{h.day}</dt>
                <dd className="font-medium text-ink">{h.time}</dd>
              </div>
            ))}
          </dl>

          <h2 className="mt-8 font-display text-xl text-ink">Direct contact</h2>
          <div className="mt-4 space-y-1.5 text-sm">
            <p>
              <a href={`tel:${salon.phone.replace(/[^\d+]/g, "")}`} className="font-medium text-rose-dark hover:underline">
                {salon.phone}
              </a>
            </p>
            <p>
              <a href={`mailto:${salon.email}`} className="font-medium text-rose-dark hover:underline">
                {salon.email}
              </a>
            </p>
          </div>
        </div>

        <div>
          {sent ? (
            <div className="flex h-full flex-col items-center justify-center rounded-2xl border border-line bg-cream-dim p-10 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <h3 className="mt-4 font-display text-xl text-ink">Message sent</h3>
              <p className="mt-2 max-w-sm text-sm text-ink-soft">
                Thanks, {form.name.split(" ")[0] || "there"}! Our front desk team replies within one business day.
              </p>
              <Button variant="secondary" className="mt-6" onClick={() => setSent(false)}>
                Send another message
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="rounded-2xl border border-line bg-white p-6 sm:p-8">
              <h2 className="font-display text-xl text-ink">Send us a message</h2>
              <div className="mt-5 space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <input
                    required
                    placeholder="Full name"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full rounded-xl border border-line bg-cream px-4 py-3 text-sm focus:border-rose-dark focus:outline-none"
                  />
                  <input
                    required
                    type="email"
                    placeholder="Email address"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full rounded-xl border border-line bg-cream px-4 py-3 text-sm focus:border-rose-dark focus:outline-none"
                  />
                </div>
                <select
                  value={form.topic}
                  onChange={(e) => setForm({ ...form, topic: e.target.value })}
                  className="w-full rounded-xl border border-line bg-cream px-4 py-3 text-sm focus:border-rose-dark focus:outline-none"
                >
                  <option>General question</option>
                  <option>Booking help</option>
                  <option>Bridal / group event</option>
                  <option>Press &amp; partnerships</option>
                  <option>Careers</option>
                </select>
                <textarea
                  required
                  rows={5}
                  placeholder="How can we help?"
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  className="w-full resize-none rounded-xl border border-line bg-cream px-4 py-3 text-sm focus:border-rose-dark focus:outline-none"
                />
              </div>
              <Button type="submit" className="mt-5 w-full">
                Send Message
              </Button>
            </form>
          )}
        </div>
      </div>
    </>
  );
}
