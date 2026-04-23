import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class MCPService {
  private readonly logger = new Logger(MCPService.name);

  constructor(
    private httpService: HttpService,
    private configService: ConfigService,
  ) {}

  async getContext(booking_id: string, pickup_location: any, dropoff_location: any, vehicle_type: string): Promise<any> {
    const context = {
      ride_id: booking_id,
      pickup: pickup_location,
      dropoff: dropoff_location,
      vehicle_type,
      available_drivers: [
        { id: "D001", distance: 2.5, rating: 4.8, eta: 5, vehicle: "car_4" },
        { id: "D002", distance: 3.2, rating: 4.9, eta: 7, vehicle: "car_4" },
        { id: "D003", distance: 1.8, rating: 4.6, eta: 4, vehicle: "motorbike" }
      ],
      traffic_level: 0.6,
      demand_index: 1.5,
      supply_index: 0.8,
      surge_multiplier: 1.5,
      estimated_price: 85000,
      eta: 8,
      timestamp: new Date().toISOString()
    };
    
    this.logger.log(`MCP Context fetched for booking: ${booking_id}`);
    return context;
  }

  async agentDecision(context: any, action_type: string): Promise<any> {
    let decision = {};
    let reasoning = [];
    
    if (action_type === 'select_driver') {
      const drivers = context.available_drivers || [];
      const scored = drivers.map(d => ({
        ...d,
        score: (1/d.distance) * 30 + d.rating * 10 + (1/d.eta) * 10
      }));
      scored.sort((a, b) => b.score - a.score);
      
      decision = {
        selected_driver: scored[0] || null,
        recommendations: scored.slice(0, 3)
      };
      reasoning = [`Chọn tài xế ${scored[0]?.id} vì có điểm số cao nhất (${scored[0]?.score?.toFixed(1)})`];
    } else if (action_type === 'calculate_price') {
      const basePrice = 20000;
      const distancePrice = (context.distance || 5) * 10000;
      const surgeAmount = (basePrice + distancePrice) * (context.surge_multiplier - 1);
      
      decision = {
        base_price: basePrice,
        distance_price: distancePrice,
        surge_multiplier: context.surge_multiplier,
        surge_amount: surgeAmount,
        total_price: basePrice + distancePrice + surgeAmount
      };
      reasoning = [`Áp dụng surge x${context.surge_multiplier} do nhu cầu cao`];
    }
    
    this.logger.log(`AI Agent decision: ${action_type}`);
    return { decision, reasoning, confidence: 0.85, timestamp: new Date().toISOString() };
  }
}
