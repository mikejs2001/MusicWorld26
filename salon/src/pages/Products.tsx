import { useMemo, useState } from "react";
import { products, productCategories, type Product } from "../data/products";
import PageHeader from "../components/ui/PageHeader";
import Img from "../components/ui/Img";
import Badge from "../components/ui/Badge";

export default function Products() {
  const [active, setActive] = useState<Product["category"] | "All">("All");
  const [added, setAdded] = useState<Set<string>>(new Set());

  const filtered = useMemo(
    () => (active === "All" ? products : products.filter((p) => p.category === active)),
    [active]
  );

  function handleAdd(slug: string) {
    setAdded((prev) => new Set(prev).add(slug));
    setTimeout(() => {
      setAdded((prev) => {
        const next = new Set(prev);
        next.delete(slug);
        return next;
      });
    }, 1800);
  }

  return (
    <>
      <PageHeader
        eyebrow="Retail Shelf"
        title="Take the studio home with you"
        blurb="The exact haircare, skincare, and styling tools our team reaches for — curated, tested, and restocked weekly."
        image="1607779097040-26e80aa78e66"
      />

      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="scroll-thin flex gap-2 overflow-x-auto pb-2">
          {(["All", ...productCategories] as const).map((cat) => (
            <button
              key={cat}
              onClick={() => setActive(cat)}
              className={`shrink-0 rounded-full border px-4 py-2 text-xs font-semibold transition-colors ${
                active === cat
                  ? "border-ink bg-ink text-cream"
                  : "border-line text-ink-soft hover:border-rose-dark hover:text-rose-dark"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="mt-8 grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
          {filtered.map((p) => (
            <div key={p.slug} className="group flex flex-col overflow-hidden rounded-2xl border border-line bg-white">
              <div className="relative overflow-hidden">
                <Img
                  id={p.image}
                  alt={p.name}
                  width={600}
                  className="aspect-square w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                {p.bestseller && (
                  <Badge className="absolute left-2 top-2 bg-white/90">Bestseller</Badge>
                )}
              </div>
              <div className="flex flex-1 flex-col p-3.5 sm:p-4">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-rose-dark">{p.brand}</p>
                <h3 className="mt-1 font-display text-sm leading-snug text-ink sm:text-base">{p.name}</h3>
                <p className="mt-1 hidden text-xs leading-relaxed text-ink-soft sm:block sm:line-clamp-2">
                  {p.description}
                </p>
                <div className="mt-auto flex items-center justify-between pt-3">
                  <span className="text-xs text-ink-soft/70">{p.size}</span>
                  <span className="font-display text-sm text-ink sm:text-base">{p.price}</span>
                </div>
                <button
                  onClick={() => handleAdd(p.slug)}
                  className={`mt-3 w-full rounded-full py-2 text-xs font-semibold transition-colors ${
                    added.has(p.slug)
                      ? "bg-emerald-600 text-cream"
                      : "bg-blush text-rose-dark hover:bg-ink hover:text-cream"
                  }`}
                >
                  {added.has(p.slug) ? "Added ✓" : "Add to studio pickup"}
                </button>
              </div>
            </div>
          ))}
        </div>

        <p className="mt-10 text-center text-xs text-ink-soft/70">
          This is a demo storefront — items are reserved for in-studio pickup rather than shipped.
        </p>
      </div>
    </>
  );
}
