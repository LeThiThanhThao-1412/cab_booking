import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class RateLimiterMiddleware implements NestMiddleware {
  private readonly logger = new Logger(RateLimiterMiddleware.name);
  private readonly requests: Map<string, { count: number; resetTime: number }> = new Map();

  constructor(private configService: ConfigService) {}

  use(req: Request, res: Response, next: NextFunction) {
    // Skip rate limiting for health and info endpoints
    if (req.path === '/api/v1/health' || req.path === '/api/v1/info' || req.path === '/api/v1/ping') {
      return next();
    }
    
    const identifier = this.getIdentifier(req);
    const limit = this.getLimitForPath(req.path);
    const windowMs = this.configService.get('RATE_LIMIT_WINDOW_MS', 60000);
    
    const now = Date.now();
    const record = this.requests.get(identifier);
    
    if (!record || now > record.resetTime) {
      this.requests.set(identifier, {
        count: 1,
        resetTime: now + windowMs,
      });
      return next();
    }
    
    if (record.count >= limit) {
      this.logger.warn(`Rate limit exceeded for ${identifier}`);
      res.status(429).json({
        statusCode: 429,
        message: 'Too many requests, please try again later.',
        retryAfter: Math.ceil((record.resetTime - now) / 1000),
      });
      return;
    }
    
    record.count++;
    this.requests.set(identifier, record);
    next();
  }

  private getIdentifier(req: Request): string {
    // Use user ID if authenticated, otherwise IP
    const userId = (req as any).user?.sub;
    if (userId) return `user:${userId}`;
    return `ip:${req.ip}`;
  }

  private getLimitForPath(path: string): number {
    if (path.includes('/auth/login') || path.includes('/auth/register')) {
      return this.configService.get('RATE_LIMIT_AUTH', 5);
    }
    if (path.includes('/bookings')) {
      return this.configService.get('RATE_LIMIT_BOOKING', 10);
    }
    if (path.includes('/drivers/location')) {
      return this.configService.get('RATE_LIMIT_LOCATION', 60);
    }
    return this.configService.get('RATE_LIMIT_DEFAULT', 30);
  }
}