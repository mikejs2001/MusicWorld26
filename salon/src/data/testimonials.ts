export type Testimonial = {
  name: string;
  quote: string;
  service: string;
  rating: number;
};

export const testimonials: Testimonial[] = [
  {
    name: "Harper T.",
    quote:
      "My balayage has never looked this natural. Priya listened to exactly what I wanted and the upkeep has been so easy.",
    service: "Balayage with Priya",
    rating: 5,
  },
  {
    name: "Devon M.",
    quote:
      "Booked online in two minutes, got a text reminder, and Noah gave me the best cut I've had in years. Zero stress.",
    service: "Signature Cut with Noah",
    rating: 5,
  },
  {
    name: "Sofia R.",
    quote:
      "The signature facial is worth every minute. Camille explained everything she was doing and my skin glowed for days.",
    service: "Signature Facial with Camille",
    rating: 5,
  },
  {
    name: "Ally K.",
    quote:
      "Jade's volume lash sets are unreal — so lightweight and they lasted a full three weeks with barely any fallout.",
    service: "Volume Lashes with Jade",
    rating: 5,
  },
  {
    name: "Priya S.",
    quote:
      "Used the chat assistant to check pricing before booking and it answered everything instantly. Loved the whole experience.",
    service: "Gel Manicure with Mia",
    rating: 5,
  },
  {
    name: "Grace W.",
    quote:
      "Elena fixed a box-dye disaster in one visit. I was nervous but she talked me through the whole process.",
    service: "Color Correction with Elena",
    rating: 5,
  },
];
