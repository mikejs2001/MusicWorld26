import { LinkButton } from "../ui/Button";
import Img from "../ui/Img";
import Stars from "../ui/Stars";

export default function Hero() {
  return (
    <section className="relative overflow-hidden bg-cream">
      <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-10 px-4 pb-14 pt-8 sm:px-6 lg:grid-cols-2 lg:gap-8 lg:pb-24 lg:pt-14 lg:px-8">
        <div className="order-2 lg:order-1">
          <p className="mb-4 inline-flex items-center gap-2 rounded-full bg-blush px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.15em] text-rose-dark">
            Now Booking · Fall Color Season
          </p>
          <h1 className="text-balance font-display text-[2.6rem] leading-[1.05] text-ink sm:text-6xl lg:text-[3.6rem]">
            Hair &amp; beauty,
            <br />
            <span className="italic text-rose-dark">reimagined</span> for you.
          </h1>
          <p className="mt-5 max-w-md text-[15px] leading-relaxed text-ink-soft sm:text-base">
            Precision cuts, dimensional color, and skin-first beauty rituals — delivered by a
            team obsessed with the details. Book online in under a minute, or ask Lumi, our AI
            assistant, anything about our menu.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <LinkButton to="/booking" className="w-full sm:w-auto">
              Book an Appointment
            </LinkButton>
            <LinkButton to="/services" variant="secondary" className="w-full sm:w-auto">
              Explore Services
            </LinkButton>
          </div>
          <div className="mt-9 flex items-center gap-4">
            <div className="flex -space-x-3">
              {["1522337360788-8b13dee7a37e", "1521590832167-7bcbfaa6381f", "1580618672591-eb180b1a973f"].map(
                (id) => (
                  <Img
                    key={id}
                    id={id}
                    alt="Happy Lumière client"
                    width={80}
                    className="h-9 w-9 rounded-full border-2 border-cream object-cover"
                  />
                )
              )}
            </div>
            <div>
              <Stars count={5} />
              <p className="text-xs text-ink-soft">4.9/5 from 1,200+ studio visits</p>
            </div>
          </div>
        </div>

        <div className="order-1 lg:order-2">
          <div className="relative mx-auto max-w-sm lg:max-w-none">
            <div className="absolute -inset-4 -z-10 rounded-[2.5rem] bg-gradient-to-br from-blush to-gold-light/40 blur-2xl" />
            <Img
              id="1522337360788-8b13dee7a37e"
              alt="Stylist finishing a client's hair color at Lumière Studio"
              width={1000}
              className="aspect-[4/5] w-full rounded-[2rem] object-cover shadow-2xl shadow-ink/10"
              loading="eager"
            />
            <div className="absolute -bottom-5 -left-5 hidden rounded-2xl bg-white p-4 shadow-xl sm:block">
              <p className="font-display text-2xl text-rose-dark">6,400+</p>
              <p className="text-xs text-ink-soft">Transformations this year</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
