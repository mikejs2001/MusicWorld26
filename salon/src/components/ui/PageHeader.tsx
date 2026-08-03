import Img from "./Img";

type Props = {
  eyebrow: string;
  title: string;
  blurb?: string;
  image: string;
  children?: React.ReactNode;
};

export default function PageHeader({ eyebrow, title, blurb, image, children }: Props) {
  return (
    <section className="relative overflow-hidden bg-ink">
      <Img id={image} alt="" width={1600} className="absolute inset-0 h-full w-full object-cover opacity-40" loading="eager" />
      <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/70 to-ink/50" />
      <div className="relative mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-24 lg:px-8">
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-gold-light">{eyebrow}</p>
        <h1 className="max-w-2xl text-balance font-display text-4xl leading-[1.05] text-cream sm:text-5xl">
          {title}
        </h1>
        {blurb && <p className="mt-4 max-w-lg text-[15px] leading-relaxed text-cream/75">{blurb}</p>}
        {children}
      </div>
    </section>
  );
}
