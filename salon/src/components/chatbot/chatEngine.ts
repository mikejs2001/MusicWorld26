import { allServices, serviceCategories } from "../../data/services";
import { products } from "../../data/products";
import { team } from "../../data/team";
import { salon } from "../../data/salon";
import { intents } from "./knowledgeBase";

export type BotReply = {
  text: string;
  quickReplies?: string[];
};

const STOPWORDS = new Set([
  "a",
  "an",
  "the",
  "is",
  "are",
  "do",
  "you",
  "your",
  "i",
  "me",
  "my",
  "to",
  "for",
  "of",
  "and",
  "on",
  "in",
  "at",
  "what",
  "whats",
  "how",
  "much",
  "does",
  "can",
  "it",
  "with",
  "have",
  "has",
  "there",
  "any",
  "please",
  "about",
  "info",
  "information",
]);

function normalize(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenize(input: string): string[] {
  return normalize(input)
    .split(" ")
    .filter((w) => w.length > 1 && !STOPWORDS.has(w));
}

function scoreKeywords(userTokens: string[], normalizedInput: string, keywords: string[]): number {
  let score = 0;
  const paddedInput = ` ${normalizedInput} `;
  for (const kw of keywords) {
    const kwNorm = normalize(kw);
    if (!kwNorm) continue;
    if (paddedInput.includes(` ${kwNorm} `)) {
      // full phrase match (on word boundaries) is a strong signal
      score += kwNorm.split(" ").length * 2;
      continue;
    }
    const kwTokens = kwNorm.split(" ");
    for (const t of kwTokens) {
      if (userTokens.includes(t)) score += 1;
    }
  }
  return score;
}

function findServiceMatch(normalizedInput: string, userTokens: string[]) {
  let best: { score: number; item: (typeof allServices)[number] } | null = null;
  for (const service of allServices) {
    const haystack = `${service.name} ${service.description} ${service.category}`.toLowerCase();
    const nameTokens = tokenize(service.name);
    let score = 0;
    if (normalizedInput.includes(normalize(service.name))) score += 10;
    for (const t of nameTokens) {
      if (userTokens.includes(t)) score += 2;
    }
    for (const t of userTokens) {
      if (haystack.includes(t)) score += 0.5;
    }
    if (score > 0 && (!best || score > best.score)) {
      best = { score, item: service };
    }
  }
  return best && best.score >= 2 ? best.item : null;
}

function findProductMatch(normalizedInput: string, userTokens: string[]) {
  let best: { score: number; item: (typeof products)[number] } | null = null;
  for (const product of products) {
    const haystack = `${product.name} ${product.brand} ${product.category} ${product.description}`.toLowerCase();
    const nameTokens = tokenize(`${product.name} ${product.brand}`);
    let score = 0;
    if (normalizedInput.includes(normalize(product.name))) score += 10;
    if (normalizedInput.includes(normalize(product.brand))) score += 6;
    for (const t of nameTokens) {
      if (userTokens.includes(t)) score += 2;
    }
    for (const t of userTokens) {
      if (haystack.includes(t)) score += 0.4;
    }
    if (score > 0 && (!best || score > best.score)) {
      best = { score, item: product };
    }
  }
  return best && best.score >= 2 ? best.item : null;
}

function findTeamMatch(userTokens: string[]) {
  return team.find((member) => {
    const first = member.name.split(" ")[0].toLowerCase();
    return userTokens.includes(first.toLowerCase());
  });
}

function wantsPricingList(normalizedInput: string): boolean {
  return (
    normalizedInput.includes("price list") ||
    normalizedInput.includes("how much") ||
    normalizedInput.includes("pricing") ||
    normalizedInput.includes("prices") ||
    normalizedInput.includes("cost")
  );
}

export function getBotReply(userInput: string): BotReply {
  const normalizedInput = normalize(userInput);
  const userTokens = tokenize(userInput);

  if (!normalizedInput) {
    return {
      text: "I didn't quite catch that — could you rephrase, or tap one of these?",
      quickReplies: ["See services", "Shop products", "Book an appointment"],
    };
  }

  // 1. Category overview ("what hair services do you offer")
  const categoryMatch = serviceCategories.find((cat) => {
    const words = tokenize(cat.title);
    return words.some((w) => userTokens.includes(w)) || normalizedInput.includes(normalize(cat.title));
  });

  // 2. Specific service or product lookup takes priority — most useful answer
  const serviceMatch = findServiceMatch(normalizedInput, userTokens);
  const productMatch = findProductMatch(normalizedInput, userTokens);

  if (serviceMatch && (!productMatch || serviceMatch.name.length >= productMatch.name.length)) {
    const priceClause = serviceMatch.price.startsWith("From")
      ? serviceMatch.price.toLowerCase()
      : `starts at ${serviceMatch.price}`;
    return {
      text: `${serviceMatch.name} — ${serviceMatch.description} It takes about ${serviceMatch.duration} and ${priceClause}. Want to book it?`,
      quickReplies: ["Book an appointment", "See related services", "Ask something else"],
    };
  }

  if (productMatch) {
    return {
      text: `${productMatch.name} by ${productMatch.brand} — ${productMatch.description} It's ${productMatch.price} for ${productMatch.size}. We stock it in-studio and it can be added to any appointment.`,
      quickReplies: ["Shop all products", "See services", "Ask something else"],
    };
  }

  // 3. Team member lookup
  const teamMatch = findTeamMatch(userTokens);
  if (teamMatch && (normalizedInput.includes("who is") || normalizedInput.includes("book with") || userTokens.includes("stylist") || userTokens.includes("specializ") || normalizedInput.split(" ").length <= 3)) {
    return {
      text: `${teamMatch.name} is our ${teamMatch.role}. Specialties: ${teamMatch.specialties.join(", ")}. ${teamMatch.bio}`,
      quickReplies: ["Book an appointment", "Meet the team"],
    };
  }

  // 4. Category overview
  if (categoryMatch && !wantsPricingList(normalizedInput)) {
    const list = categoryMatch.services
      .slice(0, 4)
      .map((s) => `${s.name} (${s.price})`)
      .join(", ");
    return {
      text: `${categoryMatch.title}: ${categoryMatch.blurb} A few favorites: ${list}.`,
      quickReplies: ["Book an appointment", "See full menu", "Ask something else"],
    };
  }

  // 5. Curated knowledge base intents (hours, booking, policies, aftercare, etc.)
  let best: { score: number; intent: (typeof intents)[number] } | null = null;
  for (const intent of intents) {
    const score = scoreKeywords(userTokens, normalizedInput, intent.keywords);
    if (score > 0 && (!best || score > best.score)) {
      best = { score, intent };
    }
  }
  if (best && best.score >= 1.5) {
    return { text: best.intent.answer, quickReplies: best.intent.quickReplies };
  }

  // 6. General pricing ask with nothing specific matched
  if (wantsPricingList(normalizedInput)) {
    return {
      text: `Prices vary by service and stylist level — cuts start at $28, color from $75, facials from $55, and manicures from $32. The full menu with exact pricing is on our Services page.`,
      quickReplies: ["See full menu", "Book an appointment"],
    };
  }

  // 7. Fallback
  return {
    text: `I want to make sure you get the right answer — I couldn't quite match that to something in my notes. You can browse our full services and products below, or reach the studio directly at ${salon.phone}.`,
    quickReplies: ["See services", "Shop products", "Studio hours", "Talk to a human"],
  };
}
