import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InspectionReport } from './entities/report.entity';
import { ReportRevision } from './entities/report-revision.entity';
import { InspectionRequest } from '../requests/entities/request.entity';
import { User } from '../users/entities/user.entity';
import { PartMaster } from '../parts/entities/part.entity';
import { ReportsService } from './reports.service';
import { CalculationsService } from './calculations.service';
import { PdfExportService } from './pdf-export.service';
import { ReportsController } from './reports.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      InspectionReport,
      ReportRevision,
      InspectionRequest,
      User,
      PartMaster,
    ]),
  ],
  controllers: [ReportsController],
  providers: [ReportsService, CalculationsService, PdfExportService],
  exports: [ReportsService, CalculationsService, PdfExportService, TypeOrmModule],
})
export class ReportsModule {}
