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

  const port = process.env.PORT || 3010;
  await app.listen(port);

  console.log(`✅ Review service running on http://localhost:${port}/api/v1/reviews`);
  console.log(`⭐ Rating and feedback management ready`);
}

bootstrap();