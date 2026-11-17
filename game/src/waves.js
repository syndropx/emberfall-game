// waves.js — the ten waves of the Hollow, and the blessings the keeper can buy with
// harvested embers between them. Waves grow in count, mix and toughness; the draft
// offers three distinct upgrades per break, so no two stands play quite alike.

export const WAVE_PLAN = [
  { husk: 6, soldier: 0, brute: 0, interval: 1.5 },
  { husk: 9, soldier: 2, brute: 0, interval: 1.4 },
  { husk: 12, soldier: 4, brute: 0, interval: 1.3 },
  { husk: 14, soldier: 5, brute: 1, interval: 1.2 },
  { husk: 16, soldier: 7, brute: 1, interval: 1.1 },
  { husk: 18, soldier: 8, brute: 2, interval: 1.0 },
  { husk: 22, soldier: 10, brute: 2, interval: 0.95 },
  { husk: 24, soldier: 12, brute: 3, interval: 0.9 },
  { husk: 28, soldier: 14, brute: 3, interval: 0.82 },
  { husk: 30, soldier: 14, brute: 3, king: 1, interval: 0.8 },
];
export const TOTAL_WAVES = WAVE_PLAN.length;

export function waveComposition(wave) {
  const plan = WAVE_PLAN[wave - 1];
  const list = [];
  for (let i = 0; i < plan.husk; i++) list.push('husk');
  for (let i = 0; i < plan.soldier; i++) list.push('soldier');
  for (let i = 0; i < plan.brute; i++) list.push('brute');
  // Shuffle, but never open a wave with a brute: swap the first brute past position 5.
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  const firstBrute = list.indexOf('brute');
  if (firstBrute >= 0 && firstBrute < 5) {
    const [b] = list.splice(firstBrute, 1);
    list.splice(5 + Math.floor(Math.random() * 4), 0, b);
  }
  // The Hollow King never queues with the rabble: he walks in last, when the wave
  // is thinned and the keeper is tired — the finale the whole night builds toward.
  if (plan.king) list.push('king');
  return { list, total: list.length, interval: plan.interval, hpScale: 1 + (wave - 1) * 0.06 };
}

export const UPGRADES = [
  { id: 'dmg', glyph: '🔥', name: 'Ember Rounds', cost: 60, desc: 'Rifle damage +25%. The Hollow feel every shot sooner.', apply: ({ weapon }) => { weapon.stats.damage = Math.round(weapon.stats.damage * 1.25); } },
  { id: 'rate', glyph: '⚡', name: 'Rapid Cycler', cost: 55, desc: 'Fire rate +18%. The VK-47 cycles like it is angry.', apply: ({ weapon }) => { weapon.stats.fireInterval *= 0.85; } },
  { id: 'mag', glyph: '▣', name: 'Drum Magazine', cost: 45, desc: '+12 rounds per magazine, and a full one right now.', apply: ({ weapon }) => { weapon.stats.magSize += 12; weapon.refill(); } },
  { id: 'pierce', glyph: '✦', name: 'Lance Rounds', cost: 80, desc: 'Rounds pierce one extra Hollow in a line. Crowds beware.', apply: ({ weapon }) => { weapon.stats.pierce += 1; } },
  { id: 'repair', glyph: '◆', name: 'Mend the Crystal', cost: 50, desc: 'Restore 140 of the crystal\'s health, poured back as liquid light.', apply: ({ crystal }) => { crystal.heal(140); } },
  { id: 'vitality', glyph: '♥', name: 'Keeper\'s Heart', cost: 50, desc: '+25 max health, and mend 25 of your wounds with it.', apply: ({ player }) => { player.addMaxHp(25); } },
  { id: 'speed', glyph: '➤', name: 'Dusk Striders', cost: 40, desc: 'Move 12% faster. The plaza feels smaller already.', apply: ({ player }) => { player.addSpeed(0.12); } },
  { id: 'siphon', glyph: '◎', name: 'Ember Siphon', cost: 55, desc: 'Every kill pays 50% more embers, rounded up with interest.', apply: ({ game }) => { game.emberMultiplier *= 1.5; } },
  { id: 'wind', glyph: '✚', name: 'Second Wind', cost: 35, desc: 'Catch your breath: heal 60 health immediately.', apply: ({ player }) => { player.heal(60); } },
  { id: 'smg', glyph: '≫', name: 'Raptor SMG', cost: 85, desc: 'Trade the VK-47 for the Raptor: twice the fire rate, lighter rounds, 40 in the drum. A different stand entirely.', apply: ({ weapon }) => { weapon.swapTo('smg'); } },
];

export function draftUpgrades(count = 3, exclude = new Set()) {
  const pool = UPGRADES.filter((u) => !exclude.has(u.id));
  const picked = [];
  while (picked.length < count && pool.length) {
    picked.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
  }
  return picked;
}
