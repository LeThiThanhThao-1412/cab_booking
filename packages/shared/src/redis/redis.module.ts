import { Module, Global, DynamicModule } from '@nestjs/common';
import { RedisService } from './redis.service';

@Global()
@Module({})
export class RedisModule {
  static forRoot(): DynamicModule {
    return {
      module: RedisModule,
      providers: [
        {
          provide: RedisService,
          useFactory: () => {
            return new RedisService({
              host: process.env.REDIS_HOST || 'localhost',
              port: parseInt(process.env.REDIS_PORT || '6379'),
              password: process.env.REDIS_PASSWORD || 'password123',
            });
          },
        },
      ],
      exports: [RedisService],
    };
  }

  static forFeature(): DynamicModule {
    return {
      module: RedisModule,
      providers: [RedisService],
      exports: [RedisService],
    };
  }
}