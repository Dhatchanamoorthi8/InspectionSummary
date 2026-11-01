import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppEntities } from './database/data-source';
import { AuditModule } from './audit/audit.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { PartsModule } from './parts/parts.module';
import { RequestsModule } from './requests/requests.module';
import { ReportsModule } from './reports/reports.module';
import { DashboardModule } from './dashboard/dashboard.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get<string>('DB_HOST', 'localhost'),
        port: parseInt(config.get<string>('DB_PORT', '5432'), 10),
        username: config.get<string>('DB_USERNAME', 'postgres'),
        password: config.get<string>('DB_PASSWORD', 'root'),
        database: config.get<string>('DB_DATABASE', 'heat_treatment_inspection'),
        entities: AppEntities,
        synchronize: config.get<string>('DB_SYNCHRONIZE', 'true') === 'true',
        logging: config.get<string>('DB_LOGGING', 'false') === 'true',
      }),
    }),
    TypeOrmModule.forFeature(AppEntities),
    AuditModule,
    AuthModule,
    UsersModule,
    PartsModule,
    RequestsModule,
    ReportsModule,
    DashboardModule,
  ],
})
export class AppModule {}
