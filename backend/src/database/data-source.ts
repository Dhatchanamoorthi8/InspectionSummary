import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import { User } from '../users/entities/user.entity';
import { PermissionEntity } from '../users/entities/permission.entity';
import { PartMaster } from '../parts/entities/part.entity';
import { InspectionRequest } from '../requests/entities/request.entity';
import { AssignmentHistory } from '../requests/entities/reassignment-history.entity';
import { InspectionReport } from '../reports/entities/report.entity';
import { ReportRevision } from '../reports/entities/report-revision.entity';
import { AuditLog } from '../audit/entities/audit-log.entity';

dotenv.config();

export const AppEntities = [
  User,
  PermissionEntity,
  PartMaster,
  InspectionRequest,
  AssignmentHistory,
  InspectionReport,
  ReportRevision,
  AuditLog,
];

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'root',
  database: process.env.DB_DATABASE || 'heat_treatment_inspection',
  synchronize: process.env.DB_SYNCHRONIZE === 'true' || true,
  logging: process.env.DB_LOGGING === 'true',
  entities: AppEntities,
  migrations: [__dirname + '/migrations/*{.ts,.js}'],
  subscribers: [],
});

