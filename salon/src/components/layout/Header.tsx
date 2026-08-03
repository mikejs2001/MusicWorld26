import { useEffect, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { salon } from "../../data/salon";

const links = [
  { to: "/services", label: "Services" },
  { to: "/products", label: "Shop" },
  { to: "/gallery", label: "Gallery" },
  { to: "/team", label: "Team" },
  { to: "/about", label: "About" },
  { to: "/contact", label: "Contact" },
];

export default function Header() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();

  useEffect(() => setOpen(false), [location.pathname]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.documentElement.style.overflow = open ? "hidden" : "";
  }, [open]);

  return (
    <header
      className={`sticky top-0 z-40 transition-colors duration-300 ${
        scrolled || open ? "bg-cream/95 shadow-sm backdrop-blur" : "bg-cream/70 backdrop-blur-sm"
      }`}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:h-20 sm:px-6 lg:px-8">
        <NavLink to="/" className="font-display text-xl tracking-wide text-ink sm:text-2xl">
          {salon.name}
          <span className="ml-1 hidden text-xs font-sans font-medium uppercase tracking-[0.25em] text-rose-dark sm:inline">
            Studio
          </span>
        </NavLink>

        <nav className="hidden items-center gap-8 lg:flex">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              className={({ isActive }) =>
                `text-sm font-medium tracking-wide transition-colors hover:text-rose-dark ${
                  isActive ? "text-rose-dark" : "text-ink-soft"
                }`
              }
            >
              {l.label}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <NavLink
            to="/booking"
            className="hidden rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-cream transition-colors hover:bg-rose-dark sm:inline-flex"
          >
            Book Now
          </NavLink>
          <button
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            className="flex h-10 w-10 items-center justify-center rounded-full text-ink lg:hidden"
          >
            <div className="flex h-4 w-5 flex-col justify-between">
              <span className={`h-[1.5px] w-full bg-current transition-transform duration-300 ${open ? "translate-y-[7px] rotate-45" : ""}`} />
              <span className={`h-[1.5px] w-full bg-current transition-opacity duration-200 ${open ? "opacity-0" : "opacity-100"}`} />
              <span className={`h-[1.5px] w-full bg-current transition-transform duration-300 ${open ? "-translate-y-[7px] -rotate-45" : ""}`} />
            </div>
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      <div
        className={`overflow-hidden transition-[max-height] duration-300 ease-in-out lg:hidden ${
          open ? "max-h-[32rem]" : "max-h-0"
        }`}
      >
        <nav className="flex flex-col gap-1 border-t border-line bg-cream px-4 pb-6 pt-4">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              className={({ isActive }) =>
                `rounded-xl px-3 py-3 text-base font-medium transition-colors ${
                  isActive ? "bg-blush text-rose-dark" : "text-ink-soft hover:bg-cream-dim"
                }`
              }
            >
              {l.label}
            </NavLink>
          ))}
          <NavLink
            to="/booking"
            className="mt-3 rounded-full bg-ink px-5 py-3.5 text-center text-sm font-semibold text-cream"
          >
            Book Now
          </NavLink>
        </nav>
      </div>
    </header>
  );
}
