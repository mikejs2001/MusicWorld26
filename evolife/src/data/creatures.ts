export type EvolutionStage = {
  id: number;
  name: string;
  emoji: string;
  description: string;
  environment: string;
  evolvesAt: number;
  category: 'primordial' | 'marine' | 'aquatic' | 'terrestrial' | 'primate' | 'beyond';
  milestones: string[];
};

export const EVOLUTION_STAGES: EvolutionStage[] = [
  {
    id: 0,
    name: 'Primordial Microbe',
    emoji: '🦠',
    description:
      'A lone prokaryote — no nucleus, no organelles. Pure chemistry and a desperate will to replicate.',
    environment: 'Primordial Ocean · 3.8 Billion Years Ago',
    evolvesAt: 4,
    category: 'primordial',
    milestones: ['First self-replicating DNA strand', 'Lipid cell membrane formed', 'Chemosynthesis active'],
  },
  {
    id: 1,
    name: 'Eukaryote Cell',
    emoji: '🫧',
    description:
      'You engulfed a bacterium and kept it alive inside you — the mitochondrion. An ancient partnership that changed everything.',
    environment: 'Shallow Ancient Seas · 2 Billion Years Ago',
    evolvesAt: 5,
    category: 'primordial',
    milestones: ['True nucleus developed', 'Mitochondria integrated', 'Sexual reproduction emerges'],
  },
  {
    id: 2,
    name: 'Multicellular Colony',
    emoji: '🌿',
    description:
      'Cells that bonded together and refused to separate. Division of labour has begun — some sense, some move, some feed.',
    environment: 'Ediacaran Seas · 700 Million Years Ago',
    evolvesAt: 6,
    category: 'marine',
    milestones: ['Cell specialisation begins', 'Coordinated group movement', 'Primitive nerve-like signals'],
  },
  {
    id: 3,
    name: 'Cambrian Predator',
    emoji: '🦀',
    description:
      'Eyes. Claws. A hard exoskeleton. The Cambrian explosion ignited the evolutionary arms race — and you are winning.',
    environment: 'Cambrian Seafloor · 540 Million Years Ago',
    evolvesAt: 7,
    category: 'marine',
    milestones: ['Compound eyes evolved', 'Hardened exoskeleton', 'Active predation unlocked'],
  },
  {
    id: 4,
    name: 'Ancient Fish',
    emoji: '🐟',
    description:
      'A spine. A jaw. Fins to steer. You are the first vertebrate — an engineering breakthrough half a billion years in the making.',
    environment: 'Devonian Ocean · 420 Million Years Ago',
    evolvesAt: 7,
    category: 'aquatic',
    milestones: ['Backbone evolved', 'Jaw grown from gill arches', 'Lateral line detects prey'],
  },
  {
    id: 5,
    name: 'Land Walker',
    emoji: '🐊',
    description:
      'Your fins thickened into stumpy limbs. You hauled yourself onto shore and gasped air. Two worlds are now yours.',
    environment: 'Devonian Coastline · 375 Million Years Ago',
    evolvesAt: 8,
    category: 'aquatic',
    milestones: ['Four limbs evolved from fins', 'Proto-lungs developed', 'Amniotic egg frees you from water'],
  },
  {
    id: 6,
    name: 'Dominant Dinosaur',
    emoji: '🦖',
    description:
      'Masters of the land for 165 million years. You are the apex of the Mesozoic — enormous, warm-blooded, and feathered.',
    environment: 'Jurassic Forests · 150 Million Years Ago',
    evolvesAt: 9,
    category: 'terrestrial',
    milestones: ['Air-sac breathing system', 'Pack hunting behaviour', 'Proto-feathers for warmth'],
  },
  {
    id: 7,
    name: 'Ice Age Mammal',
    emoji: '🦣',
    description:
      'The asteroid ended the giants. Warm-blooded, furry, and clever — you emerged from the ashes and inherited the Earth.',
    environment: 'Pleistocene Tundra · 2 Million Years Ago',
    evolvesAt: 10,
    category: 'terrestrial',
    milestones: ['Full warm-blood regulation', 'Dense insulating fur coat', 'Live birth', 'Larger cerebral cortex'],
  },
  {
    id: 8,
    name: 'Early Primate',
    emoji: '🐒',
    description:
      'Opposable thumbs. Colour vision. A social brain wired for faces and politics. The trees are your kingdom — for now.',
    environment: 'Miocene Rainforest · 15 Million Years Ago',
    evolvesAt: 11,
    category: 'primate',
    milestones: ['Opposable thumbs', 'Trichromatic colour vision', 'Complex social bonds', 'Rudimentary tool use'],
  },
  {
    id: 9,
    name: 'Early Human',
    emoji: '🧍',
    description:
      'Upright. Fire. Language. Art. You are something this planet has never produced before — and you know it.',
    environment: 'African Savanna · 300,000 Years Ago',
    evolvesAt: 13,
    category: 'primate',
    milestones: ['Fully bipedal stride', 'Controlled fire', 'Spoken language', 'Cave art and ritual', 'Flint toolmaking'],
  },
  {
    id: 10,
    name: 'Cosmic Being',
    emoji: '🌌',
    description:
      'Consciousness unbound from flesh. You are no longer on the planet — you are the universe quietly observing itself.',
    environment: 'The Infinite Cosmos',
    evolvesAt: 999,
    category: 'beyond',
    milestones: ['Biology transcended', 'Pure energy consciousness', 'Temporal perception unlocked'],
  },
];
