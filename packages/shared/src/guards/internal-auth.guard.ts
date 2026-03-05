import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';

@Injectable()
export class InternalAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const serviceId = request.headers['x-service-id'];
    
    if (!serviceId) {
      throw new UnauthorizedException('Missing service identification');
    }
    
    return true;
  }
}
