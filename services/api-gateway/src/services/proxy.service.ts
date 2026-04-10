import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { ServiceRegistry } from './service-registry.service';
import { Request } from 'express';

@Injectable()
export class ProxyService {
  private readonly logger = new Logger(ProxyService.name);

  constructor(
    private httpService: HttpService,
    private serviceRegistry: ServiceRegistry,
  ) {}

  async forwardRequest(req: Request): Promise<any> {
    const { path, method, body, query, headers } = req;
    
    this.logger.debug(`Incoming request: ${method} ${path}`);
    
    // Find route
    const routeConfig = this.serviceRegistry.findRoute(path, method);
    
    if (!routeConfig) {
      this.logger.warn(`Route not found: ${method} ${path}`);
      throw new HttpException('Route not found', HttpStatus.NOT_FOUND);
    }
    
    const { service, route } = routeConfig;
    
    this.logger.debug(`Route found: ${route.method} ${route.path} → ${service.name}`);
    
    // Check service health
    if (!service.health) {
      this.logger.error(`Service ${service.name} is unhealthy`);
      throw new HttpException('Service unavailable', HttpStatus.SERVICE_UNAVAILABLE);
    }
    
    // Build target URL
    const targetUrl = this.serviceRegistry.buildTargetUrl(service, route, path);
    
    this.logger.debug(`Proxying to: ${targetUrl}`);
    
    // Build request headers
    const forwardHeaders = { ...headers };
    delete forwardHeaders.host;
    delete forwardHeaders['content-length'];
    
    // Add internal service identification
    forwardHeaders['x-service-id'] = 'api-gateway';
    forwardHeaders['x-internal-key'] = process.env.INTERNAL_API_KEY || 'internal-key';
    
    // If user is authenticated, forward user info
    if ((req as any).user) {
      forwardHeaders['x-user-id'] = (req as any).user.sub;
      forwardHeaders['x-user-role'] = (req as any).user.role;
    }
    
    try {
      const response = await firstValueFrom(
        this.httpService.request({
          url: targetUrl,
          method,
          data: body,
          params: query,
          headers: forwardHeaders,
          timeout: 30000,
        })
      );
      
      this.logger.debug(`Proxy success: ${method} ${path} → ${response.status}`);
      return response.data;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Proxy error: ${errorMessage}`);
      
      if (error instanceof Error && (error as any).response) {
        throw new HttpException(
          (error as any).response.data?.message || error.message,
          (error as any).response.status || HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
      
      throw new HttpException(
        'Service communication failed',
        HttpStatus.BAD_GATEWAY,
      );
    }
  }
}