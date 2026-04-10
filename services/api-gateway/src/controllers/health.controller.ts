import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import { Response } from 'express';
import { ServiceRegistry } from '../services/service-registry.service';

@Controller('health')
export class HealthController {
  constructor(private serviceRegistry: ServiceRegistry) {}

  @Get()
  async health(@Res() res: Response) {
    const services = this.serviceRegistry.getAllServices();
    const healthyServices = this.serviceRegistry.getHealthyServices();
    
    const status = {
      status: healthyServices.length === services.length ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      services: services.map(s => ({
        name: s.name,
        status: s.health ? 'up' : 'down',
        url: s.url,
        lastCheck: s.lastCheck,
      })),
      summary: {
        total: services.length,
        healthy: healthyServices.length,
        unhealthy: services.length - healthyServices.length,
      },
    };
    
    const httpStatus = healthyServices.length === 0 
      ? HttpStatus.SERVICE_UNAVAILABLE 
      : HttpStatus.OK;
    
    res.status(httpStatus).json(status);
  }
}