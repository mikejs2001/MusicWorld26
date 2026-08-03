export type Service = {
  slug: string;
  name: string;
  description: string;
  duration: string;
  price: string;
  popular?: boolean;
};

export type ServiceCategory = {
  slug: string;
  title: string;
  blurb: string;
  image: string;
  services: Service[];
};

export const serviceCategories: ServiceCategory[] = [
  {
    slug: "hair-cutting",
    title: "Cutting & Styling",
    blurb: "Precision cuts and finishing, tailored to your face shape and texture.",
    image: "1522337360788-8b13dee7a37e",
    services: [
      {
        slug: "signature-cut",
        name: "Signature Cut & Finish",
        description:
          "Consultation, shampoo, precision cut and blow-dry finish with a senior stylist.",
        duration: "60 min",
        price: "$68",
        popular: true,
      },
      {
        slug: "restyle-consult",
        name: "Restyle Consultation & Cut",
        description:
          "For a bigger change — in-depth consultation, cut, and styling guidance for your new look.",
        duration: "75 min",
        price: "$85",
      },
      {
        slug: "blow-dry",
        name: "Blow-dry & Style",
        description: "Wash and professional blow-dry with your choice of finish — sleek, voluminous, or beachy waves.",
        duration: "45 min",
        price: "$45",
      },
      {
        slug: "updo",
        name: "Special Occasion Updo",
        description: "Elegant styling for weddings, galas, and events, including a trial consultation.",
        duration: "60 min",
        price: "$95",
      },
      {
        slug: "mens-cut",
        name: "Men's Cut & Grooming",
        description: "Scissor or clipper cut, beard shape-up, and hot towel finish.",
        duration: "45 min",
        price: "$48",
      },
      {
        slug: "kids-cut",
        name: "Kids Cut (Under 12)",
        description: "A gentle, fun first-class cut experience for our youngest clients.",
        duration: "30 min",
        price: "$28",
      },
    ],
  },
  {
    slug: "hair-colour",
    title: "Color & Chemical Services",
    blurb: "Dimensional color, corrective work, and bond-building treatments by our color team.",
    image: "1595476108010-b4d1f102b1b1",
    services: [
      {
        slug: "balayage",
        name: "Balayage / Hand-Painted Highlights",
        description: "Hand-painted, low-maintenance dimension for soft, sun-kissed regrowth.",
        duration: "2.5 hrs",
        price: "From $185",
        popular: true,
      },
      {
        slug: "full-foil",
        name: "Full Head Foil Highlights",
        description: "All-over foiled highlights for maximum brightness and dimension.",
        duration: "2.5 hrs",
        price: "From $165",
      },
      {
        slug: "root-retouch",
        name: "Root Retouch",
        description: "Single-process color applied to regrowth to refresh your base shade.",
        duration: "90 min",
        price: "From $75",
      },
      {
        slug: "full-colour",
        name: "Full Head Color",
        description: "All-over permanent or demi-permanent color application, root to end.",
        duration: "2 hrs",
        price: "From $110",
      },
      {
        slug: "colour-correction",
        name: "Color Correction",
        description: "Custom consultation and multi-step process to correct or remove previous color.",
        duration: "3+ hrs",
        price: "From $220",
      },
      {
        slug: "gloss-toner",
        name: "Gloss & Toner",
        description: "A glass-like, glossy finish that refreshes tone and adds shine.",
        duration: "30 min",
        price: "$45",
      },
      {
        slug: "keratin-smoothing",
        name: "Keratin Smoothing Treatment",
        description: "Frizz-taming smoothing treatment that cuts blow-dry time and boosts shine for up to 12 weeks.",
        duration: "2.5 hrs",
        price: "From $195",
      },
      {
        slug: "bond-rebuild",
        name: "Bond Rebuild Add-On",
        description: "In-salon bond-building treatment added to any color service to protect hair integrity.",
        duration: "+20 min",
        price: "+$35",
      },
    ],
  },
  {
    slug: "skin-beauty",
    title: "Skin & Beauty",
    blurb: "Facials, brows, lashes, and makeup artistry using clean, professional-grade formulas.",
    image: "1516975080664-ed2fc6a32937",
    services: [
      {
        slug: "express-facial",
        name: "Express Facial",
        description: "Cleanse, exfoliate, and hydrate — a quick refresh for glowing skin.",
        duration: "30 min",
        price: "$55",
      },
      {
        slug: "signature-facial",
        name: "Signature Deep-Cleanse Facial",
        description: "Double cleanse, steam, extractions, mask, and facial massage tailored to your skin type.",
        duration: "60 min",
        price: "$95",
        popular: true,
      },
      {
        slug: "microdermabrasion",
        name: "Microdermabrasion",
        description: "Resurfacing treatment to smooth texture and brighten tone.",
        duration: "45 min",
        price: "$110",
      },
      {
        slug: "brow-shape-tint",
        name: "Brow Shape & Tint",
        description: "Precision shaping with wax or thread, finished with a custom tint.",
        duration: "25 min",
        price: "$32",
      },
      {
        slug: "lash-lift",
        name: "Lash Lift & Tint",
        description: "Semi-permanent curl and tint for fuller-looking lashes with zero mascara needed.",
        duration: "45 min",
        price: "$75",
      },
      {
        slug: "lash-extensions-classic",
        name: "Classic Lash Extensions (Full Set)",
        description: "One extension per natural lash for a natural, mascara-like finish.",
        duration: "90 min",
        price: "$120",
      },
      {
        slug: "lash-extensions-volume",
        name: "Volume Lash Extensions (Full Set)",
        description: "Lightweight fans applied per lash for a fuller, more dramatic finish.",
        duration: "2 hrs",
        price: "$160",
      },
      {
        slug: "brow-lamination",
        name: "Brow Lamination",
        description: "Brows lifted and set into a fuller, fluffy, laminated shape that lasts weeks.",
        duration: "45 min",
        price: "$65",
      },
      {
        slug: "waxing",
        name: "Waxing (Lip, Brow, Leg, Bikini & More)",
        description: "Fast, professional waxing for face and body — priced per area.",
        duration: "10–45 min",
        price: "From $15",
      },
      {
        slug: "makeup-application",
        name: "Makeup Application",
        description: "Day, evening, or bridal makeup application using long-wear, skin-loving formulas.",
        duration: "45 min",
        price: "$85",
      },
    ],
  },
  {
    slug: "nails",
    title: "Nails",
    blurb: "Manicures and pedicures finished with precision and a wide gel color library.",
    image: "1580618672591-eb180b1a973f",
    services: [
      {
        slug: "classic-manicure",
        name: "Classic Manicure",
        description: "Shape, cuticle care, hand massage, and polish of your choice.",
        duration: "35 min",
        price: "$32",
      },
      {
        slug: "gel-manicure",
        name: "Gel Manicure",
        description: "Long-wearing, chip-resistant gel polish with a glossy, salon-fresh finish.",
        duration: "45 min",
        price: "$45",
        popular: true,
      },
      {
        slug: "classic-pedicure",
        name: "Classic Pedicure",
        description: "Soak, shape, callus treatment, massage, and polish.",
        duration: "45 min",
        price: "$48",
      },
      {
        slug: "spa-pedicure",
        name: "Spa Pedicure",
        description: "Extended soak, exfoliation, hot towel wrap, extended massage, and polish.",
        duration: "60 min",
        price: "$65",
      },
      {
        slug: "nail-art",
        name: "Nail Art Add-On",
        description: "Hand-painted accents, French tips, or chrome finishes — priced per hand.",
        duration: "+15 min",
        price: "From $10",
      },
    ],
  },
];

export const allServices: (Service & { category: string; categorySlug: string })[] =
  serviceCategories.flatMap((cat) =>
    cat.services.map((s) => ({ ...s, category: cat.title, categorySlug: cat.slug }))
  );
