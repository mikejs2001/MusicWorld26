import { Link } from "react-router-dom";
import { galleryItems } from "../../data/gallery";
import Img from "../ui/Img";
import SectionHeading from "../ui/SectionHeading";

export default function GalleryStrip() {
  const items = galleryItems.slice(0, 6);
  return (
    <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-24 lg:px-8">
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
        <SectionHeading eyebrow="@lumiere.studio" title="Fresh from the studio floor">
          A peek at recent transformations — tag us to be featured.
        </SectionHeading>
        <Link to="/gallery" className="hidden shrink-0 text-sm font-semibold text-rose-dark hover:underline sm:inline-block">
          See full gallery →
        </Link>
      </div>

      <div className="mt-10 grid grid-cols-3 gap-2 sm:gap-3">
        {items.map((item) => (
          <Link key={item.id} to="/gallery" className="group relative overflow-hidden rounded-xl">
            <Img
              id={item.image}
              alt={item.caption}
              width={500}
              className="aspect-square w-full object-cover transition-transform duration-500 group-hover:scale-110"
            />
            <div className="absolute inset-0 flex items-end bg-ink/0 p-2 transition-colors duration-300 group-hover:bg-ink/40">
              <p className="translate-y-2 text-[10px] text-cream opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100 sm:text-xs">
                {item.caption}
              </p>
            </div>
          </Link>
        ))}
      </div>

      <Link to="/gallery" className="mt-8 block text-center text-sm font-semibold text-rose-dark hover:underline sm:hidden">
        See full gallery →
      </Link>
    </section>
  );
}
