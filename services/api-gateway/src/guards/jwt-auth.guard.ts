import { Injectable, CanActivate, ExecutionContext, UnauthorizedException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { ServiceRegistry } from '../services/service-registry.service';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  private readonly logger = new Logger(JwtAuthGuard.name);

  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
    private serviceRegistry: ServiceRegistry,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const { path, method } = request;
    
    // Public routes không cần auth
    if (path === '/api/v1/ping' || path === '/api/v1/health' || path === '/api/v1/info') {
      return true;
    }
    
    // Find route configuration
    const routeConfig = this.serviceRegistry.findRoute(path, method);
    
    // If route doesn't require auth
    if (!routeConfig || !routeConfig.route.authRequired) {
      return true;
    }
    
    const token = this.extractTokenFromHeader(request);
    if (!token) {
      throw new UnauthorizedException('No token provided');
    }
    
    try {
      const payload = await this.jwtService.verifyAsync(token, {
        secret: this.configService.get('JWT_SECRET'),
      });
      
      // Check role-based access
      const requiredRoles = routeConfig.route.roles;
      if (requiredRoles && requiredRoles.length > 0) {
        if (!requiredRoles.includes(payload.role)) {
          throw new UnauthorizedException('Insufficient permissions');
        }
      }
      
      request.user = payload;
      return true;
    } catch (error) {
      this.logger.error(`JWT verification failed: ${error instanceof Error ? error.message : String(error)}`);
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  private extractTokenFromHeader(request: any): string | undefined {
    const authHeader = request.headers.authorization;
    if (!authHeader) return undefined;
    const [type, token] = authHeader.split(' ');
    return type === 'Bearer' ? token : undefined;
  }
}