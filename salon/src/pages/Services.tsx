import { Link } from "react-router-dom";
import { serviceCategories } from "../data/services";
import { faqs } from "../data/faqs";
import PageHeader from "../components/ui/PageHeader";
import Badge from "../components/ui/Badge";
import Accordion from "../components/ui/Accordion";
import SectionHeading from "../components/ui/SectionHeading";

export default function Services() {
  return (
    <>
      <PageHeader
        eyebrow="Service Menu"
        title="A menu built around your hair and skin"
        blurb="Every service starts with a consultation. Prices reflect our senior stylist tier — junior stylist pricing is available at 15–20% less."
        image="1470259078422-826894b933aa"
      />

      {/* Category quick nav */}
      <div className="sticky top-16 z-30 border-b border-line bg-cream/95 backdrop-blur sm:top-20">
        <nav className="scroll-thin mx-auto flex max-w-6xl gap-2 overflow-x-auto px-4 py-3 sm:px-6 lg:px-8">
          {serviceCategories.map((cat) => (
            <a
              key={cat.slug}
              href={`#${cat.slug}`}
              className="shrink-0 rounded-full border border-line px-4 py-2 text-xs font-semibold text-ink-soft transition-colors hover:border-rose-dark hover:text-rose-dark"
            >
              {cat.title}
            </a>
          ))}
        </nav>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8">
        {serviceCategories.map((cat, idx) => (
          <section key={cat.slug} id={cat.slug} className={`scroll-mt-32 ${idx > 0 ? "mt-16" : ""}`}>
            <SectionHeading eyebrow={`0${idx + 1}`} title={cat.title}>
              {cat.blurb}
            </SectionHeading>

            <div className="mt-8 divide-y divide-line rounded-2xl border border-line bg-white">
              {cat.services.map((s) => (
                <div key={s.slug} className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-display text-lg text-ink">{s.name}</h3>
                      {s.popular && <Badge>Popular</Badge>}
                    </div>
                    <p className="mt-1.5 max-w-xl text-[13.5px] leading-relaxed text-ink-soft">{s.description}</p>
                    <p className="mt-2 text-xs font-medium text-ink-soft/70">{s.duration}</p>
                  </div>
                  <div className="flex items-center justify-between gap-4 sm:flex-col sm:items-end sm:gap-2">
                    <span className="font-display text-lg text-rose-dark">{s.price}</span>
                    <Link
                      to={`/booking?service=${s.slug}`}
                      className="shrink-0 rounded-full bg-blush px-4 py-2 text-xs font-semibold text-rose-dark transition-colors hover:bg-ink hover:text-cream"
                    >
                      Book
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>

      <section id="faq" className="scroll-mt-24 bg-cream-dim">
        <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:py-24 lg:px-8">
          <SectionHeading eyebrow="Good to Know" title="Frequently asked questions" align="center" className="mx-auto">
            Can't find your answer here? Ask Lumi in the chat bubble, or reach out directly.
          </SectionHeading>
          <div className="mt-10">
            <Accordion items={faqs} />
          </div>
        </div>
      </section>
    </>
  );
}
