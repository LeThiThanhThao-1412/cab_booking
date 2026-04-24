import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { HttpModule } from '@nestjs/axios';
import {
  RabbitMQModule,
  RedisModule,
} from '@cab-booking/shared';
import { MatchingController } from './controllers/matching.controller';
import { InternalController } from './controllers/internal.controller';
import { MatchingService } from './services/matching.service';
import { AIClientService } from './services/ai-client.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

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
      useFactory: (configService: ConfigService) => ({
        timeout: 5000,
        maxRedirects: 5,
      }),
      inject: [ConfigService],
    }),

    RabbitMQModule.forRoot({
      urls: [process.env.RABBITMQ_URL || 'amqp://admin:password123@localhost:5672'],
    }),

    RedisModule.forRoot(),
  ],
  controllers: [MatchingController, InternalController],
  providers: [
    MatchingService,
    AIClientService,
    JwtAuthGuard,
  ],
})
export class AppModule {}