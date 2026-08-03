export type GalleryItem = {
  id: string;
  image: string;
  caption: string;
  category: "Hair" | "Color" | "Beauty" | "Nails" | "Studio";
};

export const galleryItems: GalleryItem[] = [
  { id: "g1", image: "1522337360788-8b13dee7a37e", caption: "Fresh balayage, finished with a glossing gloss", category: "Color" },
  { id: "g2", image: "1595476108010-b4d1f102b1b1", caption: "Foilyage in progress", category: "Color" },
  { id: "g3", image: "1487412947147-5cebf100ffc2", caption: "Studio floor at golden hour", category: "Studio" },
  { id: "g4", image: "1470259078422-826894b933aa", caption: "Precision fringe cut", category: "Hair" },
  { id: "g5", image: "1519699047748-de8e457a634e", caption: "Calm, spa-inspired treatment room", category: "Studio" },
  { id: "g6", image: "1516975080664-ed2fc6a32937", caption: "Editorial makeup application", category: "Beauty" },
  { id: "g7", image: "1580618672591-eb180b1a973f", caption: "Hand-painted nail art", category: "Nails" },
  { id: "g8", image: "1560750588-73207b1ef5b8", caption: "Men's grooming and beard shape-up", category: "Hair" },
  { id: "g9", image: "1521590832167-7bcbfaa6381f", caption: "Volume lash set, finished", category: "Beauty" },
  { id: "g10", image: "1633681926035-ec1ac984418a", caption: "Spa pedicure ritual", category: "Nails" },
  { id: "g11", image: "1585232004423-5a5f61a86f6e", caption: "Signature facial in progress", category: "Beauty" },
  { id: "g12", image: "1560066984-138dadb4c035", caption: "Reception, morning light", category: "Studio" },
];
