// Rule-based Fraud Detection (theo tài liệu trang 18)
export function detectFraud(
  trip_count_30d: number,
  avg_rating: number,
  location_consistency: number,
  amount: number
): number {
  let score = 0;
  
  if (trip_count_30d > 30) score += 0.3;
  if (trip_count_30d > 50) score += 0.1;
  if (avg_rating < 2) score += 0.3;
  if (avg_rating < 1) score += 0.1;
  if (location_consistency < 0.5) score += 0.2;
  if (location_consistency < 0.3) score += 0.1;
  if (amount > 300000) score += 0.2;
  if (amount > 500000) score += 0.1;
  
  return Math.min(1, Math.round(score * 100) / 100);
}