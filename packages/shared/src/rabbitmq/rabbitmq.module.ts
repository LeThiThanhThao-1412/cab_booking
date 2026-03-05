import { Module, Global, DynamicModule } from '@nestjs/common';
import { RabbitMQService } from './rabbitmq.service';

@Global()
@Module({})
export class RabbitMQModule {
  static forRoot(config?: any): DynamicModule {
    return {
      module: RabbitMQModule,
      providers: [
        {
          provide: RabbitMQService,
          useFactory: () => new RabbitMQService(config),
        },
      ],
      exports: [RabbitMQService],
    };
  }

  static forFeature(): DynamicModule {
    return {
      module: RabbitMQModule,
      providers: [RabbitMQService],
      exports: [RabbitMQService],
    };
  }
}