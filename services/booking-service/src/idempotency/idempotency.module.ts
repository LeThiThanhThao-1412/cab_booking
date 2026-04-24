import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { IdempotencyRecord, IdempotencyRecordSchema } from './schemas/idempotency.schema';
import { IdempotencyService } from './idempotency.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: IdempotencyRecord.name, schema: IdempotencyRecordSchema }
    ])
  ],
  providers: [IdempotencyService],
  exports: [IdempotencyService]
})
export class IdempotencyModule {}