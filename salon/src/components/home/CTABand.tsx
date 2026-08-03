import { LinkButton } from "../ui/Button";

export default function CTABand() {
  return (
    <section className="mx-auto max-w-6xl px-4 pb-16 pt-4 sm:px-6 lg:px-8 lg:pb-24">
      <div className="flex flex-col items-center gap-6 rounded-[2rem] bg-gradient-to-br from-rose-dark to-ink px-6 py-14 text-center sm:px-10">
        <h2 className="text-balance font-display text-3xl leading-[1.1] text-cream sm:text-4xl">
          Ready for your next appointment?
        </h2>
        <p className="max-w-md text-[15px] text-cream/70">
          Choose your service, stylist, and time — confirmation lands in your inbox instantly.
        </p>
        <LinkButton to="/booking" className="bg-cream text-ink hover:bg-gold-light">
          Book an Appointment
        </LinkButton>
      </div>
    </section>
  );
}
