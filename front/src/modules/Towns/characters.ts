export type TownService = 'market' | 'blacksmith' | 'auction' | 'quests';
export const services: TownService[] = ['market', 'blacksmith', 'auction', 'quests'];
export const towns = [
  {
    name: 'Aurelia',
    x: 940,
    y: 620,
    names: ['Mara Sunweave', 'Bram Ironhand', 'Lady Imani', 'Aldren Vale'],
    lines: [
      'Good steel, honest scales. What does your journey need?',
      'A blade should outlive its owner. Let us see yours.',
      'Every treasure has a story. Let us find its next chapter.',
      'The citadel has enough heroes in songs. We need one on the road.',
    ],
  },
  {
    name: 'Moonfall',
    x: 2060,
    y: 690,
    names: ['Ilwen Silversilk', 'Sera Moonforge', 'Vaelis Dusk', 'Lethiel Starreader'],
    lines: [
      'Something rare caught your eye? I thought it might.',
      'Silver remembers every hammer stroke. So do I.',
      'Patience. The right buyer always comes beneath these spires.',
      'Some mysteries are best followed by moonlight.',
    ],
  },
  {
    name: 'Evercross',
    x: 1470,
    y: 960,
    names: ['Tarek Wayfarer', 'Hilda Ember', 'Felix Copperwink', 'Rowan Swift'],
    lines: [
      'Seven roads meet here. My wares have travelled all of them.',
      'Road-worn, is it? Put it on the anvil.',
      'No tall tales on my ledger. Just good trades.',
      'You look like someone who can finish a journey.',
    ],
  },
  {
    name: 'Mosskeep',
    x: 1720,
    y: 1640,
    names: ['Fern Willow', 'Dorrin Rootforge', 'Mother Hazel', 'Eryn Thorn'],
    lines: [
      'Take what you need. Leave the forest a little kindness.',
      'Even the oldest oak needs a sharp axe sometimes.',
      'Nothing is wasted here. Someone will treasure it.',
      'The woods have gone quiet. That is never a good sign.',
    ],
  },
  {
    name: 'Westmere',
    x: 520,
    y: 850,
    names: ['Kellan Tide', 'Petra Saltsteel', 'Orson Amber', 'Captain Nessa'],
    lines: [
      'Fresh off the ship. Mind the salt on the crates.',
      'Salt ruins steel. I make sure it gets a fight first.',
      'A fair price, and not a copper lost overboard.',
      'I need steady hands. Sea legs are optional.',
    ],
  },
  {
    name: 'Frostwatch',
    x: 2530,
    y: 520,
    names: ['Ingrid Hearth', 'Torvald Flint', 'Astrid Snow', 'Rurik Grey'],
    lines: [
      'Come closer to the fire. Let us get you equipped.',
      'Cold steel snaps. Mine does not.',
      'A good bargain should keep both sides warm.',
      'Tracks in the snow. Too large for wolves. Will you look?',
    ],
  },
  {
    name: 'Larkhaven',
    x: 1120,
    y: 1580,
    names: ['Lucan Glass', 'Amara Copper', 'Master Pell', 'Tessa Reed'],
    lines: [
      'Careful with that one. Beautiful things can still be useful.',
      'Craft is patience made solid. What shall we improve?',
      'An unusual piece! Let us give it a proper audience.',
      'I have a theory. Unfortunately, it requires fieldwork.',
    ],
  },
];
export function characterFor(service: TownService, townName?: string, position?: { x: number; y: number }) {
  const explicit = towns.findIndex((town) => town.name.toLowerCase() === townName?.toLowerCase());
  const nearest = position
    ? towns.reduce(
        (best, town, index) =>
          Math.hypot(town.x - position.x, town.y - position.y) <
          Math.hypot(towns[best]!.x - position.x, towns[best]!.y - position.y)
            ? index
            : best,
        0
      )
    : 2;
  const row = explicit >= 0 ? explicit : nearest;
  const town = towns[row]!;
  const column = services.indexOf(service);
  return { town: town.name, name: town.names[column], greeting: town.lines[column], row, column };
}
