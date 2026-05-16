export const rad2deg = (rad: number): number => (rad * 180) / Math.PI;

export const deg2rad = (deg: number): number => (deg * Math.PI) / 180;

/** Clamp a number into the inclusive range [lo, hi]. */
export const clamp = (x: number, lo: number, hi: number): number =>
  Math.min(Math.max(x, lo), hi);

/** First-order low-pass filter for smoothing score curves. */
export const lowPass = (prev: number, curr: number, alpha: number): number =>
  prev * (1 - alpha) + curr * alpha;

/** Deterministic PRNG placeholder for future sensor noise. */
export const mulberry32 = (seed: number): (() => number) => {
  let state = seed >>> 0;

  return (): number => {
    state += 0x6d2b79f5;
    let mixed = state;
    mixed = Math.imul(mixed ^ (mixed >>> 15), mixed | 1);
    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61);
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
  };
};
