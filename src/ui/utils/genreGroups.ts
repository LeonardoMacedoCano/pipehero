const GENRE_GROUP_BY_RAW: Record<string, string> = {
  acoustic: "Acoustic",
  agrorock: "Rock",
  alterative: "Rock",
  alternative: "Rock",
  "alternative rock": "Rock",
  axé: "Axé",
  chiptune: "Chiptune",
  choro: "Choro",
  "christian metal": "Metal",
  "classic rock": "Rock",
  "comedy metal": "Metal",
  "comedy rock": "Rock",
  countrycore: "Punk",
  "death metal": "Metal",
  "disco funk": "Funk",
  "ednaldo pereira": "Ednaldo Pereira",
  emo: "Emo",
  emocore: "Emo",
  eurodance: "Electronic",
  "folk metal": "Metal",
  "folk/hard rock": "Rock",
  forró: "Forró",
  "forró / metal": "Metal",
  "forro metal": "Metal",
  funk: "Funk",
  "hard rock": "Rock",
  hardcore: "Punk",
  "hardcore punk": "Punk",
  hardneja: "Punk",
  "heavy metal": "Metal",
  indie: "Indie",
  "indie pop": "Pop",
  "indie rock": "Rock",
  "industrial metal": "Metal",
  instrumenal: "Instrumental",
  instrumental: "Instrumental",
  "instrumental metal": "Metal",
  "instrumental rock": "Rock",
  "mario kart 8": "Mario Kart 8",
  "melodic hardcore": "Punk",
  "melodic metal": "Metal",
  metal: "Metal",
  metalcore: "Metal",
  mpb: "MPB",
  "musica pra chorar": "Musica pra chorar",
  "new wave": "New Wave",
  "nu metal": "Metal",
  "nu-metal": "Metal",
  pião: "Pião",
  pop: "Pop",
  "pop punk": "Punk",
  "pop rock": "Rock",
  "pop-rock": "Rock",
  "pop/dance/electronic": "Electronic",
  "post rock": "Rock",
  "power metal": "Metal",
  "power pop": "Pop",
  "progessive metal": "Metal",
  "progressive metal": "Metal",
  "progresssive metal": "Metal",
  "punk rock": "Punk",
  rap: "Rap",
  "rap metal": "Metal",
  "rap rock": "Rock",
  "rapcore/rock": "Rock",
  reggae: "Reggae",
  rock: "Rock",
  "rock 'n roll": "Rock",
  "rock n roll": "Rock",
  rockabilly: "Rock",
  samba: "Samba",
  sertacore: "Punk",
  sertanejo: "Sertanejo",
  "skate punk": "Punk",
  "soft rock": "Rock",
  "stoner rock": "Rock",
  tecnomelody: "Tecnomelody",
  "thrash metal": "Metal",
  "vgm cover": "VGM Cover",
};

const SUFFIX_FALLBACKS: Array<[suffix: string, group: string]> = [
  ["metal", "Metal"],
  ["rock", "Rock"],
  ["punk", "Punk"],
  ["pop", "Pop"],
  ["funk", "Funk"],
];

export function normalizeGenreGroup(rawGenre: string): string {
  const trimmed = rawGenre.trim().replace(/\s+/g, " ");
  if (!trimmed) return "";

  const key = trimmed.toLowerCase();
  const known = GENRE_GROUP_BY_RAW[key];
  if (known) return known;

  for (const [suffix, group] of SUFFIX_FALLBACKS) {
    if (key.endsWith(suffix)) return group;
  }

  return trimmed;
}
