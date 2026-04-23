import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class SurgeService {
  private readonly logger = new Logger(SurgeService.name);

  async calculateSurge(demand_index: number, supply_index: number, hour: number, is_weekend: boolean): Promise<number> {
    let surge = demand_index / Math.max(0.2, supply_index);
    
    if (hour >= 7 && hour <= 9) surge *= 1.2;
    if (hour >= 17 && hour <= 19) surge *= 1.3;
    if (is_weekend && hour >= 18 && hour <= 22) surge *= 1.1;
    if (hour >= 23 || hour <= 5) surge *= 0.9;
    
    surge = Math.max(1.0, Math.min(3.0, surge));
    const result = Math.round(surge * 10) / 10;
    
    this.logger.log(`Surge calculation: demand=${demand_index}, supply=${supply_index} -> ${result}x`);
    return result;
  }
}
