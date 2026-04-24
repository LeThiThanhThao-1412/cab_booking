import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { IdempotencyRecord } from './schemas/idempotency.schema';

@Injectable()
export class IdempotencyService {
  private readonly logger = new Logger(IdempotencyService.name);

  constructor(
    @InjectModel(IdempotencyRecord.name)
    private idempotencyModel: Model<IdempotencyRecord>
  ) {}

  async getExistingBookingId(customerId: string, key: string): Promise<string | null> {
    const record = await this.idempotencyModel.findOne({ customerId, key });
    return record?.bookingId || null;
  }

  async saveIdempotencyRecord(customerId: string, key: string, bookingId: string): Promise<void> {
    try {
      await this.idempotencyModel.create({
        customerId,
        key,
        bookingId
      });
      this.logger.log(`Saved idempotency record for key: ${key.substring(0, 16)}...`);
    } catch (error) {
      // Nếu duplicate key thì bỏ qua (đã có record rồi)
      if (error.code !== 11000) {
        this.logger.error(`Error saving idempotency record: ${error.message}`);
        throw error;
      }
      this.logger.log(`Idempotency key already exists: ${key.substring(0, 16)}...`);
    }
  }
}