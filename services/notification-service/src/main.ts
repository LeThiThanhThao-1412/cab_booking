// main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }));
  app.enableCors({ origin: '*', credentials: true });

  const port = process.env.PORT || 3009;
  await app.listen(port);

  console.log(`🚀 Notification service running on http://localhost:${port}/api/v1`);
  console.log(`📊 Health check: http://localhost:${port}/api/v1/health`);
  console.log(`🔒 Internal health: http://localhost:${port}/api/v1/internal/health`);
  console.log(`📡 WebSocket: ws://localhost:${port}/notifications`);
}

bootstrap();