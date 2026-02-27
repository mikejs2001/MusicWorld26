export type ChallengeCategory =
  | 'primordial'
  | 'aquatic'
  | 'terrestrial'
  | 'primate'
  | 'civilization'
  | 'fantasy';

export type Challenge = {
  id: string;
  emoji: string;
  name: string;
  description: string;
  category: ChallengeCategory;
  difficulty: 1 | 2 | 3; // 1=easy, 2=medium, 3=hard
  attempts: AttemptScript[];
  successNarrative: string;
  failureNarrative: string;
  evolutionReward: number;
};

export type AttemptScript = {
  text: string;
  outcome: 'fail' | 'success' | 'near-miss';
};

export const CHALLENGES: Challenge[] = [
  // ---- PRIMORDIAL ----
  {
    id: 'find-nutrients',
    emoji: '🍵',
    name: 'Find Nutrients',
    description: 'Nutrients are scarce in the primordial soup. Absorb enough to survive.',
    category: 'primordial',
    difficulty: 1,
    evolutionReward: 1,
    attempts: [
      { text: 'Drifting toward a chemical gradient… the current pulls away!', outcome: 'fail' },
      { text: 'Sensing a rich pocket of amino acids… almost there…', outcome: 'near-miss' },
      { text: 'Membrane receptors lock on — nutrients absorbed!', outcome: 'success' },
    ],
    successNarrative: 'Your membrane evolved efficient nutrient channels.',
    failureNarrative: 'Starvation has stunted growth. Try again.',
  },
  {
    id: 'survive-radiation',
    emoji: '☢️',
    name: 'Survive Radiation',
    description: 'Intense UV radiation bombards the shallow waters. Protect your DNA.',
    category: 'primordial',
    difficulty: 2,
    evolutionReward: 2,
    attempts: [
      { text: 'UV rays pierce the surface — DNA strand breaks!', outcome: 'fail' },
      { text: 'A pigment mutation absorbs some radiation…', outcome: 'near-miss' },
      { text: 'Melanin-like compounds shield your genetic code!', outcome: 'success' },
    ],
    successNarrative: 'Radiation resistance evolved. A new protective layer forms.',
    failureNarrative: 'Mutation was too severe. The lineage must recover.',
  },
  {
    id: 'temperature-flux',
    emoji: '🌡️',
    name: 'Temperature Extremes',
    description: 'Volcanic vents boil nearby waters. Survive the heat shock.',
    category: 'primordial',
    difficulty: 2,
    evolutionReward: 2,
    attempts: [
      { text: 'Proteins denature in the heat — cell collapses!', outcome: 'fail' },
      { text: 'Heat shock proteins begin to fold protectively…', outcome: 'near-miss' },
      { text: 'Thermostable enzymes kick in — you thrive near the vent!', outcome: 'success' },
    ],
    successNarrative: 'Thermophilic adaptations unlock new metabolic pathways.',
    failureNarrative: 'The heat was too much. Seek cooler waters next time.',
  },
  {
    id: 'replicate',
    emoji: '🔬',
    name: 'Stable Replication',
    description: 'Errors in cell division threaten your lineage. Achieve stable replication.',
    category: 'primordial',
    difficulty: 1,
    evolutionReward: 1,
    attempts: [
      { text: 'Division attempt — chromosome splits unequally!', outcome: 'fail' },
      { text: 'A proofreading mechanism begins to form…', outcome: 'near-miss' },
      { text: 'Perfect division — two healthy daughter cells!', outcome: 'success' },
    ],
    successNarrative: 'DNA repair mechanisms evolved. Replication fidelity increases.',
    failureNarrative: 'Errors accumulate. Stability must be achieved.',
  },

  // ---- AQUATIC ----
  {
    id: 'escape-predator',
    emoji: '🦈',
    name: 'Escape the Predator',
    description: 'A massive sea creature has spotted you. Outswim or outwit it.',
    category: 'aquatic',
    difficulty: 2,
    evolutionReward: 2,
    attempts: [
      { text: 'The predator lunges — too slow to dodge!', outcome: 'fail' },
      { text: 'Darting left then right — the predator follows!', outcome: 'near-miss' },
      { text: 'A sudden burst of speed and camouflage — escaped!', outcome: 'success' },
    ],
    successNarrative: 'Faster fins and counter-shading camouflage evolved.',
    failureNarrative: 'Predator strikes. Survive by evolving better defenses.',
  },
  {
    id: 'navigate-current',
    emoji: '🌊',
    name: 'Navigate Ocean Currents',
    description: 'Powerful currents threaten to sweep you into barren waters.',
    category: 'aquatic',
    difficulty: 1,
    evolutionReward: 1,
    attempts: [
      { text: 'Current drags you toward the abyss!', outcome: 'fail' },
      { text: 'Sensing the water pressure, you angle your fins…', outcome: 'near-miss' },
      { text: 'Riding the current like a river — you navigate perfectly!', outcome: 'success' },
    ],
    successNarrative: 'Lateral line sensory organs developed for current detection.',
    failureNarrative: 'Lost to the deep. Better navigation is needed.',
  },
  {
    id: 'first-breath',
    emoji: '🫁',
    name: 'Breathe Air',
    description: 'The oxygen-rich surface calls. Develop a way to extract it.',
    category: 'aquatic',
    difficulty: 3,
    evolutionReward: 3,
    attempts: [
      { text: 'Surfacing — gills flounder in open air!', outcome: 'fail' },
      { text: 'A primitive lung sac begins to inflate…', outcome: 'near-miss' },
      { text: 'First true breath drawn — a new world of oxygen awaits!', outcome: 'success' },
    ],
    successNarrative: 'Proto-lungs evolved. The land is now within reach.',
    failureNarrative: 'Suffocation at the surface. Air-breathing must develop.',
  },

  // ---- TERRESTRIAL ----
  {
    id: 'survive-wildfire',
    emoji: '🔥',
    name: 'Survive Wildfire',
    description: 'A massive forest fire spreads. Find safety before the flames arrive.',
    category: 'terrestrial',
    difficulty: 2,
    evolutionReward: 2,
    attempts: [
      { text: 'Flames race faster than expected — scorched!', outcome: 'fail' },
      { text: 'Burrowing into the earth — smoke fills the tunnel…', outcome: 'near-miss' },
      { text: 'Safe underground, fireproof scales absorbing the heat!', outcome: 'success' },
    ],
    successNarrative: 'Burrowing instinct and heat-resistant scales evolved.',
    failureNarrative: 'The fire claims the land. Fireproofing must be found.',
  },
  {
    id: 'find-water',
    emoji: '💧',
    name: 'Find Water in Drought',
    description: 'The drought has dried most water sources. Track the last river.',
    category: 'terrestrial',
    difficulty: 2,
    evolutionReward: 2,
    attempts: [
      { text: 'Following old trails — they lead to cracked mud!', outcome: 'fail' },
      { text: 'Detecting humidity in the air — getting closer…', outcome: 'near-miss' },
      { text: 'Digging beneath dry riverbeds — water seeps up!', outcome: 'success' },
    ],
    successNarrative: 'Electroreceptors and digging claws evolved for water detection.',
    failureNarrative: 'Dehydration sets in. Better tracking skills are needed.',
  },
  {
    id: 'ice-age',
    emoji: '❄️',
    name: 'Survive the Ice Age',
    description: 'Temperatures plummet. A glacial age descends upon the land.',
    category: 'terrestrial',
    difficulty: 3,
    evolutionReward: 3,
    attempts: [
      { text: 'Fur too thin — body temperature drops dangerously!', outcome: 'fail' },
      { text: 'Huddling in a cave — still losing heat rapidly…', outcome: 'near-miss' },
      { text: 'Thick underlayer of fat and dense fur withstand the freeze!', outcome: 'success' },
    ],
    successNarrative: 'Mammalian thermoregulation and dense fur evolved.',
    failureNarrative: 'Frozen in the glacial advance. Warmth must come from within.',
  },

  // ---- PRIMATE ----
  {
    id: 'use-tools',
    emoji: '🔧',
    name: 'Use Tools',
    description: 'A nut too hard to crack. Can you figure out how to use a stone?',
    category: 'primate',
    difficulty: 2,
    evolutionReward: 2,
    attempts: [
      { text: 'Banging nut against tree — knuckles aching!', outcome: 'fail' },
      { text: 'Picking up a stone, trial and error begins…', outcome: 'near-miss' },
      { text: 'Precise strike with a rock — nut cracks open perfectly!', outcome: 'success' },
    ],
    successNarrative: 'Prefrontal cortex expands. Tool use is now instinctive.',
    failureNarrative: 'Starvation looms. Problem-solving must improve.',
  },
  {
    id: 'form-alliance',
    emoji: '🤝',
    name: 'Form a Social Alliance',
    description: 'A rival group threatens your territory. Build alliances to survive.',
    category: 'primate',
    difficulty: 2,
    evolutionReward: 2,
    attempts: [
      { text: 'Attempting to approach — rivals bare their teeth!', outcome: 'fail' },
      { text: 'Offering food as a gesture — cautious acceptance…', outcome: 'near-miss' },
      { text: 'Mutual grooming establishes trust — coalition formed!', outcome: 'success' },
    ],
    successNarrative: 'Social bonding hormones evolved. Community is your strength.',
    failureNarrative: 'Isolation leaves you vulnerable. Social skills must develop.',
  },
  {
    id: 'language',
    emoji: '💬',
    name: 'Develop Language',
    description: 'Complex vocalizations could coordinate the group. Find the words.',
    category: 'primate',
    difficulty: 3,
    evolutionReward: 3,
    attempts: [
      { text: 'Mimicking sounds produces random noise — confusion!', outcome: 'fail' },
      { text: 'Consistent calls for "danger" emerge — group partially responds…', outcome: 'near-miss' },
      { text: 'A shared vocabulary forms — the group hunts together!', outcome: 'success' },
    ],
    successNarrative: "Broca's area expands. Complex language unlocks civilization.",
    failureNarrative: 'Without communication, coordination fails. Evolve language.',
  },

  // ---- CIVILIZATION ----
  {
    id: 'agriculture',
    emoji: '🌾',
    name: 'Develop Agriculture',
    description: 'Nomadic life is unsustainable. Learn to grow food.',
    category: 'civilization',
    difficulty: 2,
    evolutionReward: 2,
    attempts: [
      { text: 'Seeds scattered randomly — crop fails in drought!', outcome: 'fail' },
      { text: 'Observing seasonal patterns — planting timing improves…', outcome: 'near-miss' },
      { text: 'Irrigation channels dug — first harvest is abundant!', outcome: 'success' },
    ],
    successNarrative: 'Agricultural knowledge unlocks permanent settlements.',
    failureNarrative: 'Famine strikes. Mastery of the land must come.',
  },
  {
    id: 'space-launch',
    emoji: '🚀',
    name: 'Reach Orbit',
    description: 'The stars call. Build and launch your first rocket.',
    category: 'civilization',
    difficulty: 3,
    evolutionReward: 3,
    attempts: [
      { text: 'Ignition — rocket veers off course and explodes!', outcome: 'fail' },
      { text: 'Second launch — partial orbit achieved before reentry…', outcome: 'near-miss' },
      { text: 'Perfect trajectory — stable orbit achieved! Earth below is beautiful.', outcome: 'success' },
    ],
    successNarrative: 'Space-faring capability achieved. The universe awaits.',
    failureNarrative: 'The stars remain out of reach. Engineering must advance.',
  },

  // ---- FANTASY / BEYOND ----
  {
    id: 'psychic-awakening',
    emoji: '🔮',
    name: 'Psychic Awakening',
    description: 'Dormant mental powers stir. Focus your mind beyond physical limits.',
    category: 'fantasy',
    difficulty: 3,
    evolutionReward: 3,
    attempts: [
      { text: 'Concentrating intensely — thoughts scatter like static!', outcome: 'fail' },
      { text: 'A flicker of telekinesis — a pebble shifts slightly…', outcome: 'near-miss' },
      { text: 'Mind expands beyond skull — objects move at will!', outcome: 'success' },
    ],
    successNarrative: 'Psionic cortex awakened. Reality bends to your thoughts.',
    failureNarrative: 'The mental barrier holds. Focus must deepen.',
  },
  {
    id: 'transcend-time',
    emoji: '⌛',
    name: 'Transcend Time',
    description: 'Time is merely a dimension. Learn to navigate it.',
    category: 'fantasy',
    difficulty: 3,
    evolutionReward: 3,
    attempts: [
      { text: 'Attempting to slip backward — time snaps back violently!', outcome: 'fail' },
      { text: 'Perceiving all moments simultaneously — overwhelmed!', outcome: 'near-miss' },
      { text: 'Flowing through the timeline — past and future are open!', outcome: 'success' },
    ],
    successNarrative: 'Temporal consciousness achieved. You exist in all moments.',
    failureNarrative: 'Time resists your grasp. Higher awareness is needed.',
  },
  {
    id: 'merge-with-cosmos',
    emoji: '✨',
    name: 'Merge with the Cosmos',
    description: 'The final evolution. Become one with the universe itself.',
    category: 'fantasy',
    difficulty: 3,
    evolutionReward: 3,
    attempts: [
      { text: 'Reaching out to the fabric of reality — it repels you!', outcome: 'fail' },
      { text: 'Consciousness begins to dissolve into starlight…', outcome: 'near-miss' },
      { text: 'Form dissipates — you are the stars, the void, everything.', outcome: 'success' },
    ],
    successNarrative: 'Transcendence complete. You are no longer one. You are all.',
    failureNarrative: 'The boundary holds. Total dissolution is not yet possible.',
  },
];

export const getChallengesForStage = (stageId: number): Challenge[] => {
  const categoryMap: Record<number, ChallengeCategory[]> = {
    0: ['primordial'],
    1: ['primordial'],
    2: ['aquatic'],
    3: ['aquatic'],
    4: ['terrestrial'],
    5: ['terrestrial'],
    6: ['primate'],
    7: ['primate'],
    8: ['civilization'],
    9: ['civilization'],
    10: ['fantasy'],
  };
  const categories = categoryMap[stageId] ?? ['fantasy'];
  return CHALLENGES.filter((c) => categories.includes(c.category));
};
