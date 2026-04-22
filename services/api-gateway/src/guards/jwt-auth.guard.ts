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
    
    this.logger.debug(`🔍 Guard checking: ${method} ${path}`);
    
    // Public routes không cần auth
    if (path === '/api/v1/ping' || path === '/api/v1/health' || path === '/api/v1/info') {
      this.logger.debug(`✅ Public route: ${path}`);
      return true;
    }
    
    // Find route configuration
    const routeConfig = this.serviceRegistry.findRoute(path, method);
    this.logger.debug(`📋 Route config found: ${!!routeConfig}`);
    
    // If route doesn't require auth
    if (!routeConfig || !routeConfig.route.authRequired) {
      this.logger.debug(`🔓 Route does not require auth: ${path}`);
      return true;
    }
    
    this.logger.debug(`🔒 Route requires auth: ${path}`);
    
    const token = this.extractTokenFromHeader(request);
    if (!token) {
      this.logger.warn(`❌ No token provided for ${path}`);
      throw new UnauthorizedException('No token provided');
    }
    
    this.logger.debug(`Token received: ${token.substring(0, 20)}...`);
    
    try {
      const payload = await this.jwtService.verifyAsync(token, {
        secret: this.configService.get('JWT_SECRET'),
      });
      
      this.logger.debug(`✅ Token verified for user: ${payload.sub}`);
      
      // Check role-based access
      const requiredRoles = routeConfig.route.roles;
      if (requiredRoles && requiredRoles.length > 0) {
        if (!requiredRoles.includes(payload.role)) {
          this.logger.warn(`❌ Role mismatch: required ${requiredRoles}, got ${payload.role}`);
          throw new UnauthorizedException('Insufficient permissions');
        }
        this.logger.debug(`✅ Role check passed: ${payload.role}`);
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