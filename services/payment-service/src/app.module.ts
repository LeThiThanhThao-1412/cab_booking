import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RabbitMQModule, RedisModule } from '@cab-booking/shared';
import { PaymentController } from './controllers/payment.controller';
import { InternalController } from './controllers/internal.controller';
import { PaymentService } from './services/payment.service';
import { PaymentSaga } from './sagas/payment.saga';
import { Payment } from './entities/payment.entity';
import { SagaLog } from './entities/saga-log.entity';
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
        database: configService.get('POSTGRES_DB', 'payment_db'),
        entities: [Payment, SagaLog],
        synchronize: configService.get('NODE_ENV') !== 'production',
        logging: configService.get('NODE_ENV') === 'development',
      }),
      inject: [ConfigService],
    }),
    
    TypeOrmModule.forFeature([Payment, SagaLog]),
    
    RabbitMQModule.forRoot({
      urls: [process.env.RABBITMQ_URL || 'amqp://admin:password123@localhost:5672'],
    }),
    
    RedisModule.forRoot(),
  ],
  controllers: [PaymentController, InternalController],
  providers: [PaymentService, PaymentSaga, JwtAuthGuard],
})
export class AppModule {}