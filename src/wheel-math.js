// The pointer stays at twelve o'clock. Sector zero is centred there at rest.
// Visual sectors are equal sized; reward weights remain in stage-rewards.js.
export function wheelTarget(current, index, count = 6, turns = 5) {
  const stop = ((-index * 360 / count) % 360 + 360) % 360;
  const normalized = ((current % 360) + 360) % 360;
  return current + turns * 360 + ((stop - normalized + 360) % 360);
}
export function sectorAtPointer(rotation, count = 6) {
  return ((Math.round(-rotation / (360 / count)) % count) + count) % count;
}
