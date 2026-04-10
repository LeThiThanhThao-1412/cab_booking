import { Controller, All, Req, Res, Get, HttpStatus, UseGuards } from '@nestjs/common';
import { Request, Response } from 'express';
import { ProxyService } from '../services/proxy.service';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';

@Controller()
@UseGuards(JwtAuthGuard)
export class GatewayController {
  constructor(private readonly proxyService: ProxyService) {}

  // Test endpoint - không cần auth
  @Get('ping')
  ping(@Res() res: Response) {
    res.status(HttpStatus.OK).json({ 
      message: 'pong', 
      timestamp: new Date().toISOString(),
      services: ['auth', 'user', 'driver', 'booking', 'ride', 'payment', 'pricing', 'notification', 'review']
    });
  }

  // Health endpoint - không cần auth
  @Get('health')
  health(@Res() res: Response) {
    res.status(HttpStatus.OK).json({ 
      status: 'ok', 
      service: 'api-gateway',
      timestamp: new Date().toISOString() 
    });
  }

  @All('*')
  async handleRequest(@Req() req: Request, @Res() res: Response) {
    try {
      const result = await this.proxyService.forwardRequest(req);
      res.status(HttpStatus.OK).json(result);
    } catch (error) {
      const status = (error as any).status || HttpStatus.INTERNAL_SERVER_ERROR;
      res.status(status).json({
        statusCode: status,
        message: (error as any).message || 'Internal server error',
        timestamp: new Date().toISOString(),
        path: req.path,
      });
    }
  }
}