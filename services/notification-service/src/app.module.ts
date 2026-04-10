// app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { MongooseModule } from '@nestjs/mongoose';
import { RabbitMQModule, RedisModule } from '@cab-booking/shared';
import { NotificationController } from './controllers/notification.controller';
import { InternalController } from './controllers/internal.controller';
import { HealthController } from './health/health.controller';  // THÊM
import { NotificationService } from './services/notification.service';
import { EmailService } from './services/email.service';
import { SmsService } from './services/sms.service';
import { PushService } from './services/push.service';
import { NotificationGateway } from './gateways/notification.gateway';
import { Notification, NotificationSchema } from './schemas/notification.schema';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
    
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get('JWT_SECRET'),
        signOptions: { expiresIn: '1h' },
      }),
      inject: [ConfigService],
    }),
    
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        uri: configService.get('MONGODB_URI', 'mongodb://admin:password123@localhost:27017'),
        dbName: configService.get('MONGODB_DB_NAME', 'notifications'),
      }),
      inject: [ConfigService],
    }),
    
    MongooseModule.forFeature([{ name: Notification.name, schema: NotificationSchema }]),
    
    RabbitMQModule.forRoot({
      urls: [process.env.RABBITMQ_URL || 'amqp://admin:password123@localhost:5672'],
    }),
    
    RedisModule.forRoot(),
  ],
  controllers: [
    HealthController,      // THÊM - ĐẶT TRƯỚC
    InternalController,    // Có GET /internal/health
    NotificationController,
  ],
  providers: [
    NotificationService,
    EmailService,
    SmsService,
    PushService,
    NotificationGateway,
    JwtAuthGuard,
  ],
})
export class AppModule {}