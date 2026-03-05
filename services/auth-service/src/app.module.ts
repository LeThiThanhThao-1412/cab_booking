import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { 
  PostgresModule, 
  RabbitMQModule,
} from '@cab-booking/shared';
import { AuthController } from './controllers/auth.controller';
import { InternalController } from './controllers/internal.controller';
import { AuthService } from './services/auth.service';
import { User } from './entities/user.entity';


@Module({
  imports: [
    // Config
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    // Database from shared - kết nối auth_db
    PostgresModule.forRoot(),

    // TypeORM Feature - register User entity
    TypeOrmModule.forFeature([User]),

    // JWT
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get('JWT_SECRET', 'super-secret-key'),
        signOptions: { 
          expiresIn: configService.get('JWT_EXPIRES_IN', '1h'),
        },
      }),
      inject: [ConfigService],
    }),

    // RabbitMQ from shared
    RabbitMQModule.forRoot({
      urls: [process.env.RABBITMQ_URL || 'amqp://admin:password123@localhost:5672'],
    }),
  ],
  controllers: [AuthController, InternalController],
  providers: [AuthService],
})
export class AppModule {}