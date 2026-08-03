import { Link } from "react-router-dom";
import PageHeader from "../components/ui/PageHeader";
import SectionHeading from "../components/ui/SectionHeading";
import Img from "../components/ui/Img";
import { LinkButton } from "../components/ui/Button";
import { team } from "../data/team";

const values = [
  { title: "Consultation First", text: "Every visit opens with an honest conversation about what will actually work for your hair, skin, and lifestyle." },
  { title: "Continuing Education", text: "Our team trains quarterly with color and skincare educators to stay ahead of technique and safety standards." },
  { title: "Considered Ingredients", text: "We choose sulfate-free, cruelty-free lines wherever the performance matches — kind to you, kind to the planet." },
  { title: "Community Rooted", text: "From student discounts to local partnerships, Lumière is built to serve the Arts District first." },
];

export default function About() {
  return (
    <>
      <PageHeader
        eyebrow="Our Story"
        title="A studio built on craft, not trends"
        blurb="Lumière opened in 2016 with one chair and a simple idea: beauty services should feel personal, unrushed, and genuinely collaborative."
        image="1487412947147-5cebf100ffc2"
      />

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-24 lg:px-8">
        <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-2 lg:gap-16">
          <Img
            id="1560066984-138dadb4c035"
            alt="Interior of Lumière Hair & Beauty Studio"
            width={900}
            className="aspect-[4/5] w-full rounded-[2rem] object-cover"
          />
          <div>
            <SectionHeading eyebrow="How We Started" title="From one chair to a full studio floor">
              Founder Elena Marchetti spent a decade backstage at fashion week before opening Lumière with a
              simple mission — bring that same precision and care to everyday appointments. Today, our six
              artists cover hair, skin, lash, brow, and nail services under one roof, working from a shared
              belief that great technique should always feel like a genuine conversation, not a rushed
              transaction.
            </SectionHeading>
            <div className="mt-8 grid grid-cols-3 gap-4">
              {[
                ["9+", "Years open"],
                ["6", "Studio artists"],
                ["1,200+", "5-star reviews"],
              ].map(([num, label]) => (
                <div key={label}>
                  <p className="font-display text-2xl text-rose-dark sm:text-3xl">{num}</p>
                  <p className="text-xs text-ink-soft">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-cream-dim py-16 lg:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <SectionHeading eyebrow="What We Believe" title="The values behind every appointment" align="center" className="mx-auto" />
          <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {values.map((v) => (
              <div key={v.title} className="rounded-2xl border border-line bg-white p-5">
                <h3 className="font-display text-base text-ink">{v.title}</h3>
                <p className="mt-2 text-[13px] leading-relaxed text-ink-soft">{v.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-24 lg:px-8">
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
          <SectionHeading eyebrow="Meet the Artists" title="The team behind the chair" />
          <Link to="/team" className="hidden shrink-0 text-sm font-semibold text-rose-dark hover:underline sm:inline-block">
            Meet the full team →
          </Link>
        </div>
        <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {team.map((member) => (
            <Link key={member.slug} to="/team" className="group text-center">
              <Img
                id={member.image}
                alt={member.name}
                width={300}
                className="aspect-square w-full rounded-2xl object-cover transition-transform duration-300 group-hover:scale-[1.03]"
              />
              <p className="mt-2 text-xs font-semibold text-ink">{member.name}</p>
              <p className="text-[10px] text-ink-soft">{member.role}</p>
            </Link>
          ))}
        </div>
        <div className="mt-10 flex justify-center">
          <LinkButton to="/booking">Book Your Visit</LinkButton>
        </div>
      </section>
    </>
  );
}
