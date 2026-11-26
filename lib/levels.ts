export const LEVELS = [
  { name: "Newcomer", min: 0 },
  { name: "Explorer", min: 100 },
  { name: "Builder", min: 500 },
  { name: "Contributor", min: 1500 },
  { name: "Achiever", min: 4000 },
  { name: "Legend", min: 10000 },
];

export function getLevel(xp: number) {
  let index = 0;
  for (let k = 0; k < LEVELS.length; k++) if (xp >= LEVELS[k].min) index = k;
  const cur = LEVELS[index];
  const next = LEVELS[index + 1];
  return {
    index,
    name: cur.name,
    next: next ? next.name : null,
    toNext: next ? next.min - xp : 0,
    progress: next ? (xp - cur.min) / (next.min - cur.min) : 1,
  };
}
