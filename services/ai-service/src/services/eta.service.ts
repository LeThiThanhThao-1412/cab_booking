import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

interface ETAModel {
  baseRatio: number;
  trafficWeights: { low: number; medium: number; high: number };
  peakHourFactor: number;
  sampleCount: number;
  trainedAt: string;
}

@Injectable()
export class ETAService {
  private readonly logger = new Logger(ETAService.name);
  private model: ETAModel | null = null;

  constructor() {
    this.loadModel();
  }

  private loadModel() {
    try {
      const modelPath = path.join(process.cwd(), 'models/eta-model.json');
      if (fs.existsSync(modelPath)) {
        this.model = JSON.parse(fs.readFileSync(modelPath, 'utf-8'));
        this.logger.log(`✅ Loaded ETA model (${this.model.sampleCount} samples, trained at ${this.model.trainedAt})`);
      } else {
        this.logger.warn('⚠️ No trained ETA model found, using default');
        this.model = {
          baseRatio: 2.5,
          trafficWeights: { low: 0.9, medium: 1.0, high: 1.3 },
          peakHourFactor: 1.3,
          sampleCount: 0,
          trainedAt: new Date().toISOString(),
        };
      }
    } catch (error) {
      this.logger.error(`Failed to load ETA model: ${error.message}`);
    }
  }

  async predictETA(distance_km: number, traffic_level: number, time_of_day: number, is_peak_hour: boolean): Promise<number> {
    if (!this.model) {
      this.loadModel();
    }

    // Xác định traffic weight
    let trafficWeight = this.model!.trafficWeights.medium;
    if (traffic_level < 0.4) trafficWeight = this.model!.trafficWeights.low;
    if (traffic_level >= 0.7) trafficWeight = this.model!.trafficWeights.high;

    // Tính ETA theo model
    let eta = distance_km * this.model!.baseRatio * trafficWeight;
    if (is_peak_hour) {
      eta *= this.model!.peakHourFactor;
    }

    eta = Math.max(2, Math.min(120, Math.round(eta)));

    this.logger.log(`📊 ETA prediction: ${distance_km}km, traffic=${traffic_level}, peak=${is_peak_hour} → ${eta} min`);
    return eta;
  }

  // For retrain service
  getCurrentModel(): ETAModel | null {
    return this.model;
  }

  updateModel(newModel: ETAModel) {
    this.model = newModel;
    const modelPath = path.join(process.cwd(), 'models/eta-model.json');
    fs.writeFileSync(modelPath, JSON.stringify(newModel, null, 2));
    this.logger.log(`✅ ETA model updated with ${newModel.sampleCount} samples`);
  }
}