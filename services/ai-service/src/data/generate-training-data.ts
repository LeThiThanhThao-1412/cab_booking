import * as fs from 'fs';
import * as path from 'path';

// ==================== TẠO DỮ LIỆU ETA (1000+ mẫu) ====================
function generateETAData(count: number = 1000) {
  const data: any[] = [];
  
  // Định nghĩa scenarios với kiểu rõ ràng
  const scenarios: Array<[number, number, number, number, number, string]> = [
    [0.5, 1, 3, 0, 0.3, 'cực gần'],
    [1, 2, 5, 0, 0.3, 'rất gần'],
    [2, 4, 8, 0.1, 0.4, 'gần'],
    [3, 6, 12, 0.2, 0.5, 'trung bình gần'],
    [5, 10, 18, 0.2, 0.6, 'trung bình'],
    [8, 16, 28, 0.3, 0.7, 'xa'],
    [10, 20, 35, 0.3, 0.8, 'khá xa'],
    [15, 30, 55, 0.4, 0.9, 'xa'],
    [20, 40, 75, 0.5, 1.0, 'rất xa'],
    [30, 60, 120, 0.6, 1.0, 'cực xa'],
  ];
  
  for (let i = 0; i < count; i++) {
    const randomIndex = Math.floor(Math.random() * scenarios.length);
    const scenario = scenarios[randomIndex];
    
    const dist = scenario[0];
    const minEta = scenario[1];
    const maxEta = scenario[2];
    const trafficMin = scenario[3];
    const trafficMax = scenario[4];
    const label = scenario[5];
    
    // Thêm variation
    const distance_km = Number((dist + (Math.random() - 0.5) * (dist * 0.2)).toFixed(1));
    const traffic_level = Number((trafficMin + Math.random() * (trafficMax - trafficMin)).toFixed(2));
    const time_of_day = Math.floor(Math.random() * 24);
    const is_peak_hour = (time_of_day >= 7 && time_of_day <= 9) || (time_of_day >= 17 && time_of_day <= 19);
    
    // Tính ETA theo công thức
    const baseTime = distance_km * 2;
    const trafficFactor = 1 + traffic_level;
    const peakFactor = is_peak_hour ? 1.3 : 1.0;
    let eta = baseTime * trafficFactor * peakFactor;
    
    // Thêm noise ngẫu nhiên
    eta += (Math.random() - 0.5) * 5;
    let etaMinutes = Math.max(minEta, Math.min(maxEta, Math.round(eta)));
    
    data.push({
      distance_km: distance_km,
      traffic_level: traffic_level,
      time_of_day: time_of_day,
      is_peak_hour: is_peak_hour,
      eta_minutes: etaMinutes,
      scenario: label,
    });
  }
  
  return data;
}

// ==================== TẠO DỮ LIỆU SURGE (1000+ mẫu) ====================
function generateSurgeData(count: number = 1000) {
  const data: any[] = [];
  
  // Các kịch bản cung-cầu
  const scenarios: Array<[number, number, number, number, number, number, string]> = [
    [0.2, 0.5, 1.5, 2.5, 1.0, 1.2, 'nhu cầu thấp, nhiều xe'],
    [0.5, 0.8, 1.0, 2.0, 1.0, 1.3, 'nhu cầu thấp, xe vừa'],
    [0.8, 1.2, 0.8, 1.2, 1.0, 1.5, 'bình thường'],
    [1.2, 1.8, 0.6, 1.0, 1.2, 2.0, 'nhu cầu cao, ít xe'],
    [1.8, 2.5, 0.3, 0.6, 1.8, 2.8, 'nhu cầu rất cao, rất ít xe'],
    [2.5, 3.0, 0.1, 0.3, 2.5, 3.0, 'khan hiếm xe'],
  ];
  
  for (let i = 0; i < count; i++) {
    const randomIndex = Math.floor(Math.random() * scenarios.length);
    const scenario = scenarios[randomIndex];
    
    const demandMin = scenario[0];
    const demandMax = scenario[1];
    const supplyMin = scenario[2];
    const supplyMax = scenario[3];
    const desc = scenario[6];
    
    const demand = Number((demandMin + Math.random() * (demandMax - demandMin)).toFixed(2));
    const supply = Number((supplyMin + Math.random() * (supplyMax - supplyMin)).toFixed(2));
    const hour = Math.floor(Math.random() * 24);
    const is_weekend = Math.random() > 0.7;
    const zone = `zone_${Math.floor(Math.random() * 10) + 1}`;
    
    // Tính surge theo công thức
    let surge = demand / Math.max(0.2, supply);
    
    // Điều chỉnh theo giờ
    if (hour >= 7 && hour <= 9) surge = surge * 1.2;
    if (hour >= 17 && hour <= 19) surge = surge * 1.3;
    if (is_weekend && hour >= 18 && hour <= 22) surge = surge * 1.1;
    if (hour >= 23 || hour <= 5) surge = surge * 0.8;
    
    // Giới hạn
    surge = Math.max(1.0, Math.min(3.0, surge));
    
    data.push({
      demand_index: demand,
      supply_index: supply,
      hour: hour,
      is_weekend: is_weekend,
      zone: zone,
      surge_multiplier: Number(surge.toFixed(1)),
      scenario: desc,
    });
  }
  
  return data;
}

