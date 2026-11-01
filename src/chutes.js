// Fixed-chute insertion. Side chutes cross-slide; pusher direction
// chooses a short side landing or a long slide into the middle.
export const TIMING = Object.freeze({
  holdInterval: 0.2,
  lockAfter: 0.55,
  unlockTap: 0.28,
  pairWindow: 0.08,
});
export const PUSHER = Object.freeze({ back: -3, depth: 6 });

export function pusherFrontZ(phase, pushMax = -0.5) {
  const mid = (PUSHER.back + pushMax) / 2;
  const amp = (pushMax - PUSHER.back) / 2;
  return mid + amp * Math.sin(phase);
}

export function pusherMovingForward(phase) {
  return Math.cos(phase) > 0;
}

export function pendulumOffset(time, scale = 1) {
  const spread = Number.isFinite(scale) ? Math.max(0.65, Math.min(1.8, scale)) : 1;
  return Math.sin(time * 1.35) * 2.35 * spread;
}

export function planInsertion({ side = 'middle', phase = 0, pushMax = -0.5, special = false, both = false, jitter = 0, swing = null } = {}) {
  const front = pusherFrontZ(phase, pushMax);
  const forward = pusherMovingForward(phase);
  if (special) {
    const x = swing == null
      ? Math.max(-1.1, Math.min(1.1, Math.sin(phase) * 0.45 + jitter))
      : Math.max(-2.7, Math.min(2.7, swing + jitter));
    return {
      tier: 2,
      chute: 'pendulum',
      forward,
      travel: 1,
      swing: x,
      spawn: { x, y: 3.85, z: -3.55 },
      land: { x, y: 1.42, z: 0.95 },
      duration: 0.42,
    };
  }
  const resolved = both || side === 'middle' ? 'middle' : side === 'right' ? 'right' : side === 'left' ? 'left' : 'middle';
  const mouthX = resolved === 'left' ? -3.9 : resolved === 'right' ? 3.9 : 0;
  // Forward pusher: the lip arrives early, so the coin barely crosses.
  // Retract: the lip moves away and the coin slides to the middle.
  const travel = resolved === 'middle' ? 1 : forward ? 0.1 : 0.96;
  return {
    tier: 1,
    chute: resolved,
    forward,
    travel,
    spawn: { x: mouthX, y: 3.02, z: -5.55 },
    land: { x: mouthX * (1 - travel) + jitter, y: 1.72, z: front + 0.28 },
    duration: resolved === 'middle' ? 0.2 : 0.18 + travel * 0.16,
  };
}

export function shakePower(pushLevel = 0) {
  const level = Number.isFinite(pushLevel) ? Math.max(0, pushLevel) : 0;
  return 1 + Math.min(5, level) * 0.35;
}

export function fieldImpulse(mode, index = 0, power = 1) {
  const spread = ((index % 9) - 4) / 4;
  const p = Number.isFinite(power) ? power : 1;
  if (mode === 'nuke') return { x: spread * 0.35 * p, y: 0.42 * p, z: 2.15 * p };
  return { x: spread * 0.85 * p, y: 0.62 * p, z: 1.15 * p };
}

export function createLane() {
  return { sources: new Set(), locked: false, cd: 0, heldFor: 0, armUnlock: false };
}

export function createLaunchers() {
  return { left: createLane(), middle: createLane(), right: createLane() };
}

export function engage(lane, source, opts = {}) {
  const fresh = !lane.sources.has(source);
  lane.sources.add(source);
  if (fresh && lane.locked && opts.immediate) {
    lane.armUnlock = true;
    lane.heldFor = 0;
    return { fired: false };
  }
  if (opts.immediate && fresh) {
    lane.cd = TIMING.holdInterval;
    lane.armUnlock = false;
    return { fired: true };
  }
  return { fired: false };
}

export function disengage(lane, source) {
  lane.sources.delete(source);
  if (lane.armUnlock && lane.heldFor < TIMING.unlockTap && lane.sources.size === 0) {
    lane.locked = false;
    lane.armUnlock = false;
    lane.cd = TIMING.holdInterval;
    return;
  }
  if (lane.sources.size === 0) lane.armUnlock = false;
}

export function releaseLaunchers(lanes) {
  for (const lane of Object.values(lanes)) {
    lane.sources.clear();
    lane.locked = false;
    lane.armUnlock = false;
    lane.heldFor = 0;
  }
}

export function stepLaunchers(lanes, dt) {
  const step = Math.max(0, dt);
  const fired = [];
  for (const [side, lane] of Object.entries(lanes)) {
    const down = lane.sources.size > 0;
    if (down) lane.heldFor += step;
    else if (!lane.locked) lane.heldFor = 0;
    if (down && !lane.locked && lane.heldFor >= TIMING.lockAfter) lane.locked = true;
    if (lane.armUnlock && lane.heldFor >= TIMING.unlockTap) lane.armUnlock = false;
    const active = (down || lane.locked) && !lane.armUnlock;
    lane.cd = Math.max(0, lane.cd - step);
    if (active && lane.cd <= 0) {
      fired.push(side);
      lane.cd = TIMING.holdInterval;
    }
  }
  return fired;
}
