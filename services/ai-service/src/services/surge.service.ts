import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

interface SurgeModel {
  baseMultiplier: number;
  demandWeight: number;
  supplyWeight: number;
  peakHourBonus: number;
  weekendBonus: number;
  sampleCount: number;
  trainedAt: string;
}

@Injectable()
export class SurgeService {
  private readonly logger = new Logger(SurgeService.name);
  private model: SurgeModel | null = null;

  constructor() {
    this.loadModel();
  }

  private loadModel() {
    try {
      const modelPath = path.join(process.cwd(), 'models/surge-model.json');
      if (fs.existsSync(modelPath)) {
        this.model = JSON.parse(fs.readFileSync(modelPath, 'utf-8'));
        this.logger.log(`✅ Loaded Surge model (${this.model.sampleCount} samples, trained at ${this.model.trainedAt})`);
      } else {
        this.logger.warn('⚠️ No trained Surge model found, using default');
        this.model = {
          baseMultiplier: 1.0,
          demandWeight: 0.5,
          supplyWeight: 0.5,
          peakHourBonus: 0.3,
          weekendBonus: 0.1,
          sampleCount: 0,
          trainedAt: new Date().toISOString(),
        };
      }
    } catch (error) {
      this.logger.error(`Failed to load Surge model: ${error.message}`);
    }
  }

  async calculateSurge(demand_index: number, supply_index: number, hour: number, is_weekend: boolean): Promise<number> {
    if (!this.model) {
      this.loadModel();
    }

    // Tính surge theo model
    let surge = this.model!.baseMultiplier;
    surge += demand_index * this.model!.demandWeight;
    surge -= supply_index * this.model!.supplyWeight;

    // Điều chỉnh theo giờ
    if (hour >= 7 && hour <= 9) surge += this.model!.peakHourBonus;
    if (hour >= 17 && hour <= 19) surge += this.model!.peakHourBonus;
    if (is_weekend && (hour >= 18 && hour <= 22)) surge += this.model!.weekendBonus;

    surge = Math.max(1.0, Math.min(3.0, Math.round(surge * 10) / 10));

    this.logger.log(`📈 Surge calculation: demand=${demand_index}, supply=${supply_index}, hour=${hour} → ${surge}x`);
    return surge;
  }

  // For retrain service
  getCurrentModel(): SurgeModel | null {
    return this.model;
  }

  updateModel(newModel: SurgeModel) {
    this.model = newModel;
    const modelPath = path.join(process.cwd(), 'models/surge-model.json');
    fs.writeFileSync(modelPath, JSON.stringify(newModel, null, 2));
    this.logger.log(`✅ Surge model updated with ${newModel.sampleCount} samples`);
  }
}