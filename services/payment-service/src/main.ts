import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  app.enableCors();

  const port = process.env.PORT || 3007;
  await app.listen(port);

  console.log(`✅ Payment service running on http://localhost:${port}/api/v1/payments`);
  console.log(`📡 Saga pattern enabled for distributed transactions`);
}

bootstrap();