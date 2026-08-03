import { Link } from "react-router-dom";
import { salon } from "../../data/salon";

export default function Footer() {
  return (
    <footer className="border-t border-line bg-ink text-cream">
      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div className="col-span-2 lg:col-span-1">
            <Link to="/" className="font-display text-2xl text-cream">
              {salon.name}
            </Link>
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-cream/60">
              A modern hair &amp; beauty studio for cutting-edge color, precision cuts, and skin-first
              treatments.
            </p>
            <div className="mt-5 flex gap-3">
              {["instagram", "tiktok", "facebook", "pinterest"].map((key) => (
                <a
                  key={key}
                  href={salon.social[key as keyof typeof salon.social]}
                  aria-label={key}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-cream/20 text-cream/70 transition-colors hover:border-cream hover:text-cream"
                >
                  <SocialIcon name={key} />
                </a>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cream/50">Explore</p>
            <ul className="mt-4 space-y-2.5 text-sm text-cream/75">
              <li><Link to="/services" className="hover:text-cream">Services</Link></li>
              <li><Link to="/products" className="hover:text-cream">Shop Products</Link></li>
              <li><Link to="/gallery" className="hover:text-cream">Gallery</Link></li>
              <li><Link to="/team" className="hover:text-cream">Our Team</Link></li>
              <li><Link to="/booking" className="hover:text-cream">Book Now</Link></li>
            </ul>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cream/50">Studio</p>
            <ul className="mt-4 space-y-2.5 text-sm text-cream/75">
              <li><Link to="/about" className="hover:text-cream">About Us</Link></li>
              <li><Link to="/contact" className="hover:text-cream">Contact</Link></li>
              <li><Link to="/services#faq" className="hover:text-cream">FAQs</Link></li>
              <li><Link to="/contact" className="hover:text-cream">Careers</Link></li>
            </ul>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cream/50">Visit</p>
            <address className="mt-4 space-y-1.5 text-sm not-italic text-cream/75">
              <p>{salon.address}</p>
              <p>{salon.city}</p>
              <p className="pt-2">
                <a href={`tel:${salon.phone.replace(/[^\d+]/g, "")}`} className="hover:text-cream">
                  {salon.phone}
                </a>
              </p>
              <p>
                <a href={`mailto:${salon.email}`} className="hover:text-cream">
                  {salon.email}
                </a>
              </p>
            </address>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-cream/10 pt-6 text-xs text-cream/50 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} {salon.fullName}. All rights reserved.</p>
          <p>Demo site — imagery courtesy of Unsplash contributors.</p>
        </div>
      </div>
    </footer>
  );
}

function SocialIcon({ name }: { name: string }) {
  const common = { viewBox: "0 0 24 24", className: "h-4 w-4", fill: "none", stroke: "currentColor", strokeWidth: 1.6 } as const;
  switch (name) {
    case "instagram":
      return (
        <svg {...common}>
          <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
          <circle cx="12" cy="12" r="4" />
          <circle cx="17" cy="7" r="0.6" fill="currentColor" stroke="none" />
        </svg>
      );
    case "tiktok":
      return (
        <svg {...common} fill="currentColor" stroke="none">
          <path d="M14 3v9.6a2.6 2.6 0 1 1-2-2.53V8a4.6 4.6 0 1 0 4 4.56V9.2a6.3 6.3 0 0 0 4 1.4V8.4A4.4 4.4 0 0 1 16 4V3h-2Z" />
        </svg>
      );
    case "facebook":
      return (
        <svg {...common}>
          <path d="M14 9h2.5V6.2H14c-1.9 0-3.2 1.4-3.2 3.4V12H9v2.8h1.8V21h2.9v-6.2h2.1l.4-2.8h-2.5v-2c0-.6.3-1 1.1-1Z" />
        </svg>
      );
    default:
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="8.5" />
          <path d="M9 15.5C10.5 12 11 9 12 7c1 2-.5 6 2 8.5" strokeLinecap="round" />
        </svg>
      );
  }
}
