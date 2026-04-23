import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, Logger } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.enableCors();
  
  const port = process.env.PORT || 3011;
  await app.listen(port);
  
  Logger.log(`🤖 AI Service running on http://localhost:${port}/api/v1/ai`);
  Logger.log(`   POST /ai/eta/predict - ETA Prediction`);
  Logger.log(`   POST /ai/surge/calculate - Surge Pricing`);
  Logger.log(`   POST /ai/driver/score - Driver Matching`);
  Logger.log(`   POST /ai/fraud/detect - Fraud Detection`);
  Logger.log(`   POST /ai/data/eta - Save ETA history`);
  Logger.log(`   POST /ai/retrain - Retrain models`);
}

bootstrap();