import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RabbitMQService } from '@cab-booking/shared';
import { Payment } from '../entities/payment.entity';
import { SagaLog } from '../entities/saga-log.entity';
import { PaymentStatus, SagaStepStatus } from '../enums/payment.enum';

@Injectable()
export class PaymentSaga {
  private readonly logger = new Logger(PaymentSaga.name);

  constructor(
    @InjectRepository(Payment)
    private paymentRepository: Repository<Payment>,
    @InjectRepository(SagaLog)
    private sagaLogRepository: Repository<SagaLog>,
    private rabbitMQService: RabbitMQService,
  ) {}

  async compensate(sagaId: string, transactionId: string, errorMessage: string): Promise<void> {
    this.logger.log(`Starting compensation for saga ${sagaId}, error: ${errorMessage}`);

    // Get all executed steps
    const steps = await this.sagaLogRepository.find({
      where: { sagaId, status: SagaStepStatus.COMPLETED },
      order: { executedAt: 'DESC' }, // Reverse order for compensation
    });

    for (const step of steps) {
      try {
        await this.compensateStep(step);
        step.status = SagaStepStatus.COMPENSATED;
        await this.sagaLogRepository.save(step);
        this.logger.log(`✅ Compensated step: ${step.stepName}`);
      } catch (error) {
        this.logger.error(`❌ Failed to compensate step ${step.stepName}: ${error.message}`);
        // Continue to compensate other steps
      }
    }

    // Update payment status to FAILED
    const payment = await this.paymentRepository.findOne({ where: { transactionId } });
    if (payment) {
      payment.status = PaymentStatus.FAILED;
      await this.paymentRepository.save(payment);
    }

    // Publish compensation completed event
    await this.rabbitMQService.publish(
      'payment.events',
      'payment.saga.compensated',
      {
        sagaId,
        transactionId,
        errorMessage,
        timestamp: new Date().toISOString(),
      },
    );
  }

  private async compensateStep(step: SagaLog): Promise<void> {
    switch (step.stepName) {
      case 'create_payment':
        // Xóa payment record
        await this.paymentRepository.delete({ transactionId: step.transactionId });
        break;
      case 'call_gateway':
        // Gọi gateway để hủy giao dịch
        await this.cancelGatewayTransaction(step.transactionId);
        break;
      case 'update_status':
        // Không cần compensation vì status đã được update
        break;
      default:
        this.logger.warn(`No compensation for step: ${step.stepName}`);
    }
  }

  private async cancelGatewayTransaction(transactionId: string): Promise<void> {
    // Mock: Gọi payment gateway để cancel transaction
    this.logger.log(`Cancelling gateway transaction: ${transactionId}`);
    await new Promise(resolve => setTimeout(resolve, 500));
    // return success
  }
}