import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { HttpModule } from '@nestjs/axios';
import { RabbitMQModule, RedisModule } from '@cab-booking/shared';
import { AIController } from './controllers/ai.controller';
import { ETAService } from './services/eta.service';
import { SurgeService } from './services/surge.service';
import { MatchingService } from './services/matching.service';
import { FraudService } from './services/fraud.service';
import { MCPService } from './services/mcp.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
    HttpModule.registerAsync({
      imports: [ConfigModule],
      useFactory: () => ({
        timeout: 5000,
        maxRedirects: 5,
      }),
    }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get('JWT_SECRET'),
        signOptions: { expiresIn: '1h' },
      }),
      inject: [ConfigService],
    }),
    RabbitMQModule.forRoot({
      urls: [process.env.RABBITMQ_URL || 'amqp://admin:password123@localhost:5672'],
    }),
    RedisModule.forRoot(),
  ],
  controllers: [AIController],
  providers: [ETAService, SurgeService, MatchingService, FraudService, MCPService],
})
export class AppModule {}
