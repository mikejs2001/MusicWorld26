import PageHeader from "../components/ui/PageHeader";
import Img from "../components/ui/Img";
import { LinkButton } from "../components/ui/Button";
import { team } from "../data/team";

export default function Team() {
  return (
    <>
      <PageHeader
        eyebrow="Our Artists"
        title="Meet the team"
        blurb="Six specialists, one shared standard of care. Browse specialties and book directly with your favorite."
        image="1560750588-73207b1ef5b8"
      />

      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {team.map((member) => (
            <div key={member.slug} className="overflow-hidden rounded-2xl border border-line bg-white">
              <Img id={member.image} alt={member.name} width={700} className="aspect-[4/3] w-full object-cover" />
              <div className="p-5">
                <h3 className="font-display text-lg text-ink">{member.name}</h3>
                <p className="text-xs font-semibold uppercase tracking-wider text-rose-dark">{member.role}</p>
                <p className="mt-3 text-[13.5px] leading-relaxed text-ink-soft">{member.bio}</p>
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {member.specialties.map((s) => (
                    <span key={s} className="rounded-full bg-blush px-2.5 py-1 text-[11px] font-medium text-rose-dark">
                      {s}
                    </span>
                  ))}
                </div>
                <LinkButton to={`/booking?stylist=${member.slug}`} variant="secondary" className="mt-5 w-full">
                  Book with {member.name.split(" ")[0]}
                </LinkButton>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
