import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { ETAService } from './eta.service';
import { SurgeService } from './surge.service';

interface ETAHistory {
  distance_km: number;
  traffic_level: number;
  hour: number;
  is_peak_hour: boolean;
  predicted_eta: number;
  actual_eta: number;
  timestamp: string;
}

interface SurgeHistory {
  demand_index: number;
  supply_index: number;
  hour: number;
  is_weekend: boolean;
  predicted_surge: number;
  actual_surge: number;
  timestamp: string;
}

@Injectable()
export class RetrainService {
  private readonly logger = new Logger(RetrainService.name);
  private readonly dataDir = path.join(process.cwd(), 'data');
  private readonly etaHistoryPath = path.join(this.dataDir, 'eta_history.json');
  private readonly surgeHistoryPath = path.join(this.dataDir, 'surge_history.json');

  constructor(
    private etaService: ETAService,
    private surgeService: SurgeService,
  ) {
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }
  }

  async saveETAData(data: any): Promise<{ totalSamples: number }> {
    let history: ETAHistory[] = [];
    if (fs.existsSync(this.etaHistoryPath)) {
      history = JSON.parse(fs.readFileSync(this.etaHistoryPath, 'utf-8'));
    }

    history.push({
      ...data,
      timestamp: new Date().toISOString(),
    });

    // Giữ 10000 mẫu gần nhất
    if (history.length > 10000) {
      history = history.slice(-10000);
    }

    fs.writeFileSync(this.etaHistoryPath, JSON.stringify(history, null, 2));
    this.logger.log(`📊 Saved ETA data, total samples: ${history.length}`);

    return { totalSamples: history.length };
  }

  async saveSurgeData(data: any): Promise<{ totalSamples: number }> {
    let history: SurgeHistory[] = [];
    if (fs.existsSync(this.surgeHistoryPath)) {
      history = JSON.parse(fs.readFileSync(this.surgeHistoryPath, 'utf-8'));
    }

    history.push({
      ...data,
      timestamp: new Date().toISOString(),
    });

    if (history.length > 10000) {
      history = history.slice(-10000);
    }

    fs.writeFileSync(this.surgeHistoryPath, JSON.stringify(history, null, 2));
    this.logger.log(`📊 Saved Surge data, total samples: ${history.length}`);

    return { totalSamples: history.length };
  }

  async retrainETAModel(): Promise<any> {
    this.logger.log('🔄 Retraining ETA model...');

    let history: ETAHistory[] = [];
    if (fs.existsSync(this.etaHistoryPath)) {
      history = JSON.parse(fs.readFileSync(this.etaHistoryPath, 'utf-8'));
    }

    if (history.length < 10) {
      this.logger.warn(`⚠️ Not enough ETA samples (${history.length}), need at least 10`);
      return { success: false, reason: 'Not enough samples', sampleCount: history.length };
    }

    // Tính toán các hệ số từ dữ liệu lịch sử
    const validSamples = history.filter(h => h.actual_eta > 0 && h.distance_km > 0);

    // Tính base ratio (ETA / distance)
    const ratios = validSamples.map(h => h.actual_eta / h.distance_km);
    const baseRatio = ratios.reduce((a, b) => a + b, 0) / ratios.length;

    // Tính traffic weights
    const lowTraffic = validSamples.filter(h => h.traffic_level < 0.4);
    const mediumTraffic = validSamples.filter(h => h.traffic_level >= 0.4 && h.traffic_level < 0.7);
    const highTraffic = validSamples.filter(h => h.traffic_level >= 0.7);

    const trafficWeights = {
      low: lowTraffic.length > 0 ? lowTraffic.map(h => h.actual_eta / (h.distance_km * baseRatio)).reduce((a, b) => a + b, 0) / lowTraffic.length : 0.9,
      medium: mediumTraffic.length > 0 ? mediumTraffic.map(h => h.actual_eta / (h.distance_km * baseRatio)).reduce((a, b) => a + b, 0) / mediumTraffic.length : 1.0,
      high: highTraffic.length > 0 ? highTraffic.map(h => h.actual_eta / (h.distance_km * baseRatio)).reduce((a, b) => a + b, 0) / highTraffic.length : 1.3,
    };

    // Tính peak hour factor
    const peakSamples = validSamples.filter(h => h.is_peak_hour);
    const normalSamples = validSamples.filter(h => !h.is_peak_hour);

    const avgPeak = peakSamples.length > 0 ? peakSamples.map(h => h.actual_eta / (h.distance_km * baseRatio)).reduce((a, b) => a + b, 0) / peakSamples.length : 1.3;
    const avgNormal = normalSamples.length > 0 ? normalSamples.map(h => h.actual_eta / (h.distance_km * baseRatio)).reduce((a, b) => a + b, 0) / normalSamples.length : 1.0;
    const peakHourFactor = avgPeak / avgNormal;

    const newModel = {
      baseRatio: parseFloat(baseRatio.toFixed(2)),
      trafficWeights: {
        low: parseFloat(trafficWeights.low.toFixed(2)),
        medium: parseFloat(trafficWeights.medium.toFixed(2)),
        high: parseFloat(trafficWeights.high.toFixed(2)),
      },
      peakHourFactor: parseFloat(peakHourFactor.toFixed(2)),
      sampleCount: validSamples.length,
      trainedAt: new Date().toISOString(),
    };

    // Cập nhật model
    this.etaService.updateModel(newModel);

    this.logger.log(`✅ ETA model retrained with ${validSamples.length} samples`);
    this.logger.log(`   Base ratio: ${newModel.baseRatio}`);
    this.logger.log(`   Peak hour factor: ${newModel.peakHourFactor}`);
    this.logger.log(`   Traffic weights: L=${newModel.trafficWeights.low}, M=${newModel.trafficWeights.medium}, H=${newModel.trafficWeights.high}`);

    return { success: true, model: newModel, sampleCount: validSamples.length };
  }

  async retrainSurgeModel(): Promise<any> {
    this.logger.log('🔄 Retraining Surge model...');

    let history: SurgeHistory[] = [];
    if (fs.existsSync(this.surgeHistoryPath)) {
      history = JSON.parse(fs.readFileSync(this.surgeHistoryPath, 'utf-8'));
    }

    if (history.length < 10) {
      this.logger.warn(`⚠️ Not enough Surge samples (${history.length}), need at least 10`);
      return { success: false, reason: 'Not enough samples', sampleCount: history.length };
    }

    const validSamples = history.filter(h => h.actual_surge >= 1);

    // Tính toán các hệ số
    const demandImpact = validSamples.map(h => (h.actual_surge - 1) / h.demand_index);
    const supplyImpact = validSamples.map(h => (h.actual_surge - 1) / (1 / h.supply_index));

    const avgDemandWeight = demandImpact.reduce((a, b) => a + b, 0) / demandImpact.length;
    const avgSupplyWeight = supplyImpact.reduce((a, b) => a + b, 0) / supplyImpact.length;

    // Peak hour bonus
    const peakSamples = validSamples.filter(h => h.hour >= 17 && h.hour <= 19);
    const normalSamples = validSamples.filter(h => h.hour < 17 || h.hour > 19);

    const avgPeak = peakSamples.length > 0 ? peakSamples.map(h => h.actual_surge).reduce((a, b) => a + b, 0) / peakSamples.length : 1.5;
    const avgNormal = normalSamples.length > 0 ? normalSamples.map(h => h.actual_surge).reduce((a, b) => a + b, 0) / normalSamples.length : 1.2;
    const peakHourBonus = avgPeak - avgNormal;

    // Weekend bonus
    const weekendSamples = validSamples.filter(h => h.is_weekend);
    const weekdaySamples = validSamples.filter(h => !h.is_weekend);

    const avgWeekend = weekendSamples.length > 0 ? weekendSamples.map(h => h.actual_surge).reduce((a, b) => a + b, 0) / weekendSamples.length : 1.3;
    const avgWeekday = weekdaySamples.length > 0 ? weekdaySamples.map(h => h.actual_surge).reduce((a, b) => a + b, 0) / weekdaySamples.length : 1.1;
    const weekendBonus = avgWeekend - avgWeekday;

    const newModel = {
      baseMultiplier: 1.0,
      demandWeight: parseFloat(avgDemandWeight.toFixed(2)),
      supplyWeight: parseFloat(avgSupplyWeight.toFixed(2)),
      peakHourBonus: parseFloat(peakHourBonus.toFixed(2)),
      weekendBonus: parseFloat(weekendBonus.toFixed(2)),
      sampleCount: validSamples.length,
      trainedAt: new Date().toISOString(),
    };

    this.surgeService.updateModel(newModel);

    this.logger.log(`✅ Surge model retrained with ${validSamples.length} samples`);
    this.logger.log(`   Demand weight: ${newModel.demandWeight}`);
    this.logger.log(`   Supply weight: ${newModel.supplyWeight}`);
    this.logger.log(`   Peak hour bonus: +${newModel.peakHourBonus}`);

    return { success: true, model: newModel, sampleCount: validSamples.length };
  }

  async retrainAllModels(): Promise<any> {
    this.logger.log('🔄 Starting full retrain...');

    const etaResult = await this.retrainETAModel();
    const surgeResult = await this.retrainSurgeModel();

    return {
      eta: etaResult,
      surge: surgeResult,
      timestamp: new Date().toISOString(),
    };
  }
}