import { Module, Global, DynamicModule } from '@nestjs/common';
import { MongooseModule, MongooseModuleOptions } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';

@Global()
@Module({})
export class MongoModule {
  static forRoot(options?: MongooseModuleOptions): DynamicModule {
    return {
      module: MongoModule,
      imports: [
        MongooseModule.forRootAsync({
          useFactory: (configService: ConfigService) => {
            const uri = configService.get('MONGODB_URI') || 'mongodb://admin:password123@localhost:27017';
            const dbName = configService.get('MONGODB_DB_NAME') || 'booking';
            
            return {
              uri,
              dbName,
              useNewUrlParser: true,
              useUnifiedTopology: true,
              maxPoolSize: 10,
              serverSelectionTimeoutMS: 5000,
              socketTimeoutMS: 45000,
              ...options,
            };
          },
          inject: [ConfigService],
        }),
      ],
      exports: [MongooseModule],
    };
  }

  static forFeature(models: { name: string; schema: any }[]): DynamicModule {
    return MongooseModule.forFeature(models);
  }
}