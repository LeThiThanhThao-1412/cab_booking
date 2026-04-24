import {
  Injectable,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RabbitMQService } from '@cab-booking/shared';
import { Driver, DriverAccountStatus, DriverOnlineStatus } from '../entities/driver.entity';

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

  async subscribeToEvents() {
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
      this.logger.log('📩 Driver subscribed to auth.user.registered events');
    } catch (error) {
      this.logger.error(`Failed to subscribe: ${error.message}`);
    }
  }
  
  private async handleEvent(event: any) {
    this.logger.log(`Processing event: ${JSON.stringify(event)}`);

    const eventData = event.data || event;
    const { userId, email, fullName, phone, role, status } = eventData;

    // ✅ Chỉ xử lý nếu role là driver
    if (role !== 'driver') {
      this.logger.log(`Skipping non-driver user: ${role}`);
      return;
    }

    const existingDriver = await this.driverRepository.findOne({
      where: { userId },
    });

    if (existingDriver) {
      this.logger.warn(`Driver already exists for userId: ${userId}`);
      return;
    }

    // ✅ Tạo driver với accountStatus = PENDING (chờ duyệt), onlineStatus = OFFLINE
    const driver = this.driverRepository.create({
      userId,
      email,
      fullName,
      phone,
      accountStatus: DriverAccountStatus.PENDING,
      onlineStatus: DriverOnlineStatus.OFFLINE,
    });

    await this.driverRepository.save(driver);
    this.logger.log(`✅ Driver created with PENDING status for userId: ${userId}`);
  }
}