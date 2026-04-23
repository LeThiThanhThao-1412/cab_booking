import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class AIClientService {
  private readonly logger = new Logger(AIClientService.name);
  private readonly aiServiceUrl: string;

  constructor(
    private httpService: HttpService,
    private configService: ConfigService,
  ) {
    this.aiServiceUrl = this.configService.get('AI_SERVICE_URL', 'http://localhost:3011');
  }

  async getETAFromAI(
    distance_km: number,
    traffic_level: number,
    time_of_day: number,
    is_peak_hour: boolean,
  ): Promise<number> {
    try {
      const response = await firstValueFrom(
        this.httpService.post(`${this.aiServiceUrl}/api/v1/ai/eta/predict`, {
          distance_km,
          traffic_level,
          time_of_day,
          is_peak_hour,
        }),
      );
      this.logger.log(`AI ETA: ${distance_km}km -> ${response.data.data.eta_minutes} minutes`);
      return response.data.data.eta_minutes;
    } catch (error) {
      this.logger.error(`AI ETA failed: ${error.message}, using fallback`);
      const baseTime = distance_km * 2;
      const trafficFactor = 1 + traffic_level;
      const peakFactor = is_peak_hour ? 1.3 : 1.0;
      return Math.max(2, Math.min(120, Math.round(baseTime * trafficFactor * peakFactor)));
    }
  }

  async getSurgeFromAI(
    demand_index: number,
    supply_index: number,
    hour: number,
    is_weekend: boolean,
  ): Promise<number> {
    try {
      const response = await firstValueFrom(
        this.httpService.post(`${this.aiServiceUrl}/api/v1/ai/surge/calculate`, {
          demand_index,
          supply_index,
          hour,
          is_weekend,
        }),
      );
      this.logger.log(`AI Surge: demand=${demand_index}, supply=${supply_index} -> ${response.data.data.surge_multiplier}x`);
      return response.data.data.surge_multiplier;
    } catch (error) {
      this.logger.error(`AI Surge failed: ${error.message}, using fallback`);
      let surge = demand_index / Math.max(0.2, supply_index);
      if (hour >= 7 && hour <= 9) surge *= 1.2;
      if (hour >= 17 && hour <= 19) surge *= 1.3;
      if (is_weekend && hour >= 18 && hour <= 22) surge *= 1.1;
      return Math.max(1.0, Math.min(3.0, Math.round(surge * 10) / 10));
    }
  }
}