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

  // ============ HANDLE PAYMENT REQUEST FROM RIDE SERVICE ============
  async handlePaymentRequest(event: any) {
    this.logger.log(`📨 Processing payment.requested: ${JSON.stringify(event)}`);

    try {
      const eventData = event.data || event;
      const { rideId, bookingId, customerId, driverId, amount, currency, priceDetails } = eventData;

      // Tìm payment record đã tạo từ trước (PENDING)
      const existingPayment = await this.paymentRepository.findOne({
        where: { rideId, status: PaymentStatus.PENDING },
      });

      if (existingPayment) {
        // Nếu đã có payment PENDING → xử lý luôn
        this.logger.log(`Found existing PENDING payment: ${existingPayment.id}, processing now...`);
        
        const sagaId = uuidv4();

        try {
          // Step 1: Call payment gateway (mock)
          const gatewayResult = await this.callPaymentGateway(existingPayment);
          await this.logSagaStep(sagaId, existingPayment.transactionId, 'call_gateway', SagaStepStatus.COMPLETED, gatewayResult);

          if (!gatewayResult.success) {
            throw new Error(gatewayResult.message);
          }

          // Step 2: Update payment status
          existingPayment.status = PaymentStatus.COMPLETED;
          existingPayment.paidAt = new Date();
          existingPayment.metadata = {
            ...existingPayment.metadata,
            gatewayTransactionId: gatewayResult.transactionId,
            gatewayResponse: gatewayResult,
          };
          await this.paymentRepository.save(existingPayment);

          await this.logSagaStep(sagaId, existingPayment.transactionId, 'update_status', SagaStepStatus.COMPLETED, { status: PaymentStatus.COMPLETED });

          // Step 3: Publish payment.completed event
          await this.rabbitMQService.publish(
            'payment.events',
            'payment.completed',
            {
              paymentId: existingPayment.id,
              transactionId: existingPayment.transactionId,
              rideId: existingPayment.rideId,
              bookingId: existingPayment.bookingId,
              customerId: existingPayment.customerId,
              driverId: existingPayment.driverId,
              amount: existingPayment.finalAmount,
              timestamp: new Date().toISOString(),
            },
          );

          this.logger.log(`✅ Payment ${existingPayment.transactionId} completed successfully`);

        } catch (error) {
          this.logger.error(`Payment processing failed: ${error.message}`);
          await this.paymentSaga.compensate(sagaId, existingPayment.transactionId, error.message);

          await this.rabbitMQService.publish(
            'payment.events',
            'payment.failed',
            {
              transactionId: existingPayment.transactionId,
              rideId,
              customerId,
              driverId,
              amount,
              error: error.message,
              timestamp: new Date().toISOString(),
            },
          );
        }
      } else {
        // Nếu chưa có payment record → tạo mới và xử lý luôn
        this.logger.log(`No existing payment, creating and processing new payment for ride ${rideId}`);
        
        const createPaymentDto: CreatePaymentDto = {
          rideId,
          bookingId,
          customerId,
          driverId,
          amount,
          discountAmount: 0,
          finalAmount: amount,
          method: PaymentMethod.CARD,
          metadata: priceDetails || {},
        };

        await this.processPayment(createPaymentDto);
      }
    } catch (error) {
      this.logger.error(`Error handling payment.requested: ${error.message}`);
    }
  }

  // ============ CREATE PAYMENT RECORD ONLY (PENDING) - GỌI TỪ BOOKING SERVICE ============
  async createPaymentRecord(createDto: CreatePaymentDto): Promise<PaymentResponseDto> {
    const transactionId = `TXN_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;

    this.logger.log(`📝 Creating PENDING payment record for booking ${createDto.bookingId}`);
    this.logger.log(`   Amount: ${createDto.amount.toLocaleString()}đ, Method: ${createDto.method}`);

    // Kiểm tra xem đã có payment cho booking này chưa
    const existingPayment = await this.paymentRepository.findOne({
      where: { bookingId: createDto.bookingId },
    });

    if (existingPayment) {
      this.logger.warn(`⚠️ Payment already exists for booking ${createDto.bookingId}: ${existingPayment.id}`);
      return this.mapToResponse(existingPayment);
    }

    const payment = this.paymentRepository.create({
      transactionId,
      rideId: createDto.rideId,
      bookingId: createDto.bookingId,
      customerId: createDto.customerId,
      driverId: createDto.driverId || '',
      amount: createDto.amount,
      discountAmount: createDto.discountAmount || 0,
      finalAmount: createDto.finalAmount || createDto.amount,
      method: createDto.method || 'cash',
      status: PaymentStatus.PENDING,  // ← LUÔN LÀ PENDING
      couponCode: createDto.couponCode || undefined,
      metadata: createDto.metadata || {},
    });

    await this.paymentRepository.save(payment);

    this.logger.log(`✅ Payment record created: ${payment.id} (PENDING) - TXN: ${transactionId}`);

    // Publish event payment.created (chỉ là record, chưa thanh toán)
    await this.rabbitMQService.publish(
      'payment.events',
      'payment.created',
      {
        paymentId: payment.id,
        transactionId,
        bookingId: payment.bookingId,
        customerId: payment.customerId,
        amount: payment.finalAmount,
        status: 'pending',
        timestamp: new Date().toISOString(),
      },
    ).catch(error => {
      this.logger.error(`Failed to publish payment.created: ${error.message}`);
    });

    return this.mapToResponse(payment);
  }

  // ============ PROCESS PAYMENT (GỌI GATEWAY) - GỌI TỪ RIDE SERVICE KHI HOÀN THÀNH ============
  async processPayment(createDto: CreatePaymentDto): Promise<PaymentResponseDto> {
    const transactionId = `TXN_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;
    const sagaId = uuidv4();

    this.logger.log(`💰 Processing payment for ride ${createDto.rideId}: ${createDto.amount.toLocaleString()}đ`);
    this.logger.log(`   Saga ID: ${sagaId}, TXN: ${transactionId}`);

    try {
      // Step 1: Create payment record
      const payment = this.paymentRepository.create({
        transactionId,
        rideId: createDto.rideId,
        bookingId: createDto.bookingId,
        customerId: createDto.customerId,
        driverId: createDto.driverId || '',
        amount: createDto.amount,
        discountAmount: createDto.discountAmount || 0,
        finalAmount: createDto.finalAmount || createDto.amount,
        method: createDto.method || 'card',
        status: PaymentStatus.PROCESSING,
        couponCode: createDto.couponCode || undefined,
        metadata: createDto.metadata || {},
      });

      await this.paymentRepository.save(payment);
      await this.logSagaStep(sagaId, transactionId, 'create_payment', SagaStepStatus.COMPLETED, { paymentId: payment.id });

      // Step 2: Call payment gateway (mock)
      this.logger.log(`🔗 Calling payment gateway for ${transactionId}...`);
      const gatewayResult = await this.callPaymentGateway(payment);
      await this.logSagaStep(sagaId, transactionId, 'call_gateway', SagaStepStatus.COMPLETED, gatewayResult);

      if (!gatewayResult.success) {
        throw new Error(gatewayResult.message);
      }

      // Step 3: Update payment status to COMPLETED
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

      this.logger.log(`✅ Payment ${transactionId} completed successfully! Amount: ${payment.finalAmount.toLocaleString()}đ`);

      return this.mapToResponse(payment);

    } catch (error) {
      this.logger.error(`❌ Payment failed for ${transactionId}: ${error.message}`);

      // Update payment status to FAILED
      const payment = await this.paymentRepository.findOne({ where: { transactionId } });
      if (payment) {
        payment.status = PaymentStatus.FAILED;
        payment.metadata = {
          ...payment.metadata,
          error: error.message,
        };
        await this.paymentRepository.save(payment);
      }

      // Compensate saga
      await this.paymentSaga.compensate(sagaId, transactionId, error.message);

      // Publish payment.failed event
      await this.rabbitMQService.publish(
        'payment.events',
        'payment.failed',
        {
          transactionId,
          rideId: createDto.rideId,
          bookingId: createDto.bookingId,
          customerId: createDto.customerId,
          driverId: createDto.driverId,
          amount: createDto.amount,
          error: error.message,
          timestamp: new Date().toISOString(),
        },
      );

      throw new BadRequestException(`Payment failed: ${error.message}`);
    }
  }

  // ============ APPLY COUPON ============
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
      throw new BadRequestException(`Minimum order value is ${coupon.minOrderValue.toLocaleString()} VND`);
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

  // ============ REFUND PAYMENT ============
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
        bookingId: payment.bookingId,
        customerId: payment.customerId,
        driverId: payment.driverId,
        amount: payment.finalAmount,
        reason,
        timestamp: new Date().toISOString(),
      },
    );

    return this.mapToResponse(payment);
  }

  // ============ GET PAYMENT ============
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

  // ============ PAYMENT GATEWAY (MOCK) ============
  private async callPaymentGateway(payment: Payment): Promise<any> {
    this.logger.log(`🏦 Calling payment gateway for ${payment.transactionId}...`);
    
    // Giả lập thời gian xử lý
    await new Promise(resolve => setTimeout(resolve, 1000));

    // 95% thành công
    const isSuccess = Math.random() < 0.95;

    if (isSuccess) {
      this.logger.log(`✅ Gateway response: SUCCESS`);
      return {
        success: true,
        transactionId: `GATEWAY_${Date.now()}`,
        message: 'Payment processed successfully',
        amount: payment.finalAmount,
        currency: 'VND',
      };
    } else {
      this.logger.warn(`❌ Gateway response: FAILED`);
      return {
        success: false,
        message: 'Payment gateway error: Insufficient funds',
      };
    }
  }

  private async refundPaymentGateway(payment: Payment): Promise<any> {
    this.logger.log(`💸 Calling refund gateway for ${payment.transactionId}...`);
    await new Promise(resolve => setTimeout(resolve, 500));
    return { 
      success: true, 
      transactionId: `REFUND_${Date.now()}`,
      message: 'Refund processed successfully',
    };
  }

  // ============ SAGA LOG ============
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
    this.logger.debug(`📝 Saga step: ${stepName} - ${status}`);
  }

  // ============ MAP TO RESPONSE ============
  private mapToResponse(payment: Payment): PaymentResponseDto {
    return {
      id: payment.id,
      transactionId: payment.transactionId,
      rideId: payment.rideId,
      bookingId: payment.bookingId,
      customerId: payment.customerId,
      driverId: payment.driverId,
      amount: Number(payment.amount),
      discountAmount: Number(payment.discountAmount),
      finalAmount: Number(payment.finalAmount),
      method: payment.method,
      status: payment.status,
      couponCode: payment.couponCode,
      paidAt: payment.paidAt,
      createdAt: payment.createdAt,
    };
  }
}