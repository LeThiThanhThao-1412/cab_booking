import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { MongooseModule } from '@nestjs/mongoose';
import { HttpModule } from '@nestjs/axios';
import { RabbitMQModule } from '@cab-booking/shared';
import { ReviewController } from './controllers/review.controller';
import { AdminController } from './controllers/admin.controller';
import { InternalController } from './controllers/internal.controller';
import { ReviewService } from './services/review.service';
import { Review, ReviewSchema } from './schemas/review.schema';
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
        dbName: configService.get('MONGODB_DB_NAME', 'reviews'),
      }),
      inject: [ConfigService],
    }),
    
    MongooseModule.forFeature([{ name: Review.name, schema: ReviewSchema }]),
    
    HttpModule.registerAsync({
      imports: [ConfigModule],
      useFactory: () => ({
        timeout: 5000,
        maxRedirects: 5,
      }),
      inject: [ConfigService],
    }),
    
    RabbitMQModule.forRoot({
      urls: [process.env.RABBITMQ_URL || 'amqp://admin:password123@localhost:5672'],
    }),
  ],
  controllers: [ReviewController, AdminController, InternalController],
  providers: [ReviewService, JwtAuthGuard],
})
export class AppModule {}