// ==================== TẠO DỮ LIỆU DRIVER SCORE ====================
function generateDriverData(count: number = 1000) {
  const data: any[] = [];
  
  for (let i = 0; i < count; i++) {
    const distance_km = Number((Math.random() * 10).toFixed(1));
    const rating = Number((3 + Math.random() * 2).toFixed(1));
    const acceptance_rate = Number((0.5 + Math.random() * 0.5).toFixed(2));
    const total_trips = Math.floor(Math.random() * 1000);
    
    // Công thức tính score
    const distanceScore = Math.min(40, (1 / Math.max(0.5, distance_km)) * 20);
    const ratingScore = rating * 10;
    const acceptanceScore = acceptance_rate * 20;
    const experienceScore = Math.min(10, total_trips / 100);
    
    let score = Math.min(100, Math.round(distanceScore + ratingScore + acceptanceScore + experienceScore));
    
    data.push({
      driver_id: `D${String(i+1).padStart(4, '0')}`,
      distance_km: distance_km,
      rating: rating,
      acceptance_rate: acceptance_rate,
      total_trips: total_trips,
      driver_score: score,
    });
  }
  
  return data;
}

// ==================== TẠO DỮ LIỆU FRAUD ====================
function generateFraudData(count: number = 1000) {
  const data: any[] = [];
  
  for (let i = 0; i < count; i++) {
    const isFraud = Math.random() < 0.15; // 15% fraud
    
    let trip_count = isFraud ? 30 + Math.random() * 50 : 5 + Math.random() * 30;
    let rating = isFraud ? 1 + Math.random() * 2 : 3.5 + Math.random() * 1.5;
    let locationConsistency = isFraud ? Math.random() * 0.4 : 0.6 + Math.random() * 0.4;
    let amount = isFraud ? 300000 + Math.random() * 700000 : 50000 + Math.random() * 250000;
    
    // Tính fraud score
    let score = 0;
    if (trip_count > 30) score += 0.3;
    if (trip_count > 50) score += 0.1;
    if (rating < 2) score += 0.3;
    if (rating < 1) score += 0.1;
    if (locationConsistency < 0.5) score += 0.2;
    if (locationConsistency < 0.3) score += 0.1;
    if (amount > 300000) score += 0.2;
    if (amount > 500000) score += 0.1;
    
    score = Math.min(1, score);
    
    data.push({
      user_id: `U${String(i+1).padStart(6, '0')}`,
      trip_count_30d: Math.round(trip_count),
      avg_rating: Number(rating.toFixed(1)),
      location_consistency: Number(locationConsistency.toFixed(2)),
      amount: Math.round(amount),
      fraud_score: Number(score.toFixed(2)),
      is_fraud: isFraud,
    });
  }
  
  return data;
}

// ==================== LƯU DỮ LIỆU ====================
function saveData() {
  const dataDir = path.join(__dirname, '../../../data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  
  // Tạo dữ liệu
  const etaData = generateETAData(2000);
  const surgeData = generateSurgeData(2000);
  const driverData = generateDriverData(1000);
  const fraudData = generateFraudData(1000);
  
  // Lưu file
  fs.writeFileSync(path.join(dataDir, 'eta_training.json'), JSON.stringify(etaData, null, 2));
  fs.writeFileSync(path.join(dataDir, 'surge_training.json'), JSON.stringify(surgeData, null, 2));
  fs.writeFileSync(path.join(dataDir, 'driver_training.json'), JSON.stringify(driverData, null, 2));
  fs.writeFileSync(path.join(dataDir, 'fraud_training.json'), JSON.stringify(fraudData, null, 2));
  
  console.log('✅ Training data generated:');
  console.log(`   - eta_training.json: ${etaData.length} samples`);
  console.log(`   - surge_training.json: ${surgeData.length} samples`);
  console.log(`   - driver_training.json: ${driverData.length} samples`);
  console.log(`   - fraud_training.json: ${fraudData.length} samples`);
  
  // In ra vài sample để kiểm tra
  console.log('\n📊 ETA samples:');
  etaData.slice(0, 5).forEach((s: any) => {
    console.log(`   ${s.distance_km}km, traffic=${s.traffic_level}, peak=${s.is_peak_hour} → ${s.eta_minutes}min (${s.scenario})`);
  });
  
  console.log('\n📈 Surge samples:');
  surgeData.slice(0, 5).forEach((s: any) => {
    console.log(`   demand=${s.demand_index}, supply=${s.supply_index}, hour=${s.hour} → ${s.surge_multiplier}x (${s.scenario})`);
  });
  
  console.log('\n⭐ Driver samples:');
  driverData.slice(0, 5).forEach((s: any) => {
    console.log(`   ${s.distance_km}km, rating=${s.rating}, trips=${s.total_trips} → score=${s.driver_score}`);
  });
  
  console.log('\n⚠️ Fraud samples:');
  fraudData.slice(0, 5).forEach((s: any) => {
    console.log(`   trips=${s.trip_count_30d}, rating=${s.avg_rating}, amount=${s.amount} → fraud_score=${s.fraud_score} (is_fraud=${s.is_fraud})`);
  });
}

saveData();
