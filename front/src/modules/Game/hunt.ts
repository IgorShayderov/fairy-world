export const rollHuntDelaySeconds = (random: () => number = Math.random) =>
  Math.min(10, Math.max(1, Math.floor(random() * 10) + 1));
