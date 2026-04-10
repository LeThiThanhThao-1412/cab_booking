import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { HttpModule } from '@nestjs/axios';
import { ServiceRegistry } from './services/service-registry.service';
import { ProxyService } from './services/proxy.service';
import { GatewayController } from './controllers/gateway.controller';
import { HealthController } from './controllers/health.controller';
import { InfoController } from './controllers/info.controller';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RateLimiterMiddleware } from './middleware/rate-limiter.middleware';
// Import cách khác
const helmet = require('helmet');
const compression = require('compression');
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get('JWT_SECRET'),
        signOptions: { expiresIn: '1h' },
      }),
      inject: [ConfigService],
    }),
    
    HttpModule.registerAsync({
      imports: [ConfigModule],
      useFactory: () => ({
        timeout: 30000,
        maxRedirects: 5,
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [GatewayController, HealthController, InfoController],
  providers: [ServiceRegistry, ProxyService, JwtAuthGuard],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(helmet(), compression(), RateLimiterMiddleware)
      .forRoutes('*');
  }
}