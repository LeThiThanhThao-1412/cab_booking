import {
  Injectable,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RabbitMQService } from '@cab-booking/shared';
import { UserProfile } from '../entities/user-profile.entity';

@Injectable()
export class UserEventHandler implements OnModuleInit {
  private readonly logger = new Logger(UserEventHandler.name);

  constructor(
    @InjectRepository(UserProfile)
    private userProfileRepository: Repository<UserProfile>,
    private rabbitMQService: RabbitMQService,
  ) {}

  /**
   * Được gọi sau khi toàn bộ module đã khởi tạo xong
   * Lúc này RabbitMQService đã sẵn sàng
   */
  async onModuleInit() {
    await this.subscribeToEvents();
  }

  private async subscribeToEvents() {
    try {
      await this.rabbitMQService.subscribe(
        'user-service.queue',
        async (msg: any) => {
          await this.handleUserRegistered(msg);
        },
        {
          exchange: 'auth.events',
          routingKey: 'auth.user.registered',
        },
      );

      this.logger.log('📩 Subscribed to auth.user.registered events');
    } catch (error) {
      this.logger.error(
        `Failed to subscribe to events: ${error.message}`,
      );
    }
  }

  private async handleUserRegistered(event: any) {
    this.logger.log(
      `Processing user.registered event: ${JSON.stringify(event)}`,
    );

    try {
      const { userId, email, fullName, role } =
        event.data || event;

      // Chỉ tạo profile cho customer
      if (role === 'customer') {
        const existing = await this.userProfileRepository.findOne({
          where: { userId },
        });

        if (!existing) {
          const profile =
            this.userProfileRepository.create({
              userId,
              fullName,
              preferences: {
                language: 'vi',
                notificationEnabled: true,
                darkMode: false,
              },
              lastActiveAt: new Date(),
            });

          await this.userProfileRepository.save(profile);

          this.logger.log(
            `✅ Created profile for customer: ${userId}`,
          );
        }
      }
    } catch (error) {
      this.logger.error(
        `Error handling user.registered event: ${error.message}`,
      );
    }
  }
}