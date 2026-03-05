import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { 
  PostgresModule, 
  RabbitMQModule,
} from '@cab-booking/shared';
import { UserController } from './controllers/user.controller';
import { UserProfile } from './entities/user-profile.entity';
import { UserEventHandler } from './handlers/user-event.handler';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    // JWT Module
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get('JWT_SECRET', 'super-secret-key'),
        signOptions: { expiresIn: '1h' },
      }),
      inject: [ConfigService],
    }),

    PostgresModule.forRoot(),

    TypeOrmModule.forFeature([UserProfile]),

    RabbitMQModule.forRoot({
      urls: [process.env.RABBITMQ_URL || 'amqp://admin:password123@localhost:5672'],
    }),
  ],
  controllers: [UserController],
  providers: [
    UserEventHandler,
    JwtAuthGuard,  // Thêm guard vào providers
  ],
})
export class AppModule {}