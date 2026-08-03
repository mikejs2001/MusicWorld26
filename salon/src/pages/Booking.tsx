import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { allServices } from "../data/services";
import { team } from "../data/team";
import { salon } from "../data/salon";
import PageHeader from "../components/ui/PageHeader";
import Img from "../components/ui/Img";
import Button from "../components/ui/Button";

const STEPS = ["Service", "Stylist", "Date & Time", "Your Details"] as const;

function hashString(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h << 5) - h + str.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

function hoursForDate(date: Date): { open: string; close: string } | null {
  const dayName = date.toLocaleDateString("en-US", { weekday: "long" });
  const entry = salon.hours.find((h) => h.day === dayName);
  if (!entry || entry.time === "Closed") return null;
  const [open, close] = entry.time.split("–").map((s) => s.trim());
  return { open, close };
}

function to24h(time: string): number {
  const [t, meridiem] = time.split(" ");
  let [h, m] = t.split(":").map(Number);
  if (meridiem === "PM" && h !== 12) h += 12;
  if (meridiem === "AM" && h === 12) h = 0;
  return h * 60 + m;
}

function minutesTo12h(mins: number): string {
  let h = Math.floor(mins / 60);
  const m = mins % 60;
  const meridiem = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${h}:${m.toString().padStart(2, "0")} ${meridiem}`;
}

function slotsForDate(dateStr: string): string[] {
  const date = new Date(`${dateStr}T00:00:00`);
  const range = hoursForDate(date);
  if (!range) return [];
  const start = to24h(range.open);
  const end = to24h(range.close);
  const slots: string[] = [];
  for (let m = start; m < end; m += 40) {
    const label = minutesTo12h(m);
    const isTaken = hashString(dateStr + label) % 10 < 3; // ~30% pre-booked
    if (!isTaken) slots.push(label);
  }
  return slots;
}

function todayISO(): string {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

export default function Booking() {
  const [params] = useSearchParams();
  const preselect = params.get("service");
  const preselectStylist = params.get("stylist");

  const [step, setStep] = useState(0);
  const [serviceSlug, setServiceSlug] = useState<string | null>(preselect);
  const [stylistSlug, setStylistSlug] = useState<string | null>(preselectStylist);
  const [date, setDate] = useState(todayISO());
  const [time, setTime] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", email: "", phone: "", notes: "" });
  const [submitted, setSubmitted] = useState(false);
  const [reference, setReference] = useState("");

  const service = useMemo(() => allServices.find((s) => s.slug === serviceSlug) ?? null, [serviceSlug]);
  const stylist = useMemo(() => team.find((t) => t.slug === stylistSlug) ?? null, [stylistSlug]);
  const slots = useMemo(() => slotsForDate(date), [date]);

  useEffect(() => {
    setTime(null);
  }, [date]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [step, submitted]);

  useEffect(() => {
    if (preselect && preselectStylist) setStep(2);
    else if (preselect) setStep(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function canContinue(): boolean {
    if (step === 0) return !!service;
    if (step === 1) return true; // stylist optional
    if (step === 2) return !!time;
    if (step === 3) return form.name.trim().length > 1 && /\S+@\S+\.\S+/.test(form.email);
    return true;
  }

  function handleSubmit() {
    setReference(`LM-${Math.floor(100000 + Math.random() * 900000)}`);
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center px-4 py-20 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
          <svg viewBox="0 0 24 24" className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <h1 className="mt-6 font-display text-3xl text-ink">You're all set, {form.name.split(" ")[0]}!</h1>
        <p className="mt-3 text-[15px] leading-relaxed text-ink-soft">
          {service?.name} on <strong>{new Date(`${date}T00:00:00`).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</strong> at{" "}
          <strong>{time}</strong> {stylist ? `with ${stylist.name}` : "— we'll assign the best available stylist"}.
        </p>
        <div className="mt-6 w-full rounded-2xl border border-line bg-white p-5 text-left text-sm">
          <div className="flex justify-between border-b border-line pb-2">
            <span className="text-ink-soft">Confirmation #</span>
            <span className="font-semibold text-ink">{reference}</span>
          </div>
          <div className="flex justify-between pt-2">
            <span className="text-ink-soft">Sent to</span>
            <span className="font-semibold text-ink">{form.email}</span>
          </div>
        </div>
        <p className="mt-6 text-xs text-ink-soft/70">
          A confirmation email is on its way. Need to make changes? Call us at {salon.phone}.
        </p>
        <Button
          className="mt-8"
          onClick={() => {
            setSubmitted(false);
            setStep(0);
            setServiceSlug(null);
            setStylistSlug(null);
            setTime(null);
            setForm({ name: "", email: "", phone: "", notes: "" });
          }}
        >
          Book another appointment
        </Button>
      </div>
    );
  }

  return (
    <>
      <PageHeader
        eyebrow="Book Online"
        title="Reserve your seat at Lumière"
        blurb="Four quick steps — pick a service, a stylist, a time, and you're confirmed."
        image="1519699047748-de8e457a634e"
      />

      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
        {/* Stepper */}
        <ol className="mb-10 flex items-center justify-between">
          {STEPS.map((label, i) => (
            <li key={label} className="flex flex-1 items-center last:flex-none">
              <div className="flex flex-col items-center gap-1.5">
                <div
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-colors ${
                    i < step
                      ? "bg-rose-dark text-cream"
                      : i === step
                        ? "bg-ink text-cream"
                        : "bg-cream-dim text-ink-soft/60"
                  }`}
                >
                  {i < step ? "✓" : i + 1}
                </div>
                <span className={`hidden text-[10px] font-medium sm:block ${i === step ? "text-ink" : "text-ink-soft/50"}`}>
                  {label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={`mx-2 h-px flex-1 ${i < step ? "bg-rose-dark" : "bg-line"}`} />
              )}
            </li>
          ))}
        </ol>

        {/* Step 0: Service */}
        {step === 0 && (
          <div className="animate-fade-up space-y-2">
            <h2 className="mb-4 font-display text-xl text-ink">Choose a service</h2>
            {allServices.map((s) => (
              <button
                key={s.slug}
                onClick={() => setServiceSlug(s.slug)}
                className={`flex w-full items-center justify-between gap-4 rounded-xl border p-4 text-left transition-colors ${
                  serviceSlug === s.slug ? "border-rose-dark bg-blush" : "border-line bg-white hover:border-rose-dark/40"
                }`}
              >
                <div>
                  <p className="font-display text-[15px] text-ink">{s.name}</p>
                  <p className="text-xs text-ink-soft">{s.category} · {s.duration}</p>
                </div>
                <span className="shrink-0 font-display text-ink">{s.price}</span>
              </button>
            ))}
          </div>
        )}

        {/* Step 1: Stylist */}
        {step === 1 && (
          <div className="animate-fade-up">
            <h2 className="mb-4 font-display text-xl text-ink">Choose a stylist</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <button
                onClick={() => setStylistSlug(null)}
                className={`flex flex-col items-center gap-2 rounded-xl border p-4 text-center transition-colors ${
                  stylistSlug === null ? "border-rose-dark bg-blush" : "border-line bg-white hover:border-rose-dark/40"
                }`}
              >
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-cream-dim text-2xl">✦</div>
                <p className="text-xs font-semibold text-ink">No preference</p>
              </button>
              {team.map((member) => (
                <button
                  key={member.slug}
                  onClick={() => setStylistSlug(member.slug)}
                  className={`flex flex-col items-center gap-2 rounded-xl border p-4 text-center transition-colors ${
                    stylistSlug === member.slug ? "border-rose-dark bg-blush" : "border-line bg-white hover:border-rose-dark/40"
                  }`}
                >
                  <Img id={member.image} alt={member.name} width={160} className="h-16 w-16 rounded-full object-cover" />
                  <div>
                    <p className="text-xs font-semibold text-ink">{member.name}</p>
                    <p className="text-[10px] text-ink-soft">{member.role}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Date & Time */}
        {step === 2 && (
          <div className="animate-fade-up">
            <h2 className="mb-4 font-display text-xl text-ink">Pick a date &amp; time</h2>
            <input
              type="date"
              value={date}
              min={todayISO()}
              onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-xl border border-line bg-white px-4 py-3 text-sm text-ink focus:border-rose-dark focus:outline-none"
            />
            <div className="mt-5">
              {slots.length === 0 ? (
                <p className="rounded-xl bg-cream-dim p-4 text-sm text-ink-soft">
                  We're closed on this day. Please choose another date.
                </p>
              ) : (
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {slots.map((slot) => (
                    <button
                      key={slot}
                      onClick={() => setTime(slot)}
                      className={`rounded-lg border px-2 py-2.5 text-xs font-semibold transition-colors ${
                        time === slot ? "border-rose-dark bg-rose-dark text-cream" : "border-line bg-white text-ink-soft hover:border-rose-dark/40"
                      }`}
                    >
                      {slot}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step 3: Details */}
        {step === 3 && (
          <div className="animate-fade-up">
            <h2 className="mb-4 font-display text-xl text-ink">Your details</h2>
            <div className="space-y-3">
              <input
                required
                placeholder="Full name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full rounded-xl border border-line bg-white px-4 py-3 text-sm focus:border-rose-dark focus:outline-none"
              />
              <input
                required
                type="email"
                placeholder="Email address"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full rounded-xl border border-line bg-white px-4 py-3 text-sm focus:border-rose-dark focus:outline-none"
              />
              <input
                type="tel"
                placeholder="Phone number"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="w-full rounded-xl border border-line bg-white px-4 py-3 text-sm focus:border-rose-dark focus:outline-none"
              />
              <textarea
                placeholder="Anything we should know? (allergies, inspiration photos, etc.)"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                rows={3}
                className="w-full resize-none rounded-xl border border-line bg-white px-4 py-3 text-sm focus:border-rose-dark focus:outline-none"
              />
            </div>

            <div className="mt-6 rounded-xl border border-line bg-cream-dim p-4 text-sm">
              <p className="font-display text-ink">Booking summary</p>
              <dl className="mt-2 space-y-1 text-ink-soft">
                <div className="flex justify-between"><dt>Service</dt><dd className="font-medium text-ink">{service?.name}</dd></div>
                <div className="flex justify-between"><dt>Stylist</dt><dd className="font-medium text-ink">{stylist?.name ?? "No preference"}</dd></div>
                <div className="flex justify-between"><dt>Date</dt><dd className="font-medium text-ink">{new Date(`${date}T00:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</dd></div>
                <div className="flex justify-between"><dt>Time</dt><dd className="font-medium text-ink">{time}</dd></div>
                <div className="flex justify-between"><dt>Price</dt><dd className="font-medium text-ink">{service?.price}</dd></div>
              </dl>
            </div>
          </div>
        )}

        {/* Nav buttons */}
        <div className="mt-8 flex items-center justify-between gap-3">
          <Button
            variant="secondary"
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            className={step === 0 ? "invisible" : ""}
          >
            Back
          </Button>
          {step < STEPS.length - 1 ? (
            <Button disabled={!canContinue()} onClick={() => setStep((s) => s + 1)} className="disabled:opacity-40">
              Continue
            </Button>
          ) : (
            <Button disabled={!canContinue()} onClick={handleSubmit} className="disabled:opacity-40">
              Confirm Booking
            </Button>
          )}
        </div>
      </div>
    </>
  );
}
