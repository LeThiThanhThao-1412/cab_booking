import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
const cookieParser = require('cookie-parser');

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  
  // Global prefix
  app.setGlobalPrefix('api/v1');
  
  // Validation
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }));
  
  // Cookie parser
  app.use(cookieParser());
  
  // CORS
  app.enableCors({
    origin: configService.get('CORS_ORIGINS', '*').split(','),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Authorization', 'Content-Type', 'Accept', 'x-service-id', 'x-internal-key'],
  });
  
  const port = configService.get('PORT', 3000);
  await app.listen(port);
  
  console.log(`🚀 API Gateway is running on http://localhost:${port}/api/v1`);
  console.log(`📊 Health check: http://localhost:${port}/api/v1/health`);
  console.log(`ℹ️  Service info: http://localhost:${port}/api/v1/info`);
  console.log(`🏓 Ping test: http://localhost:${port}/api/v1/ping`);
}

bootstrap();