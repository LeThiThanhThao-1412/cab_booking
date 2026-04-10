import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import { Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { ServiceRegistry } from '../services/service-registry.service';

@Controller('info')
export class InfoController {
  constructor(
    private configService: ConfigService,
    private serviceRegistry: ServiceRegistry,
  ) {}

  @Get()
  async info(@Res() res: Response) {
    const services = this.serviceRegistry.getAllServices();
    
    const info = {
      name: 'CAB Booking System API Gateway',
      version: '1.0.0',
      environment: this.configService.get('NODE_ENV', 'development'),
      timestamp: new Date().toISOString(),
      endpoints: services.map(s => ({
        service: s.name,
        baseUrl: s.url,
        routes: s.routes.map(r => ({
          method: r.method,
          path: r.path,
          authRequired: r.authRequired,
          roles: r.roles,
        })),
      })),
    };
    
    res.status(HttpStatus.OK).json(info);
  }
}