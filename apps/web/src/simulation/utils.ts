export const rad2deg = (rad: number): number => (rad * 180) / Math.PI;

export const deg2rad = (deg: number): number => (deg * Math.PI) / 180;

/** Clamp a number into the inclusive range [lo, hi]. */
export const clamp = (x: number, lo: number, hi: number): number =>
  Math.min(Math.max(x, lo), hi);

/** First-order low-pass filter for smoothing score curves. */
export const lowPass = (prev: number, curr: number, alpha: number): number =>
  prev * (1 - alpha) + curr * alpha;
