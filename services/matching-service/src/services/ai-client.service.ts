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

  async getDriverScoreFromAI(
    distance_km: number,
    rating: number,
    acceptance_rate: number,
    total_trips: number,
  ): Promise<number> {
    try {
      const response = await firstValueFrom(
        this.httpService.post(`${this.aiServiceUrl}/api/v1/ai/driver/score`, {
          distance_km,
          rating,
          acceptance_rate,
          total_trips,
        }),
      );
      this.logger.log(`🤖 AI Driver Score: distance=${distance_km}km, rating=${rating} -> ${response.data.data.driver_score}`);
      return response.data.data.driver_score;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`AI Driver Score failed: ${message}, using fallback`);
      // Fallback: tính điểm thủ công
      const distanceScore = Math.min(40, (1 / Math.max(0.5, distance_km)) * 20);
      const ratingScore = rating * 10;
      const acceptanceScore = acceptance_rate * 20;
      const experienceScore = Math.min(10, total_trips / 100);
      return Math.min(100, Math.round(distanceScore + ratingScore + acceptanceScore + experienceScore));
    }
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
      return response.data.data.eta_minutes;
    } catch (error) {
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
      return response.data.data.surge_multiplier;
    } catch (error) {
      let surge = demand_index / Math.max(0.2, supply_index);
      if (hour >= 7 && hour <= 9) surge *= 1.2;
      if (hour >= 17 && hour <= 19) surge *= 1.3;
      if (is_weekend && hour >= 18 && hour <= 22) surge *= 1.1;
      return Math.max(1.0, Math.min(3.0, Math.round(surge * 10) / 10));
    }
  }
}