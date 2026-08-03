import { Link } from "react-router-dom";
import { serviceCategories } from "../../data/services";
import Img from "../ui/Img";
import SectionHeading from "../ui/SectionHeading";

export default function FeaturedServices() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-24 lg:px-8">
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
        <SectionHeading eyebrow="What We Do" title="Services tailored to you">
          From precision cuts to skin-first facials — browse the full menu and book online.
        </SectionHeading>
        <Link
          to="/services"
          className="hidden shrink-0 text-sm font-semibold text-rose-dark hover:underline sm:inline-block"
        >
          View full menu →
        </Link>
      </div>

      <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {serviceCategories.map((cat) => (
          <Link
            key={cat.slug}
            to="/services"
            className="group relative overflow-hidden rounded-2xl bg-ink"
          >
            <Img
              id={cat.image}
              alt={cat.title}
              width={700}
              className="aspect-[3/4] w-full object-cover opacity-90 transition-transform duration-500 group-hover:scale-105 group-hover:opacity-75"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/10 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-4">
              <h3 className="font-display text-lg text-cream">{cat.title}</h3>
              <p className="mt-1 line-clamp-2 text-xs text-cream/70">{cat.blurb}</p>
            </div>
          </Link>
        ))}
      </div>

      <Link to="/services" className="mt-8 block text-center text-sm font-semibold text-rose-dark hover:underline sm:hidden">
        View full menu →
      </Link>
    </section>
  );
}
