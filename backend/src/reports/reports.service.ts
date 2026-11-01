import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InspectionReport } from './entities/report.entity';
import { ReportRevision } from './entities/report-revision.entity';
import { InspectionRequest } from '../requests/entities/request.entity';
import { User } from '../users/entities/user.entity';
import { PartMaster } from '../parts/entities/part.entity';
import { CalculationsService } from './calculations.service';
import { PdfExportService } from './pdf-export.service';
import { AuditService } from '../audit/audit.service';
import { UserRole } from '../common/enums/role.enum';
import { RequestStatus } from '../common/enums/request-status.enum';

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(InspectionReport)
    private readonly reportRepo: Repository<InspectionReport>,
    @InjectRepository(ReportRevision)
    private readonly revisionRepo: Repository<ReportRevision>,
    @InjectRepository(InspectionRequest)
    private readonly requestRepo: Repository<InspectionRequest>,
    @InjectRepository(PartMaster)
    private readonly partRepo: Repository<PartMaster>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly calcService: CalculationsService,
    private readonly pdfService: PdfExportService,
    private readonly auditService: AuditService,
  ) {}

  async submitReport(body: any, authUser: any) {
    if (authUser.role !== UserRole.QUALITY_INSPECTOR) {
      throw new ForbiddenException(
        'Forbidden: Production Engineer cannot submit inspection reports',
      );
    }

    const {
      requestId,
      reportDate,
      heatBatchNumber,
      furnace,
      autoReport,
      sampleBatchDate,
      bhn,
      ys,
      uts,
      elongation,
      inspectorRemarks,
      moduleType: bodyModuleType,
      moduleData,
    } = body || {};

    if (!requestId) {
      throw new BadRequestException('Request ID is required');
    }

    const targetReq = await this.requestRepo.findOne({ where: { id: requestId } });
    if (!targetReq) {
      throw new NotFoundException('Inspection request not found');
    }

    const moduleType = bodyModuleType || targetReq.moduleType || 'HEAT_TREATMENT';

    // Validation per module type
    if (moduleType === 'LINE_INSPECTION') {
      const lineData = moduleData || body;
      if (!lineData.lineId || !lineData.shift) {
        throw new BadRequestException('Line Number and Shift are required for Line Inspection');
      }
    } else {
      if (!heatBatchNumber || !furnace || !autoReport || !sampleBatchDate) {
        throw new BadRequestException('Missing required report fields');
      }
      if (isNaN(Date.parse(sampleBatchDate)) || (reportDate && isNaN(Date.parse(reportDate)))) {
        throw new BadRequestException('Invalid date format');
      }
    }

    // Ownership enforcement: assigned inspector only
    if (targetReq.assignedInspectorId !== authUser.id) {
      throw new ForbiddenException('Forbidden: Cannot submit report for another inspector task');
    }

    // Transactional duplicate submission prevention
    const existing = await this.reportRepo.findOne({ where: { requestId } });
    if (existing) {
      throw new ConflictException('Conflict: Duplicate report submission is not permitted');
    }

    // Module calculation
    const calc = this.calcService.calculate({
      moduleType,
      bhn,
      ys,
      uts,
      elongation,
      moduleData: moduleData || body,
      inspectorRemarks,
    });

    // Inspector signature snapshot
    const inspectorUser = await this.userRepo.findOne({ where: { id: authUser.id } });
    const signatureSnapshot =
      inspectorUser?.signatureData || 'data:image/png;base64,mock_snapshot';

    const effectiveDate = reportDate || new Date().toISOString().slice(0, 10);
    const newReport = this.reportRepo.create({
      requestId: targetReq.id,
      requestNumber: targetReq.requestNumber,
      partName: targetReq.partName,
      partNumber: targetReq.partNumber,
      moduleType,
      moduleData: moduleType === 'LINE_INSPECTION' ? (moduleData || body) : null,
      evaluationSummary: calc as any,
      reportDate: effectiveDate,
      heatBatchNumber: heatBatchNumber || (body.lineId ? `LINE-${body.lineId}` : 'LINE-NA'),
      furnace: furnace || (body.shift ? `SHIFT-${body.shift}` : 'STATION-1'),
      autoReport: autoReport || `RPT-${targetReq.requestNumber}`,
      sampleBatchDate: sampleBatchDate || effectiveDate,
      bhn: calc.numBhn ?? 0,
      ys: calc.numYs ?? 0,
      uts: calc.numUts ?? 0,
      elongation: calc.numE ?? 0,
      hardnessStatus: calc.hardnessStatus || 'OK',
      mechanicalStatus: calc.mechanicalStatus || 'OK',
      overallStatus: calc.overallStatus,
      inspectorRemarks: calc.inspectorRemarks,
      inspectorId: authUser.id,
      inspectorName: authUser.fullName,
      inspectorSignatureSnapshot: signatureSnapshot,
    } as any);

    let saved: InspectionReport;
    try {
      saved = (await this.reportRepo.save(newReport as any)) as InspectionReport;
    } catch (err: any) {
      if (
        err.code === '23505' ||
        err.message?.includes('duplicate key') ||
        err.message?.includes('unique constraint') ||
        err.message?.includes('Duplicate')
      ) {
        throw new ConflictException('Conflict: Duplicate report submission is not permitted');
      }
      throw err;
    }

    // Set request status to Completed
    targetReq.status = RequestStatus.COMPLETED;
    await this.requestRepo.save(targetReq);

    // Audit log
    await this.auditService.log(
      authUser.id,
      authUser.username,
      'SUBMIT_REPORT',
      'REPORT',
      saved.id,
      null,
      {
        overallStatus: calc.overallStatus,
        hardnessStatus: calc.hardnessStatus,
        mechanicalStatus: calc.mechanicalStatus,
      },
    );

    saved.revisions = [];
    return saved;
  }

  async findById(id: string) {
    const report = await this.reportRepo.findOne({
      where: [{ id }, { requestId: id }],
      relations: ['revisions'],
    });

    if (!report) {
      throw new NotFoundException('Inspection report not found');
    }

    if (report.revisions) {
      report.revisions.sort((a, b) => a.revisionNumber - b.revisionNumber);
    } else {
      report.revisions = [];
    }

    return report;
  }

  async createRevision(id: string, body: any, authUser: any) {
    const report = await this.reportRepo.findOne({
      where: [{ id }, { requestId: id }],
      relations: ['revisions'],
    });

    if (!report) {
      throw new NotFoundException('Inspection report not found');
    }

    const { bhn, ys, uts, elongation, inspectorRemarks, reason } = body || {};

    if (!reason || !reason.trim()) {
      throw new BadRequestException('Revision reason is required');
    }

    const numBhn = bhn !== undefined ? bhn : report.bhn;
    const numYs = ys !== undefined ? ys : report.ys;
    const numUts = uts !== undefined ? uts : report.uts;
    const numE = elongation !== undefined ? elongation : report.elongation;
    const remarks = inspectorRemarks !== undefined ? inspectorRemarks : report.inspectorRemarks;

    const calc = this.calcService.calculate({
      bhn: numBhn,
      ys: numYs,
      uts: numUts,
      elongation: numE,
      inspectorRemarks: remarks,
    });

    const previousSnapshot = {
      id: report.id,
      requestId: report.requestId,
      requestNumber: report.requestNumber,
      partName: report.partName,
      partNumber: report.partNumber,
      reportDate: report.reportDate,
      heatBatchNumber: report.heatBatchNumber,
      furnace: report.furnace,
      autoReport: report.autoReport,
      sampleBatchDate: report.sampleBatchDate,
      bhn: Number(report.bhn),
      ys: Number(report.ys),
      uts: Number(report.uts),
      elongation: Number(report.elongation),
      hardnessStatus: report.hardnessStatus,
      mechanicalStatus: report.mechanicalStatus,
      overallStatus: report.overallStatus,
      inspectorRemarks: report.inspectorRemarks,
      inspectorId: report.inspectorId,
      inspectorName: report.inspectorName,
      inspectorSignatureSnapshot: report.inspectorSignatureSnapshot,
      submissionTimestamp: report.submissionTimestamp,
    };

    const revCount = (await this.revisionRepo.count({ where: { reportId: report.id } })) || 0;
    const revisionRecord = this.revisionRepo.create({
      reportId: report.id,
      revisionNumber: revCount + 1,
      revisedBy: authUser.username,
      reason: reason.trim(),
      previousSnapshot,
    });

    await this.revisionRepo.save(revisionRecord);

    report.bhn = calc.numBhn;
    report.ys = calc.numYs;
    report.uts = calc.numUts;
    report.elongation = calc.numE;
    report.hardnessStatus = calc.hardnessStatus;
    report.mechanicalStatus = calc.mechanicalStatus;
    report.overallStatus = calc.overallStatus;
    report.inspectorRemarks = calc.inspectorRemarks;
    delete (report as any).revisions;

    const saved = await this.reportRepo.save(report);
    const allRevisions = await this.revisionRepo.find({
      where: { reportId: report.id },
      order: { revisionNumber: 'ASC' },
    });
    saved.revisions = allRevisions;

    await this.auditService.log(
      authUser.id,
      authUser.username,
      'REVISE_REPORT',
      'REPORT',
      report.id,
      previousSnapshot,
      {
        revisionNumber: revisionRecord.revisionNumber,
        reason: revisionRecord.reason,
      },
    );

    return saved;
  }

  async getPdfStream(id: string) {
    const report = await this.findById(id);
    return {
      stream: this.pdfService.generatePdf(report),
      requestNumber: report.requestNumber,
    };
  }

  async deleteReport(id: string, authUser: any, reason?: string) {
    const isAuthorized =
      authUser.role === UserRole.ADMIN ||
      authUser.role === UserRole.PRODUCTION_ENGINEER ||
      (authUser.customPermissions && authUser.customPermissions.includes('REPORT_DELETE'));

    if (!isAuthorized) {
      throw new ForbiddenException('Forbidden: Insufficient permissions to delete inspection reports');
    }

    const report = await this.reportRepo.findOne({ where: { id } });
    if (!report) {
      throw new NotFoundException('Inspection report not found');
    }

    // Revert associated request back to IN_PROGRESS so it can be re-tested
    const targetReq = await this.requestRepo.findOne({ where: { id: report.requestId } });
    if (targetReq) {
      targetReq.status = RequestStatus.IN_PROGRESS;
      await this.requestRepo.save(targetReq);
    }

    // Delete revisions
    await this.revisionRepo.delete({ reportId: report.id });

    // Delete report
    await this.reportRepo.remove(report);

    // Audit log
    await this.auditService.log(
      authUser.id,
      authUser.username,
      'VOID_REPORT',
      'REPORT',
      id,
      {
        reportNumber: report.autoReport,
        requestId: report.requestId,
        overallStatus: report.overallStatus,
        voidReason: reason || 'Report deleted and voided by authorized staff',
      },
      null,
    );

    return {
      success: true,
      message: 'Inspection report voided and deleted successfully; request status reverted to In Progress',
      id,
    };
  }

  async getHeatTreatmentSummary(filters?: {
    startDate?: string;
    endDate?: string;
    partName?: string;
  }) {
    // 1. Fetch active parts
    const partQuery = this.partRepo
      .createQueryBuilder('p')
      .where('p.isActive = true');

    if (filters?.partName) {
      partQuery.andWhere('p.partName = :partName', { partName: filters.partName });
    }

    const activeParts = await partQuery.getMany();

    // 2. Query requests and reports
    const reqQuery = this.requestRepo
      .createQueryBuilder('r')
      .leftJoinAndSelect('r.report', 'rep');

    if (filters?.startDate) {
      reqQuery.andWhere('r.createdAt >= :startDate', { startDate: new Date(filters.startDate) });
    }
    if (filters?.endDate) {
      reqQuery.andWhere('r.createdAt <= :endDate', { endDate: new Date(filters.endDate) });
    }
    if (filters?.partName) {
      reqQuery.andWhere('r.partName = :partName', { partName: filters.partName });
    }

    const requests = await reqQuery.getMany();

    // 3. Group by partName
    const partMap = new Map<
      string,
      {
        partName: string;
        partNumbers: Set<string>;
        requests: InspectionRequest[];
      }
    >();

    // Register active parts
    for (const p of activeParts) {
      if (!partMap.has(p.partName)) {
        partMap.set(p.partName, {
          partName: p.partName,
          partNumbers: new Set([p.partNumber]),
          requests: [],
        });
      } else {
        partMap.get(p.partName)!.partNumbers.add(p.partNumber);
      }
    }

    // Attach matching requests
    for (const req of requests) {
      if (!partMap.has(req.partName)) {
        partMap.set(req.partName, {
          partName: req.partName,
          partNumbers: new Set([req.partNumber]),
          requests: [req],
        });
      } else {
        const item = partMap.get(req.partName)!;
        item.partNumbers.add(req.partNumber);
        item.requests.push(req);
      }
    }

    // 4. Calculate rows
    const summaryRows = Array.from(partMap.values()).map((group) => {
      const partReqs = group.requests;
      const completedReports = partReqs
        .map((r) => r.report)
        .filter((rep): rep is InspectionReport => !!rep);

      // Distinct batches
      const uniqueBatches = new Set<string>();
      for (const rep of completedReports) {
        if (rep.heatBatchNumber) uniqueBatches.add(rep.heatBatchNumber);
      }

      // Hardness Qty
      const hardnessReports = completedReports.filter((r) => Number(r.bhn) > 0);
      const hardnessCompleted = hardnessReports.length;
      const hardnessPending = partReqs.filter((r) => r.status !== RequestStatus.COMPLETED).length;

      let hardnessStatus: 'OK' | 'NOT_OK' | 'PENDING' = 'PENDING';
      if (hardnessCompleted > 0) {
        const hasFailed = hardnessReports.some(
          (r) => r.hardnessStatus === 'NOT_OK' || Number(r.bhn) < 80,
        );
        hardnessStatus = hasFailed ? 'NOT_OK' : 'OK';
      }

      // Tensile Qty
      const tensileReports = completedReports.filter((r) => Number(r.uts) > 0 || Number(r.ys) > 0);
      const tensileCompleted = tensileReports.length;
      const tensilePending = hardnessPending;

      let tensileStatus: 'OK' | 'NOT_OK' | 'PENDING' = 'PENDING';
      if (tensileCompleted > 0) {
        const hasFailed = tensileReports.some(
          (r) =>
            r.mechanicalStatus === 'NOT_OK' ||
            Number(r.ys) < 220 ||
            Number(r.uts) < 280 ||
            Number(r.elongation) < 1.0,
        );
        tensileStatus = hasFailed ? 'NOT_OK' : 'OK';
      }

      const noOfReceivedBatch =
        uniqueBatches.size > 0 ? uniqueBatches.size : partReqs.length > 0 ? 1 : 0;
      const noOfQaReceivedBatch = partReqs.length;
      const gap = Math.max(0, noOfQaReceivedBatch - noOfReceivedBatch);

      let overallStatus: 'OK' | 'NOT_OK' | 'PENDING' = 'PENDING';
      if (hardnessStatus === 'NOT_OK' || tensileStatus === 'NOT_OK') {
        overallStatus = 'NOT_OK';
      } else if (hardnessStatus === 'OK' && tensileStatus === 'OK') {
        overallStatus = 'OK';
      } else if (hardnessStatus === 'OK' || tensileStatus === 'OK') {
        overallStatus = 'OK';
      }

      return {
        partName: group.partName,
        partNumbers: Array.from(group.partNumbers),
        noOfReceivedBatch,
        noOfQaReceivedBatch,
        gap,
        hardnessQty: {
          completed: hardnessCompleted,
          balance: hardnessPending,
        },
        hardnessStatus,
        tensileQty: {
          completed: tensileCompleted,
          balance: tensilePending,
        },
        tensileStatus,
        overallStatus,
        totalRequests: partReqs.length,
        completedCount: completedReports.length,
      };
    });

    // Prioritize plant parts from user template first
    const priorityParts = [
      'TM BKT',
      'PTU COVER',
      'CHARGE POST',
      'SWING ARM LH',
      'SUBFRAME',
      'SWING ARM RH',
    ];
    summaryRows.sort((a, b) => {
      const idxA = priorityParts.indexOf(a.partName);
      const idxB = priorityParts.indexOf(b.partName);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return a.partName.localeCompare(b.partName);
    });

    const totals = {
      noOfReceivedBatch: summaryRows.reduce((acc, r) => acc + r.noOfReceivedBatch, 0),
      noOfQaReceivedBatch: summaryRows.reduce((acc, r) => acc + r.noOfQaReceivedBatch, 0),
      gap: summaryRows.reduce((acc, r) => acc + r.gap, 0),
      hardnessQty: {
        completed: summaryRows.reduce((acc, r) => acc + r.hardnessQty.completed, 0),
        balance: summaryRows.reduce((acc, r) => acc + r.hardnessQty.balance, 0),
      },
      tensileQty: {
        completed: summaryRows.reduce((acc, r) => acc + r.tensileQty.completed, 0),
        balance: summaryRows.reduce((acc, r) => acc + r.tensileQty.balance, 0),
      },
      totalRequests: summaryRows.reduce((acc, r) => acc + r.totalRequests, 0),
      completedCount: summaryRows.reduce((acc, r) => acc + r.completedCount, 0),
    };

    return {
      title: 'Heat Treatment Inspection Report',
      generatedAt: new Date().toISOString(),
      rows: summaryRows,
      totals,
    };
  }
}
