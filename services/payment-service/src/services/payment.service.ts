import { Injectable, Logger, NotFoundException, BadRequestException, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RabbitMQService, RedisService } from '@cab-booking/shared';
import { ConfigService } from '@nestjs/config';
import { Payment } from '../entities/payment.entity';
import { SagaLog } from '../entities/saga-log.entity';
import { CreatePaymentDto, PaymentResponseDto } from '../dto/payment.dto';
import { PaymentStatus, PaymentMethod, SagaStepStatus } from '../enums/payment.enum';
import { PaymentSaga } from '../sagas/payment.saga';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class PaymentService implements OnModuleInit {
  private readonly logger = new Logger(PaymentService.name);
  private isSubscribed = false;

  constructor(
    @InjectRepository(Payment)
    private paymentRepository: Repository<Payment>,
    @InjectRepository(SagaLog)
    private sagaLogRepository: Repository<SagaLog>,
    private rabbitMQService: RabbitMQService,
    private redisService: RedisService,
    private configService: ConfigService,
    private paymentSaga: PaymentSaga,
  ) {}

  async onModuleInit() {
    // Đợi RabbitMQ kết nối
    await new Promise(resolve => setTimeout(resolve, 3000));
    await this.subscribeWithRetry();
  }

  async subscribeWithRetry(retryCount = 0) {
    const maxRetries = 10;
    const retryDelay = 5000;

    if (this.isSubscribed) {
      this.logger.log('Already subscribed to events');
      return;
    }

    try {
      await this.subscribeToEvents();
      this.isSubscribed = true;
      this.logger.log('✅ Successfully subscribed to payment events');
    } catch (error) {
      if (retryCount < maxRetries) {
        this.logger.warn(`Failed to subscribe (attempt ${retryCount + 1}/${maxRetries}): ${error.message}`);
        setTimeout(() => this.subscribeWithRetry(retryCount + 1), retryDelay);
      } else {
        this.logger.error(`Failed to subscribe after ${maxRetries} attempts`);
      }
    }
  }

  async subscribeToEvents() {
    try {
      const channel = this.rabbitMQService['channel'];
      if (!channel) {
        throw new Error('RabbitMQ channel is not available');
      }

      this.logger.log('Subscribing to payment.requested events...');

      await this.rabbitMQService.subscribe(
        'payment-service.queue',
        async (msg: any) => {
          this.logger.debug(`Received message: ${JSON.stringify(msg)}`);
          await this.handlePaymentRequest(msg);
        },
        {
          exchange: 'payment.events',
          routingKey: 'payment.requested',
        },
      );

      this.logger.log('✅ Subscribed to payment.requested events');
    } catch (error) {
      this.logger.error(`Failed to subscribe: ${error.message}`);
      throw error;
    }
  }

  async handlePaymentRequest(event: any) {
    this.logger.log(`Processing payment.requested: ${JSON.stringify(event)}`);

    try {
      const { rideId, bookingId, customerId, driverId, amount, currency } = event.data || event;

      const createPaymentDto: CreatePaymentDto = {
        rideId,
        bookingId,
        customerId,
        driverId,
        amount,
        discountAmount: 0,
        finalAmount: amount,
        method: PaymentMethod.CARD,
      };

      await this.processPayment(createPaymentDto);
    } catch (error) {
      this.logger.error(`Error handling payment.requested: ${error.message}`);
    }
  }

  async processPayment(createDto: CreatePaymentDto): Promise<PaymentResponseDto> {
    const transactionId = `TXN_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;
    const sagaId = uuidv4();

    this.logger.log(`Starting payment saga ${sagaId} for ride ${createDto.rideId}`);

    try {
      // Step 1: Create payment record
      const payment = this.paymentRepository.create({
        transactionId,
        rideId: createDto.rideId,
        bookingId: createDto.bookingId,
        customerId: createDto.customerId,
        driverId: createDto.driverId,
        amount: createDto.amount,
        discountAmount: createDto.discountAmount,
        finalAmount: createDto.finalAmount,
        method: createDto.method,
        status: PaymentStatus.PENDING,
        couponCode: createDto.couponCode,
        metadata: createDto.metadata || {},
      });

      await this.paymentRepository.save(payment);
      await this.logSagaStep(sagaId, transactionId, 'create_payment', SagaStepStatus.COMPLETED, { paymentId: payment.id });

      // Step 2: Call payment gateway (mock)
      const gatewayResult = await this.callPaymentGateway(payment);
      await this.logSagaStep(sagaId, transactionId, 'call_gateway', SagaStepStatus.COMPLETED, gatewayResult);

      if (!gatewayResult.success) {
        throw new Error(gatewayResult.message);
      }

      // Step 3: Update payment status
      payment.status = PaymentStatus.COMPLETED;
      payment.paidAt = new Date();
      payment.metadata = {
        ...payment.metadata,
        gatewayTransactionId: gatewayResult.transactionId,
        gatewayResponse: gatewayResult,
      };
      await this.paymentRepository.save(payment);

      await this.logSagaStep(sagaId, transactionId, 'update_status', SagaStepStatus.COMPLETED, { status: PaymentStatus.COMPLETED });

      // Step 4: Publish payment.completed event
      await this.rabbitMQService.publish(
        'payment.events',
        'payment.completed',
        {
          paymentId: payment.id,
          transactionId,
          rideId: payment.rideId,
          bookingId: payment.bookingId,
          customerId: payment.customerId,
          driverId: payment.driverId,
          amount: payment.finalAmount,
          timestamp: new Date().toISOString(),
        },
      );

      this.logger.log(`✅ Payment ${transactionId} completed successfully`);

      return this.mapToResponse(payment);

    } catch (error) {
      this.logger.error(`Payment failed: ${error.message}`);

      await this.paymentSaga.compensate(sagaId, transactionId, error.message);

      await this.rabbitMQService.publish(
        'payment.events',
        'payment.failed',
        {
          transactionId,
          rideId: createDto.rideId,
          customerId: createDto.customerId,
          error: error.message,
          timestamp: new Date().toISOString(),
        },
      );

      throw new BadRequestException(`Payment failed: ${error.message}`);
    }
  }

  async applyCoupon(couponCode: string, amount: number): Promise<any> {
    this.logger.log(`Applying coupon ${couponCode} for amount ${amount}`);

    const coupons: Record<string, any> = {
      'WELCOME10': { type: 'percentage', value: 10, maxDiscount: 50000, minOrderValue: 50000 },
      'SAVE20K': { type: 'fixed', value: 20000, minOrderValue: 100000 },
      'FREESHIP': { type: 'percentage', value: 100, maxDiscount: 30000, minOrderValue: 50000 },
    };

    const coupon = coupons[couponCode.toUpperCase()];
    if (!coupon) {
      throw new BadRequestException('Invalid coupon code');
    }

    if (amount < coupon.minOrderValue) {
      throw new BadRequestException(`Minimum order value is ${coupon.minOrderValue} VND`);
    }

    let discount = 0;
    if (coupon.type === 'percentage') {
      discount = (amount * coupon.value) / 100;
      if (coupon.maxDiscount && discount > coupon.maxDiscount) {
        discount = coupon.maxDiscount;
      }
    } else {
      discount = coupon.value;
    }

    return {
      couponCode: couponCode.toUpperCase(),
      type: coupon.type,
      value: coupon.value,
      discount,
      finalAmount: amount - discount,
      minOrderValue: coupon.minOrderValue,
      maxDiscount: coupon.maxDiscount,
    };
  }

  async refundPayment(paymentId: string, reason: string): Promise<PaymentResponseDto> {
    this.logger.log(`Refunding payment ${paymentId}, reason: ${reason}`);

    const payment = await this.paymentRepository.findOne({ where: { id: paymentId } });
    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    if (payment.status !== PaymentStatus.COMPLETED) {
      throw new BadRequestException('Only completed payments can be refunded');
    }

    const refundResult = await this.refundPaymentGateway(payment);

    payment.status = PaymentStatus.REFUNDED;
    payment.refundedAt = new Date();
    payment.metadata = {
      ...payment.metadata,
      refundReason: reason,
      refundTransactionId: refundResult.transactionId,
    };
    await this.paymentRepository.save(payment);

    await this.rabbitMQService.publish(
      'payment.events',
      'payment.refunded',
      {
        paymentId: payment.id,
        transactionId: payment.transactionId,
        rideId: payment.rideId,
        customerId: payment.customerId,
        amount: payment.finalAmount,
        reason,
        timestamp: new Date().toISOString(),
      },
    );

    return this.mapToResponse(payment);
  }

  async getPaymentByRideId(rideId: string): Promise<PaymentResponseDto> {
    const payment = await this.paymentRepository.findOne({ where: { rideId } });
    if (!payment) {
      throw new NotFoundException('Payment not found for this ride');
    }
    return this.mapToResponse(payment);
  }

  async getPaymentByTransactionId(transactionId: string): Promise<PaymentResponseDto> {
    const payment = await this.paymentRepository.findOne({ where: { transactionId } });
    if (!payment) {
      throw new NotFoundException('Payment not found');
    }
    return this.mapToResponse(payment);
  }

  private async callPaymentGateway(payment: Payment): Promise<any> {
    this.logger.log(`Calling payment gateway for ${payment.transactionId}`);
    await new Promise(resolve => setTimeout(resolve, 1000));

    const isSuccess = Math.random() < 0.95;

    if (isSuccess) {
      return {
        success: true,
        transactionId: `GATEWAY_${Date.now()}`,
        message: 'Payment processed successfully',
      };
    } else {
      return {
        success: false,
        message: 'Payment gateway error: Insufficient funds',
      };
    }
  }

  private async refundPaymentGateway(payment: Payment): Promise<any> {
    this.logger.log(`Calling refund gateway for ${payment.transactionId}`);
    await new Promise(resolve => setTimeout(resolve, 500));
    return { success: true, transactionId: `REFUND_${Date.now()}` };
  }

  private async logSagaStep(
    sagaId: string,
    transactionId: string,
    stepName: string,
    status: SagaStepStatus,
    data?: any,
  ) {
    const log = this.sagaLogRepository.create({
      sagaId,
      transactionId,
      stepName,
      status,
      payload: data,
    });
    await this.sagaLogRepository.save(log);
  }

  private mapToResponse(payment: Payment): PaymentResponseDto {
    return {
      id: payment.id,
      transactionId: payment.transactionId,
      rideId: payment.rideId,
      bookingId: payment.bookingId,
      customerId: payment.customerId,
      driverId: payment.driverId,
      amount: payment.amount,
      discountAmount: payment.discountAmount,
      finalAmount: payment.finalAmount,
      method: payment.method,
      status: payment.status,
      couponCode: payment.couponCode,
      paidAt: payment.paidAt,
      createdAt: payment.createdAt,
    };
  }
}