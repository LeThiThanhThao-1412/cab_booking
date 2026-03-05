import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import * as amqp from 'amqplib';
import { RabbitMQConfig, MessagePayload } from '../interfaces/rabbitmq.interface';

@Injectable()
export class RabbitMQService implements OnModuleInit, OnModuleDestroy {
  private connection: any;
  private channel: any;
  private readonly logger = new Logger(RabbitMQService.name);
  private readonly config: RabbitMQConfig;
  private reconnectAttempts = 0;
  private readonly maxReconnectAttempts = 10;
  private readonly reconnectDelay = 5000;

  constructor(config?: Partial<RabbitMQConfig>) {
    this.config = {
      urls: [process.env.RABBITMQ_URL || 'amqp://admin:password123@localhost:5672'],
      prefetchCount: 10,
      noAck: false,
      ...config,
    };
  }

  async onModuleInit() {
    await this.connect();
  }

  async onModuleDestroy() {
    await this.close();
  }

  private async connect(): Promise<void> {
    try {
      const amqpLib: any = amqp;
      this.connection = await amqpLib.connect(this.config.urls[0]);
      this.channel = await this.connection.createChannel();
      
      await this.channel.prefetch(this.config.prefetchCount);
      
      this.connection.on('error', (err: Error) => {
        this.logger.error('RabbitMQ connection error:', err);
        this.reconnect();
      });
      
      this.connection.on('close', () => {
        this.logger.warn('RabbitMQ connection closed');
        this.reconnect();
      });
      
      this.reconnectAttempts = 0;
      this.logger.log('✅ Connected to RabbitMQ successfully');
      
    } catch (error) {
      this.logger.error('Failed to connect to RabbitMQ:', error);
      this.reconnect();
    }
  }

  private reconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.logger.error('Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    setTimeout(() => this.connect(), this.reconnectDelay);
  }

  private async close(): Promise<void> {
    try {
      if (this.channel) {
        await this.channel.close();
      }
      if (this.connection) {
        await this.connection.close();
      }
    } catch (error) {
      this.logger.error('Error closing RabbitMQ connection:', error);
    }
  }

  async publish<T = any>(
    exchange: string,
    routingKey: string,
    message: T,
    options?: {
      correlationId?: string;
      headers?: Record<string, any>;
    },
  ): Promise<boolean> {
    if (!this.channel) return false;

    try {
      await this.channel.assertExchange(exchange, 'topic', { durable: true });

      const payload: MessagePayload<T> = {
        pattern: routingKey,
        data: message,
        metadata: {
          timestamp: new Date().toISOString(),
          serviceId: process.env.SERVICE_ID || 'unknown',
          correlationId: options?.correlationId,
        },
      };

      const result = this.channel.publish(
        exchange,
        routingKey,
        Buffer.from(JSON.stringify(payload)),
        {
          contentType: 'application/json',
          correlationId: options?.correlationId,
          headers: options?.headers,
          persistent: true,
        },
      );

      if (result) {
        this.logger.debug(`📤 Published to ${exchange}.${routingKey}`);
      }

      return result;
    } catch (error) {
      this.logger.error(`Publish error: ${error.message}`);
      return false;
    }
  }

  async subscribe<T = any>(
    queue: string,
    callback: (msg: T) => Promise<void>,
    options?: {
      exchange?: string;
      routingKey?: string;
      noAck?: boolean;
    },
  ): Promise<void> {
    if (!this.channel) throw new Error('Channel not available');

    await this.channel.assertQueue(queue, { durable: true });
    
    if (options?.exchange && options?.routingKey) {
      await this.channel.assertExchange(options.exchange, 'topic', { durable: true });
      await this.channel.bindQueue(queue, options.exchange, options.routingKey);
    }

    await this.channel.consume(
      queue,
      async (msg: any) => {
        if (!msg) return;

        try {
          const content = JSON.parse(msg.content.toString());
          await callback(content.data || content);
          if (!options?.noAck && !this.config.noAck) {
            this.channel.ack(msg);
          }
        } catch (error) {
          this.logger.error(`Process error: ${error.message}`);
          this.channel.nack(msg, false, false);
        }
      },
      { noAck: options?.noAck ?? this.config.noAck },
    );

    this.logger.log(`📥 Subscribed to queue: ${queue}`);
  }
}