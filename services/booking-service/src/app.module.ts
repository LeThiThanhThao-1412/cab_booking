import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { MongooseModule } from '@nestjs/mongoose';
import { HttpModule } from '@nestjs/axios';
import { 
  RabbitMQModule,
  RedisModule,
} from '@cab-booking/shared';
import { BookingController } from './controllers/booking.controller';
import { InternalController } from './controllers/internal.controller';
import { BookingService } from './services/booking.service';
import { Booking, BookingSchema } from './schemas/booking.schema';
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
        secret: configService.get('JWT_SECRET', 'super-secret-key'),
        signOptions: { expiresIn: '1h' },
      }),
      inject: [ConfigService],
    }),

    // MongoDB connection
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        uri: configService.get('MONGODB_URI', 'mongodb://admin:password123@localhost:27017'),
        dbName: configService.get('MONGODB_DB_NAME', 'booking'),
      }),
      inject: [ConfigService],
    }),

    MongooseModule.forFeature([{ name: Booking.name, schema: BookingSchema }]),

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
  controllers: [BookingController, InternalController],
  providers: [
    BookingService,
    JwtAuthGuard,
  ],
})
export class AppModule {}