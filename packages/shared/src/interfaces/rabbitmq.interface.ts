export interface RabbitMQConfig {
  urls: string[];
  prefetchCount?: number;
  noAck?: boolean;
  queueOptions?: {
    durable?: boolean;
    exclusive?: boolean;
    autoDelete?: boolean;
  };
  exchangeOptions?: {
    durable?: boolean;
    autoDelete?: boolean;
  };
}

export interface MessagePayload<T = any> {
  pattern: string;
  data: T;
  metadata: {
    timestamp: string;
    serviceId: string;
    correlationId?: string;
    replyTo?: string;
  };
}