export type TeamMember = {
  slug: string;
  name: string;
  role: string;
  bio: string;
  specialties: string[];
  image: string;
};

export const team: TeamMember[] = [
  {
    slug: "elena-marchetti",
    name: "Elena Marchetti",
    role: "Founder & Creative Director",
    bio: "Elena founded Lumière after a decade styling backstage at fashion week. She leads color direction and trains the team on emerging techniques.",
    specialties: ["Balayage", "Color Correction", "Editorial Styling"],
    image: "1487412947147-5cebf100ffc2",
  },
  {
    slug: "noah-bright",
    name: "Noah Bright",
    role: "Senior Stylist",
    bio: "Noah specializes in precision cutting and modern texture work, with a focus on low-maintenance, grow-out-friendly shapes.",
    specialties: ["Precision Cuts", "Men's Grooming", "Texture"],
    image: "1560750588-73207b1ef5b8",
  },
  {
    slug: "priya-nandan",
    name: "Priya Nandan",
    role: "Color Specialist",
    bio: "Priya trained in London and New York and is our go-to for vivid fashion color and seamless corrective work.",
    specialties: ["Vivids", "Foilyage", "Keratin Smoothing"],
    image: "1595476108010-b4d1f102b1b1",
  },
  {
    slug: "camille-dubois",
    name: "Camille Dubois",
    role: "Lead Esthetician",
    bio: "Camille brings a skin-first philosophy to every facial, blending clinical techniques with a calming, spa-like touch.",
    specialties: ["Facials", "Microdermabrasion", "Brow Design"],
    image: "1516975080664-ed2fc6a32937",
  },
  {
    slug: "jade-okafor",
    name: "Jade Okafor",
    role: "Lash & Brow Artist",
    bio: "Jade is a certified volume lash artist known for natural-looking, customized sets and flawless brow lamination.",
    specialties: ["Lash Extensions", "Lash Lift", "Brow Lamination"],
    image: "1521590832167-7bcbfaa6381f",
  },
  {
    slug: "mia-santos",
    name: "Mia Santos",
    role: "Nail Artist",
    bio: "Mia's precision hand-painted nail art has built a loyal following — book early, her chair fills up fast.",
    specialties: ["Gel Manicure", "Nail Art", "Spa Pedicure"],
    image: "1580618672591-eb180b1a973f",
  },
];
