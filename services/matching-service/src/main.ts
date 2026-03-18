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

  app.enableCors();

  const port = process.env.PORT || 3006;
  await app.listen(port);

  console.log(`✅ Matching service is running on http://localhost:${port}/api/v1/matching`);
  console.log(`📡 Connected to Redis for driver locations`);
  console.log(`📡 Connected to RabbitMQ for events`);
}

bootstrap();