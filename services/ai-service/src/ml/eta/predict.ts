// Rule-based ETA prediction (theo tài liệu trang 13, 21)
export function predictETA(
  distance_km: number,
  traffic_level: number,
  time_of_day: number,
  is_peak_hour: boolean
): number {
  const baseTime = distance_km * 2;
  const trafficFactor = 1 + traffic_level;
  const peakFactor = is_peak_hour ? 1.3 : 1.0;
  
  let timeFactor = 1.0;
  if (time_of_day >= 7 && time_of_day <= 9) timeFactor = 1.2;
  if (time_of_day >= 17 && time_of_day <= 19) timeFactor = 1.25;
  if (time_of_day >= 22 || time_of_day <= 5) timeFactor = 0.9;
  
  let eta = baseTime * trafficFactor * peakFactor * timeFactor;
  eta = Math.max(2, Math.min(120, Math.round(eta)));
  
  return eta;
}