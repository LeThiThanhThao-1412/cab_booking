import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RabbitMQModule, RedisModule } from '@cab-booking/shared';
import { PricingController } from './controllers/pricing.controller';
import { InternalController } from './controllers/internal.controller';
import { PricingService } from './services/pricing.service';
import { SurgePricingService } from './surge/surge-pricing.service';
import { BasePrice } from './entities/base-price.entity';
import { Coupon } from './entities/coupon.entity';
import { CouponUsage } from './entities/coupon-usage.entity';
import { SurgeConfig } from './entities/surge-config.entity';
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
    
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('POSTGRES_HOST', 'localhost'),
        port: configService.get('POSTGRES_PORT', 5432),
        username: configService.get('POSTGRES_USER', 'admin'),
        password: configService.get('POSTGRES_PASSWORD', 'password123'),
        database: configService.get('POSTGRES_DB', 'pricing_db'),
        entities: [BasePrice, Coupon, CouponUsage, SurgeConfig],
        synchronize: configService.get('NODE_ENV') !== 'production',
        logging: configService.get('NODE_ENV') === 'development',
      }),
      inject: [ConfigService],
    }),
    
    TypeOrmModule.forFeature([BasePrice, Coupon, CouponUsage, SurgeConfig]),
    
    RabbitMQModule.forRoot({
      urls: [process.env.RABBITMQ_URL || 'amqp://admin:password123@localhost:5672'],
    }),
    
    RedisModule.forRoot(),
  ],
  controllers: [PricingController, InternalController],
  providers: [PricingService, SurgePricingService, JwtAuthGuard],
})
export class AppModule {}