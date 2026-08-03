export type Intent = {
  id: string;
  keywords: string[];
  answer: string;
  quickReplies?: string[];
};

// General studio + industry-knowledge intents. Pricing/duration for specific
// services and products is answered dynamically from the services/products
// data (see chatEngine.ts) so it always stays in sync with the menu.
export const intents: Intent[] = [
  {
    id: "greeting",
    keywords: ["hello", "hi", "hey", "good morning", "good afternoon", "good evening", "yo", "hiya"],
    answer:
      "Hi there! I'm Lumi, Lumière's virtual assistant. I can help with services, pricing, products, hours, or booking. What can I help with?",
    quickReplies: ["See services", "Book an appointment", "Shop products", "Studio hours"],
  },
  {
    id: "thanks",
    keywords: ["thank you", "thanks", "appreciate", "cheers", "ty"],
    answer: "You're so welcome! Anything else I can help you find?",
    quickReplies: ["Book an appointment", "Talk to a human"],
  },
  {
    id: "hours",
    keywords: ["hour", "hours", "open", "opening", "close", "closing", "when are you open", "what time"],
    answer:
      "We're open Tuesday–Friday 9am–8pm, Saturday 8am–6pm, and Sunday 10am–4pm. We're closed on Mondays for team training.",
    quickReplies: ["Where are you located?", "Book an appointment"],
  },
  {
    id: "location",
    keywords: ["where", "location", "address", "parking", "directions", "located"],
    answer:
      "We're at 128 Marlowe Street, Arts District, Riverton NY 10021 — two doors down from the corner café. Free 90-minute parking is available in the lot behind the building.",
    quickReplies: ["Studio hours", "Book an appointment"],
  },
  {
    id: "booking",
    keywords: [
      "book",
      "appointment",
      "schedule",
      "reserve",
      "booking",
      "cancel",
      "reschedule",
      "availability",
      "slot",
    ],
    answer:
      "You can book instantly on our Booking page — pick a service, stylist, and time that works for you. Need to cancel or reschedule? We just ask for 24 hours' notice so we can offer your slot to someone else.",
    quickReplies: ["Take me to booking", "Cancellation policy", "See services"],
  },
  {
    id: "cancellation",
    keywords: ["cancellation policy", "no show", "late fee", "reschedule policy", "deposit"],
    answer:
      "We ask for at least 24 hours' notice to cancel or reschedule without a fee. Color and chemical services over 90 minutes require a card on file to secure the booking, and no-shows may be charged 50% of the service price.",
    quickReplies: ["Book an appointment"],
  },
  {
    id: "payment",
    keywords: ["payment", "pay", "card", "cash", "contactless", "apple pay", "gift card", "tip", "gratuity"],
    answer:
      "We accept all major cards, contactless/Apple Pay, and Lumière gift cards. Cash is welcome too. Gratuity isn't included in service prices — most clients tip 18–20%, but it's always optional.",
    quickReplies: ["Buy a gift card", "See products"],
  },
  {
    id: "first-time",
    keywords: ["first time", "new client", "new here", "what should i expect", "consultation"],
    answer:
      "Welcome! First-time guests get a complimentary consultation before any service so we can talk through your hair/skin history, goals, and any allergies. We recommend arriving 10 minutes early to settle in with a coffee or tea.",
    quickReplies: ["Book an appointment", "See services"],
  },
  {
    id: "patch-test",
    keywords: ["patch test", "allergic reaction", "allergy", "sensitive skin", "sensitivity"],
    answer:
      "For any new color, lash, or brow tint client, we require a patch test at least 48 hours before your appointment — it's a quick, free in-studio test that checks for any sensitivity to the formula. It's an industry-standard safety step, so please book it ahead of your first color or tint service.",
    quickReplies: ["Book an appointment", "See color services"],
  },
  {
    id: "kids",
    keywords: ["kid", "kids", "child", "children", "toddler"],
    answer:
      "We welcome kids! Our Kids Cut service is for ages 12 and under. For color or chemical services, we require clients to be 16+ (or 13+ with a parent's written consent).",
    quickReplies: ["See services"],
  },
  {
    id: "gift-card",
    keywords: ["gift card", "gift certificate", "voucher", "present", "gift"],
    answer:
      "Lumière gift cards are available in-studio or online in any amount from $25, and never expire. They can be used toward any service or retail product — a great last-minute gift.",
    quickReplies: ["Shop products", "Book an appointment"],
  },
  {
    id: "loyalty",
    keywords: ["loyalty", "rewards", "points", "referral", "membership"],
    answer:
      "Our Lumière Rewards program gives you 1 point per $1 spent on services and products — 500 points gets you $25 off. Refer a friend and you'll both get $15 credit after their first visit.",
    quickReplies: ["Book an appointment"],
  },
  {
    id: "keratin-aftercare",
    keywords: ["keratin", "smoothing wash", "how long wait wash", "keratin aftercare"],
    answer:
      "After a keratin smoothing treatment, avoid washing, clipping, or tucking your hair for 72 hours to let the treatment fully bond. After that, we recommend a sulfate-free shampoo to make results last up to 12 weeks.",
    quickReplies: ["Book a keratin treatment", "See color services"],
  },
  {
    id: "lash-aftercare",
    keywords: ["lash aftercare", "lash extension care", "wash lashes", "lash fill"],
    answer:
      "Keep lash extensions dry for the first 24 hours, avoid oil-based makeup removers, and gently brush them daily. Most clients come in for a fill every 2–3 weeks to keep sets looking full.",
    quickReplies: ["Book lash extensions", "See beauty services"],
  },
  {
    id: "gel-removal",
    keywords: ["gel removal", "soak off", "remove gel", "take off gel"],
    answer:
      "Please don't peel gel polish off at home — it can damage the nail plate. Book a soak-off with us; it's quick and gentle, and it's discounted if you're getting a fresh manicure right after.",
    quickReplies: ["Book a manicure"],
  },
  {
    id: "human",
    keywords: ["human", "real person", "speak to someone", "call", "phone number", "manager", "staff member"],
    answer:
      "Of course — you can reach the front desk at (555) 219-4402 or email hello@lumierestudio.com, and a real person will help. Studio hours are on the Contact page.",
    quickReplies: ["Studio hours", "Contact page"],
  },
  {
    id: "allergy-products",
    keywords: ["vegan", "cruelty free", "clean beauty", "ingredients", "fragrance free", "sulfate free"],
    answer:
      "Most of our retail lines are sulfate-free and cruelty-free, and we stock fragrance-free options across skincare and haircare. Ask any team member in-studio for the full ingredient list on a specific product.",
    quickReplies: ["Shop products"],
  },
  {
    id: "bridal",
    keywords: ["bridal", "wedding", "bride", "bridesmaid", "trial"],
    answer:
      "We love a wedding day! Our bridal packages include a hair and makeup trial, then day-of styling for the bride and party on location or in-studio. Reach out via the Contact page and we'll build a custom quote.",
    quickReplies: ["Contact us", "See services"],
  },
];
