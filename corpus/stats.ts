/** z for a two-sided 95% interval. */
const Z = 1.959963984540054;

/**
 * Wilson score interval for k successes in n trials, as [low, high] in 0..1.
 * It stays inside 0..1 and behaves for rare rules, where k is small.
 */
export function wilson(k: number, n: number): [number, number] {
  if (n === 0) return [0, 0];
  const p = k / n;
  const denominator = 1 + (Z * Z) / n;
  const centre = (p + (Z * Z) / (2 * n)) / denominator;
  const half = (Z * Math.sqrt((p * (1 - p)) / n + (Z * Z) / (4 * n * n))) / denominator;
  return [Math.max(0, centre - half), Math.min(1, centre + half)];
}
