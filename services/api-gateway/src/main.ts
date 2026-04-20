
const cookieParser = require('cookie-parser');

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';


async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  
  // CẤU HÌNH CORS - QUAN TRỌNG
  app.enableCors({
    origin: 'http://localhost:4000', // Cho phép frontend
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Authorization', 'Content-Type', 'Accept', 'x-service-id', 'x-internal-key'],
  });
  
  app.setGlobalPrefix('api/v1');
  
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }));
  
  app.use(cookieParser());
  
  const port = configService.get('PORT', 3000);
  await app.listen(port);
  
  console.log(`🚀 API Gateway is running on http://localhost:${port}/api/v1`);
  console.log(`📊 Health check: http://localhost:${port}/api/v1/health`);
  console.log(`🏓 Ping test: http://localhost:${port}/api/v1/ping`);
}

bootstrap();