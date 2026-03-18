import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { MongooseModule } from '@nestjs/mongoose';
import {
  RabbitMQModule,
  RedisModule,
} from '@cab-booking/shared';
import { RideController } from './controllers/ride.controller';
import { InternalController } from './controllers/internal.controller';
import { RideService } from './services/ride.service';
import { RideGateway } from './gateways/ride.gateway';
import { Ride, RideSchema } from './schemas/ride.schema';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Ride.name, schema: RideSchema }]),
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

    // MongoDB
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        uri: configService.get('MONGODB_URI', 'mongodb://admin:password123@localhost:27017'),
        dbName: configService.get('MONGODB_DB_NAME', 'rides'),
      }),
      inject: [ConfigService],
    }),

    MongooseModule.forFeature([{ name: Ride.name, schema: RideSchema }]),

    // RabbitMQ
    RabbitMQModule.forRoot({
      urls: [process.env.RABBITMQ_URL || 'amqp://admin:password123@localhost:5672'],
    }),

    // Redis
    RedisModule.forRoot(),
  ],
  controllers: [RideController, InternalController],
  providers: [
    RideService,
    RideGateway,
    JwtAuthGuard,
  ],
})
export class AppModule {}