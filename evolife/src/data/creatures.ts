export type EvolutionStage = {
  id: number;
  name: string;
  emoji: string;
  description: string;
  environment: string;
  evolvesAt: number; // evolution points needed to reach next stage
  category: 'primordial' | 'aquatic' | 'terrestrial' | 'primate' | 'civilization' | 'beyond';
};

export const EVOLUTION_STAGES: EvolutionStage[] = [
  {
    id: 0,
    name: 'Primordial Microbe',
    emoji: '🦠',
    description: 'A single-celled organism floating in the ancient ocean',
    environment: 'Primordial Soup',
    evolvesAt: 3,
    category: 'primordial',
  },
  {
    id: 1,
    name: 'Simple Organism',
    emoji: '🐛',
    description: 'A multicellular creature beginning to sense the world',
    environment: 'Shallow Sea',
    evolvesAt: 3,
    category: 'primordial',
  },
  {
    id: 2,
    name: 'Aquatic Creature',
    emoji: '🐟',
    description: 'A nimble swimmer navigating the open ocean',
    environment: 'Open Ocean',
    evolvesAt: 3,
    category: 'aquatic',
  },
  {
    id: 3,
    name: 'Amphibian',
    emoji: '🐸',
    description: 'First steps onto land — two worlds to explore',
    environment: 'Coastal Wetlands',
    evolvesAt: 3,
    category: 'aquatic',
  },
  {
    id: 4,
    name: 'Land Creature',
    emoji: '🦎',
    description: 'Fully adapted to land, scaling rocks and deserts',
    environment: 'Ancient Forests',
    evolvesAt: 3,
    category: 'terrestrial',
  },
  {
    id: 5,
    name: 'Large Predator',
    emoji: '🦁',
    description: 'Apex hunter of the prehistoric savanna',
    environment: 'Prehistoric Savanna',
    evolvesAt: 3,
    category: 'terrestrial',
  },
  {
    id: 6,
    name: 'Early Primate',
    emoji: '🐒',
    description: 'Clever, social — beginning to use tools',
    environment: 'Tropical Rainforest',
    evolvesAt: 3,
    category: 'primate',
  },
  {
    id: 7,
    name: 'Early Human',
    emoji: '🧍',
    description: 'Upright, resourceful, and beginning to communicate',
    environment: 'Ancient Plains',
    evolvesAt: 3,
    category: 'primate',
  },
  {
    id: 8,
    name: 'Civilization Builder',
    emoji: '🏛️',
    description: 'Master of fire, language, and architecture',
    environment: 'Ancient Cities',
    evolvesAt: 3,
    category: 'civilization',
  },
  {
    id: 9,
    name: 'Space Explorer',
    emoji: '👨‍🚀',
    description: 'Reaching beyond the planet into the cosmos',
    environment: 'Near Earth Orbit',
    evolvesAt: 3,
    category: 'civilization',
  },
  {
    id: 10,
    name: 'Cosmic Being',
    emoji: '🌌',
    description: 'Transcending biology — a being of pure energy and thought',
    environment: 'The Cosmos',
    evolvesAt: 999,
    category: 'beyond',
  },
];
