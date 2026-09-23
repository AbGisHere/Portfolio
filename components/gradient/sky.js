/**
 * A recipe's sky as a CSS gradient: stops sit mid-band between the `divs`,
 * blended in oklab — the same gradient the engine paints (engine patch 6).
 * Used for the backdrop behind the engine and for scenes that can't run it.
 */
export function skyGradient({ stops, divs }) {
  const inner =
    divs?.length === stops.length - 1
      ? divs
      : stops.slice(1).map((_, i) => (i + 1) / stops.length);
  const edges = [0, ...inner, 1];
  const list = stops.map(
    (c, i) => `${c} ${(((edges[i] + edges[i + 1]) / 2) * 100).toFixed(2)}%`,
  );
  return `linear-gradient(180deg in oklab, ${list.join(', ')})`;
}
