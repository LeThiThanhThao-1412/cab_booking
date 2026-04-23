import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class MatchingService {
  private readonly logger = new Logger(MatchingService.name);

  async scoreDriver(distance_km: number, rating: number, acceptance_rate: number, total_trips: number): Promise<number> {
    const distanceScore = Math.min(40, (1 / Math.max(0.5, distance_km)) * 20);
    const ratingScore = rating * 10;
    const acceptanceScore = acceptance_rate * 20;
    const experienceScore = Math.min(10, total_trips / 100);
    
    let score = distanceScore + ratingScore + acceptanceScore + experienceScore;
    score = Math.min(100, Math.round(score));
    
    this.logger.log(`Driver scoring: distance=${distance_km}km, rating=${rating} → ${score}`);
    return score;
  }
}