import { testimonials } from "../../data/testimonials";
import SectionHeading from "../ui/SectionHeading";
import Stars from "../ui/Stars";

export default function Testimonials() {
  return (
    <section className="bg-ink py-16 lg:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <SectionHeading eyebrow="Client Love" title="Loved by the Riverton community" align="center" invert className="mx-auto">
          Real feedback from real appointments.
        </SectionHeading>

        <div className="mt-10 flex gap-4 overflow-x-auto pb-4 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden sm:grid sm:grid-cols-2 sm:overflow-visible lg:grid-cols-3">
          {testimonials.map((t) => (
            <div
              key={t.name}
              className="w-[80vw] shrink-0 rounded-2xl border border-cream/10 bg-cream/[0.04] p-6 sm:w-auto"
            >
              <Stars count={t.rating} />
              <p className="mt-3 text-[14px] leading-relaxed text-cream/85">"{t.quote}"</p>
              <div className="mt-5 border-t border-cream/10 pt-3">
                <p className="text-sm font-semibold text-cream">{t.name}</p>
                <p className="text-xs text-cream/50">{t.service}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
