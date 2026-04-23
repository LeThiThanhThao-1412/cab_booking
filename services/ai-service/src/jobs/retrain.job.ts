import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { RetrainService } from '../services/retrain.service';

@Injectable()
export class RetrainJob {
  private readonly logger = new Logger(RetrainJob.name);

  constructor(private retrainService: RetrainService) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async dailyRetrain() {
    this.logger.log('🚀 Running daily model retrain...');
    const result = await this.retrainService.retrainAllModels();
    this.logger.log(`✅ Daily retrain completed: ${JSON.stringify(result)}`);
  }

  @Cron('0 */6 * * *')  // Chạy mỗi 6 tiếng
  async periodicRetrain() {
    this.logger.log('🔄 Running periodic retrain...');
    await this.retrainService.retrainAllModels();
  }
}