import { Controller, Post, Body, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { ETAService } from '../services/eta.service';
import { SurgeService } from '../services/surge.service';
import { MatchingService } from '../services/matching.service';
import { FraudService } from '../services/fraud.service';
import { MCPService } from '../services/mcp.service';

@Controller('ai')
export class AIController {
  constructor(
    private etaService: ETAService,
    private surgeService: SurgeService,
    private matchingService: MatchingService,
    private fraudService: FraudService,
    private mcpService: MCPService,
  ) {}

  @Post('eta/predict')
  @HttpCode(HttpStatus.OK)
  async predictETA(@Body() body: { distance_km: number; traffic_level: number; time_of_day: number; is_peak_hour: boolean }) {
    const eta = await this.etaService.predictETA(body.distance_km, body.traffic_level, body.time_of_day, body.is_peak_hour);
    return { success: true, data: { eta_minutes: eta } };
  }

  @Post('surge/calculate')
  @HttpCode(HttpStatus.OK)
  async calculateSurge(@Body() body: { demand_index: number; supply_index: number; hour: number; is_weekend: boolean }) {
    const multiplier = await this.surgeService.calculateSurge(body.demand_index, body.supply_index, body.hour, body.is_weekend);
    return { success: true, data: { surge_multiplier: multiplier } };
  }

  @Post('driver/score')
  @HttpCode(HttpStatus.OK)
  async scoreDriver(@Body() body: { distance_km: number; rating: number; acceptance_rate: number; total_trips: number }) {
    const score = await this.matchingService.scoreDriver(body.distance_km, body.rating, body.acceptance_rate, body.total_trips);
    return { success: true, data: { driver_score: score } };
  }

  @Post('fraud/detect')
  @HttpCode(HttpStatus.OK)
  async detectFraud(@Body() body: { trip_count_30d: number; avg_rating: number; location_consistency: number; amount: number }) {
    const fraudScore = await this.fraudService.detectFraud(body.trip_count_30d, body.avg_rating, body.location_consistency, body.amount);
    return { 
      success: true, 
      data: { 
        fraud_score: fraudScore,
        is_fraud_risk: fraudScore > 0.7,
        risk_level: fraudScore > 0.8 ? 'HIGH' : fraudScore > 0.5 ? 'MEDIUM' : 'LOW'
      }
    };
  }

  @Post('mcp/context')
  @HttpCode(HttpStatus.OK)
  async getMCPContext(@Body() body: { booking_id: string; pickup_location: any; dropoff_location: any; vehicle_type: string }) {
    const context = await this.mcpService.getContext(body.booking_id, body.pickup_location, body.dropoff_location, body.vehicle_type);
    return { success: true, data: context };
  }

  @Post('agent/decide')
  @HttpCode(HttpStatus.OK)
  async agentDecision(@Body() body: { context: any; action_type: string }) {
    const decision = await this.mcpService.agentDecision(body.context, body.action_type);
    return { success: true, data: decision };
  }

  @Get('health')
  @HttpCode(HttpStatus.OK)
  health() {
    return { status: 'ok', service: 'ai-service', timestamp: new Date().toISOString() };
  }
}