export type Distribution = { 1: number; 2: number; 3: number; 4: number; 5: number };
export type Aggregate = { avg: number | null; count: number; distribution: Distribution };

export function computeAggregate(ratings: number[]): Aggregate {
  const distribution: Distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  if (ratings.length === 0) return { avg: null, count: 0, distribution };
  let sum = 0;
  for (const r of ratings) {
    if (r >= 1 && r <= 5) {
      distribution[r as 1 | 2 | 3 | 4 | 5]++;
      sum += r;
    }
  }
  return { avg: Math.round((sum / ratings.length) * 100) / 100, count: ratings.length, distribution };
}
