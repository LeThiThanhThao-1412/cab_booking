import { Module, Global, DynamicModule } from '@nestjs/common';
import { TypeOrmModule, TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Global()
@Module({})
export class PostgresModule {
  static forRoot(): DynamicModule {
    return {
      module: PostgresModule,
      imports: [
        ConfigModule, // đảm bảo có ConfigService
        TypeOrmModule.forRootAsync({
          inject: [ConfigService],
          useFactory: (configService: ConfigService): TypeOrmModuleOptions => {
            const nodeEnv =
              configService.get<string>('NODE_ENV') ?? 'development';

            return {
              type: 'postgres', // cố định, không cho override
              host:
                configService.get<string>('POSTGRES_HOST') ?? 'localhost',
              port: Number(
                configService.get<number>('POSTGRES_PORT') ?? 5432,
              ),
              username:
                configService.get<string>('POSTGRES_USER') ?? 'admin',
              password:
                configService.get<string>('POSTGRES_PASSWORD') ??
                'password123',
              database:
                configService.get<string>('POSTGRES_DB') ?? 'postgres',

              entities: [__dirname + '/../**/*.entity{.ts,.js}'],

              synchronize: nodeEnv !== 'production',
              logging: nodeEnv === 'development',

              autoLoadEntities: true,
            };
          },
        }),
      ],
      exports: [TypeOrmModule],
    };
  }

  static forFeature(entities: any[]): DynamicModule {
    return TypeOrmModule.forFeature(entities);
  }
}