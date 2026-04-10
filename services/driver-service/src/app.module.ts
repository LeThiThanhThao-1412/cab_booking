// app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';

import {
  PostgresModule,
  RabbitMQModule,
  RedisModule,
} from '@cab-booking/shared';

import { DriverController } from './controllers/driver.controller';
import { InternalController } from './controllers/internal.controller';
import { HealthController } from './health/health.controller';  // THÊM VÀO
import { DriverService } from './services/driver.service';
import { DriverEventHandler } from './handlers/driver-event.handler';
import { Driver } from './entities/driver.entity';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: '1h',
        },
      }),
    }),

    PostgresModule.forRoot(),
    TypeOrmModule.forFeature([Driver]),

    RabbitMQModule.forRoot({
      urls: [
        process.env.RABBITMQ_URL ||
          'amqp://admin:password123@localhost:5672',
      ],
    }),

    RedisModule.forRoot(),
  ],

  controllers: [
    HealthController,      // THÊM VÀO - ĐẶT TRƯỚC
    InternalController,    // Có endpoint /internal/health
    DriverController,
  ],

  providers: [
    DriverService,
    DriverEventHandler,
    JwtAuthGuard,
  ],
})
export class AppModule {}