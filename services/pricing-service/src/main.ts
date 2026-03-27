import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Global prefix cho tất cả API
  app.setGlobalPrefix('api/v1');

  // Validation pipe
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }));

  // Enable CORS
  app.enableCors({
    origin: '*',
    credentials: true,
  });

  const port = process.env.PORT || 3008;
  await app.listen(port);

  console.log(`✅ Pricing service is running on http://localhost:${port}/api/v1/pricing`);
  console.log(`📊 Surge pricing enabled with dynamic multiplier`);
  console.log(`🎫 Coupon management ready`);
}

bootstrap();