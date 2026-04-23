// Rule-based Driver Scoring (theo tài liệu trang 12)
export function scoreDriver(
  distance_km: number,
  rating: number,
  acceptance_rate: number,
  total_trips: number
): number {
  const distanceScore = Math.min(40, (1 / Math.max(0.5, distance_km)) * 20);
  const ratingScore = rating * 6;
  const acceptanceScore = acceptance_rate * 20;
  const experienceScore = Math.min(10, total_trips / 100);
  
  let score = distanceScore + ratingScore + acceptanceScore + experienceScore;
  return Math.min(100, Math.round(score));
}