import { useMemo, useState } from "react";
import { galleryItems, type GalleryItem } from "../data/gallery";
import PageHeader from "../components/ui/PageHeader";
import Img from "../components/ui/Img";
import { LinkButton } from "../components/ui/Button";

const categories: (GalleryItem["category"] | "All")[] = ["All", "Hair", "Color", "Beauty", "Nails", "Studio"];

export default function Gallery() {
  const [active, setActive] = useState<(typeof categories)[number]>("All");
  const [lightbox, setLightbox] = useState<GalleryItem | null>(null);

  const filtered = useMemo(
    () => (active === "All" ? galleryItems : galleryItems.filter((g) => g.category === active)),
    [active]
  );

  return (
    <>
      <PageHeader
        eyebrow="Portfolio"
        title="Recent work from the studio floor"
        blurb="A living look at the color, cuts, and beauty artistry happening at Lumière each week."
        image="1585232004423-5a5f61a86f6e"
      />

      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="scroll-thin flex gap-2 overflow-x-auto pb-2">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActive(cat)}
              className={`shrink-0 rounded-full border px-4 py-2 text-xs font-semibold transition-colors ${
                active === cat ? "border-ink bg-ink text-cream" : "border-line text-ink-soft hover:border-rose-dark hover:text-rose-dark"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {filtered.map((item) => (
            <button key={item.id} onClick={() => setLightbox(item)} className="group relative overflow-hidden rounded-xl text-left">
              <Img
                id={item.image}
                alt={item.caption}
                width={600}
                className="aspect-square w-full object-cover transition-transform duration-500 group-hover:scale-110"
              />
              <div className="absolute inset-0 flex items-end bg-ink/0 p-2.5 transition-colors duration-300 group-hover:bg-ink/50">
                <p className="translate-y-2 text-[11px] text-cream opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
                  {item.caption}
                </p>
              </div>
            </button>
          ))}
        </div>

        <div className="mt-12 flex justify-center">
          <LinkButton to="/booking">Book Your Look</LinkButton>
        </div>
      </div>

      {lightbox && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-ink/90 p-4 backdrop-blur-sm"
          onClick={() => setLightbox(null)}
        >
          <div className="relative w-full max-w-xl" onClick={(e) => e.stopPropagation()}>
            <Img id={lightbox.image} alt={lightbox.caption} width={1200} className="w-full rounded-2xl object-cover" />
            <p className="mt-3 text-center text-sm text-cream">{lightbox.caption}</p>
            <button
              onClick={() => setLightbox(null)}
              aria-label="Close"
              className="absolute -top-3 right-0 flex h-9 w-9 items-center justify-center rounded-full bg-cream text-ink"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </>
  );
}
