// One tuning source shared by the live machine and the real-Rapier regression.
// No scripted payouts, score grants, target positions or per-frame coin forces.
export const MACHINE = Object.freeze({
  floorFriction: .18, coinFriction: .28, pusherFriction: .38,
  pusherSpeed: 1.85, pusherMax: -.5,
  fixedStep: 1 / 60, maxCatchUpSteps: 6, maxFrameDelta: .1,
  warmupSteps: 240,
});

export function openingCoins(random = Math.random) {
  const items = [], add = (x, y, z) => items.push({x, y, z});
  // A hex-packed apron, with irregular second-layer islands rather than a grid.
  // Keep the front row supported: the pusher, not an initial airborne spawn, pays.
  for (let r = 0; r < 5; r++) for (let k = 0; k < 8; k++) {
    const x = -4.16 + k * 1.17 + (r % 2) * .27;
    const z = -.65 + r * 1.04 + (random() - .5) * .08;
    add(x, .09, z);
    if (r > 0 && random() < .42) add(x + (random() - .5) * .22, .26, z - .12);
  }
  // Three rows bridge the rear stop to the retracting edge. Two rear-only rows
  // used to ride back and forth without feeding the lower apron.
  for (let r = 0; r < 3; r++) for (let k = 0; k < 8; k++) {
    const x = -4.16 + k * 1.17 + (r % 2) * .25;
    const z = -5.48 + r * 1.05 + (random() - .5) * .04;
    add(x, 1.29, z);
    if (r === 1 && k > 1 && k < 6 && random() < .5) add(x + .08, 1.46, z + .16);
  }
  return items;
}
