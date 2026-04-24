import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  app.setGlobalPrefix('api/v1');
  
  // ✅ Cách đơn giản, để NestJS tự xử lý
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }));
  
  const port = process.env.PORT || 3004;
  await app.listen(port);
  
  console.log(`✅ Booking service is running on http://localhost:${port}/api/v1/bookings`);
}

bootstrap();