import {
  Injectable,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RabbitMQService } from '@cab-booking/shared';
import { Driver } from '../entities/driver.entity';

@Injectable()
export class DriverEventHandler implements OnModuleInit {
  private readonly logger = new Logger(DriverEventHandler.name);

  constructor(
    @InjectRepository(Driver)
    private driverRepository: Repository<Driver>,
    private rabbitMQService: RabbitMQService,
  ) {}

  async onModuleInit() {
    await this.subscribeToEvents();
  }

  private async subscribeToEvents() {
    try {
      await this.rabbitMQService.subscribe(
        'driver-service.queue',
        async (msg: any) => {
          await this.handleEvent(msg);
        },
        {
          exchange: 'auth.events',
          routingKey: 'auth.user.registered',
        },
      );

      this.logger.log('📩 Driver subscribed to auth events');
    } catch (error) {
      this.logger.error(
        `Failed to subscribe: ${error.message}`,
      );
    }
  }

  private async handleEvent(event: any) {
    this.logger.log(
      `Processing event: ${JSON.stringify(event)}`,
    );

    // xử lý event tại đây nếu cần
  }
}