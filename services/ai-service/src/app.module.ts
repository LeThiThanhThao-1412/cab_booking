import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { ScheduleModule } from '@nestjs/schedule';
import { HttpModule } from '@nestjs/axios';
import { RabbitMQModule, RedisModule } from '@cab-booking/shared';
import { AIController } from './controllers/ai.controller';
import { ETAService } from './services/eta.service';
import { SurgeService } from './services/surge.service';
import { MatchingService } from './services/matching.service';
import { FraudService } from './services/fraud.service';
import { MCPService } from './services/mcp.service';
import { RetrainService } from './services/retrain.service';
import { RetrainJob } from './jobs/retrain.job';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
    ScheduleModule.forRoot(),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get('JWT_SECRET'),
        signOptions: { expiresIn: '1h' },
      }),
      inject: [ConfigService],
    }),
    HttpModule,
    RabbitMQModule.forRoot({
      urls: [process.env.RABBITMQ_URL || 'amqp://admin:password123@localhost:5672'],
    }),
    RedisModule.forRoot(),
  ],
  controllers: [AIController],
  providers: [
    ETAService,
    SurgeService,
    MatchingService,
    FraudService,
    MCPService,
    RetrainService,
    RetrainJob,
  ],
})
export class AppModule {}