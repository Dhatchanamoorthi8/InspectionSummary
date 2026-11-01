import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InspectionRequest } from '../requests/entities/request.entity';
import { InspectionReport } from '../reports/entities/report.entity';
import { RequestStatus } from '../common/enums/request-status.enum';
import { QCStatus } from '../common/enums/qc-status.enum';

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(InspectionRequest)
    private readonly requestRepo: Repository<InspectionRequest>,
    @InjectRepository(InspectionReport)
    private readonly reportRepo: Repository<InspectionReport>,
  ) {}

  async getProductionDashboard(filter?: { partName?: string; fromDate?: string; toDate?: string }) {
    let requests = await this.requestRepo.find({
      order: { createdAt: 'DESC' },
      relations: ['report'],
    });
    let reports = await this.reportRepo.find();

    if (filter?.partName && filter.partName !== 'ALL' && filter.partName !== 'All Parts') {
      const pName = filter.partName.trim().toLowerCase();
      requests = requests.filter((r) => r.partName?.toLowerCase() === pName);
    }
    if (filter?.fromDate) {
      requests = requests.filter((r) => r.date >= filter.fromDate!);
    }
    if (filter?.toDate) {
      requests = requests.filter((r) => r.date <= filter.toDate!);
    }

    const filteredReqIds = new Set(requests.map((r) => r.id));
    reports = reports.filter((rp) => filteredReqIds.has(rp.requestId));

    const totalRequests = requests.length;
    const draft = requests.filter((r) => r.status === RequestStatus.DRAFT).length;
    const assigned = requests.filter((r) => r.status === RequestStatus.ASSIGNED).length;
    const inProgress = requests.filter((r) => r.status === RequestStatus.IN_PROGRESS).length;
    const completed = requests.filter((r) => r.status === RequestStatus.COMPLETED).length;
    const pending = assigned + inProgress;
    const notOkReports = reports.filter((rp) => rp.overallStatus === QCStatus.NOT_OK).length;
    const okReports = reports.filter((rp) => rp.overallStatus === QCStatus.OK).length;

    // Production Engineering Domain Metrics
    const throughput = {
      totalAssignedQty: totalRequests,
      completedDoneQty: completed,
      pendingBalanceQty: pending,
      inProgressQty: inProgress,
      draftQty: draft,
      completionRatePercent: totalRequests > 0 ? Math.round((completed / totalRequests) * 1000) / 10 : 0,
    };

    const htTestedQty = reports.filter(
      (r) => r.hardnessStatus === QCStatus.OK || r.hardnessStatus === QCStatus.NOT_OK || Number(r.bhn) > 0,
    ).length;
    const htPassQty = reports.filter((r) => r.hardnessStatus === QCStatus.OK).length;
    const htFailQty = reports.filter((r) => r.hardnessStatus === QCStatus.NOT_OK).length;
    const heatTreatment = {
      testedQty: htTestedQty,
      passOkQty: htPassQty,
      failNotOkQty: htFailQty,
      passRatePercent: htTestedQty > 0 ? Math.round((htPassQty / htTestedQty) * 1000) / 10 : 0,
    };

    const tensileTestedQty = reports.filter(
      (r) =>
        r.mechanicalStatus === QCStatus.OK ||
        r.mechanicalStatus === QCStatus.NOT_OK ||
        Number(r.uts) > 0 ||
        Number(r.ys) > 0,
    ).length;
    const tensilePassQty = reports.filter((r) => r.mechanicalStatus === QCStatus.OK).length;
    const tensileFailQty = reports.filter((r) => r.mechanicalStatus === QCStatus.NOT_OK).length;
    const tensile = {
      testedQty: tensileTestedQty,
      passOkQty: tensilePassQty,
      failNotOkQty: tensileFailQty,
      passRatePercent: tensileTestedQty > 0 ? Math.round((tensilePassQty / tensileTestedQty) * 1000) / 10 : 0,
    };

    const overallQuality = {
      totalEvaluated: reports.length,
      overallOk: okReports,
      overallNotOk: notOkReports,
      firstPassYieldPercent: reports.length > 0 ? Math.round((okReports / reports.length) * 1000) / 10 : 0,
    };

    const last5Completed = requests
      .filter((r) => r.status === RequestStatus.COMPLETED)
      .slice(0, 5)
      .map((r) => {
        const rep = reports.find((rp) => rp.requestId === r.id);
        return {
          requestId: r.id,
          requestNumber: r.requestNumber,
          date: r.date,
          partName: r.partName,
          partNumber: r.partNumber,
          assignedInspector: r.assignedInspectorName,
          overallStatus: rep ? rep.overallStatus : 'UNKNOWN',
        };
      });

    // Extract chronological Run Chart data points for metallurgical monitoring
    const runChartData = requests
      .filter((r) => r.report && (Number(r.report.bhn) > 0 || Number(r.report.ys) > 0 || Number(r.report.uts) > 0))
      .slice()
      .sort((a, b) => {
        const dateA = a.report?.reportDate || a.date;
        const dateB = b.report?.reportDate || b.date;
        if (dateA !== dateB) return dateA.localeCompare(dateB);
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      })
      .map((r, idx) => {
        const rep = r.report!;
        return {
          index: idx + 1,
          requestId: r.id,
          requestNumber: r.requestNumber,
          date: r.date,
          reportDate: rep.reportDate || r.date,
          heatBatchNumber: rep.heatBatchNumber || `BATCH-${idx + 1}`,
          partName: r.partName,
          partNumber: r.partNumber,
          bhn: Number(rep.bhn) || 0,
          ys: Number(rep.ys) || 0,
          uts: Number(rep.uts) || 0,
          elongation: Number(rep.elongation) || 0,
          hardnessStatus: rep.hardnessStatus,
          mechanicalStatus: rep.mechanicalStatus,
          overallStatus: rep.overallStatus,
        };
      });

    const availablePartNumbers = Array.from(
      new Set(requests.map((r) => r.partNumber).filter(Boolean)),
    ).sort();

    return {
      kpi: {
        totalRequests,
        draft,
        assigned,
        inProgress,
        completed,
        pending,
        notOkReports,
        throughput,
        heatTreatment,
        tensile,
        overallQuality,
      },
      requestsByStatus: [
        { status: 'Draft', count: draft },
        { status: 'Assigned', count: assigned },
        { status: 'In Progress', count: inProgress },
        { status: 'Completed', count: completed },
      ],
      distribution: [
        { name: 'OK', count: okReports },
        { name: 'Not OK', count: notOkReports },
        { name: 'Pending', count: pending },
      ],
      last5Completed,
      runChartData,
      availablePartNumbers,
    };
  }

  async getInspectorDashboard(user: any, filter?: { partName?: string; fromDate?: string; toDate?: string }) {
    let myRequests = await this.requestRepo.find({
      where: { assignedInspectorId: user.id },
      order: { createdAt: 'DESC' },
      relations: ['report'],
    });
    let myReports = await this.reportRepo.find({
      where: { inspectorId: user.id },
    });

    if (filter?.partName && filter.partName !== 'ALL' && filter.partName !== 'All Parts') {
      const pName = filter.partName.trim().toLowerCase();
      myRequests = myRequests.filter((r) => r.partName?.toLowerCase() === pName);
    }
    if (filter?.fromDate) {
      myRequests = myRequests.filter((r) => r.date >= filter.fromDate!);
    }
    if (filter?.toDate) {
      myRequests = myRequests.filter((r) => r.date <= filter.toDate!);
    }

    const filteredReqIds = new Set(myRequests.map((r) => r.id));
    myReports = myReports.filter((rp) => filteredReqIds.has(rp.requestId));

    const totalAssigned = myRequests.length;
    const pending = myRequests.filter((r) => r.status === RequestStatus.ASSIGNED).length;
    const inProgress = myRequests.filter((r) => r.status === RequestStatus.IN_PROGRESS).length;
    const completed = myRequests.filter((r) => r.status === RequestStatus.COMPLETED).length;
    const notOkReports = myReports.filter((rp) => rp.overallStatus === QCStatus.NOT_OK).length;
    const okReports = myReports.filter((rp) => rp.overallStatus === QCStatus.OK).length;

    // Inspector Domain Metrics
    const throughput = {
      totalAssignedQty: totalAssigned,
      completedDoneQty: completed,
      pendingBalanceQty: pending + inProgress,
      inProgressQty: inProgress,
      completionRatePercent: totalAssigned > 0 ? Math.round((completed / totalAssigned) * 1000) / 10 : 0,
    };

    const htTestedQty = myReports.filter(
      (r) => r.hardnessStatus === QCStatus.OK || r.hardnessStatus === QCStatus.NOT_OK || Number(r.bhn) > 0,
    ).length;
    const htPassQty = myReports.filter((r) => r.hardnessStatus === QCStatus.OK).length;
    const htFailQty = myReports.filter((r) => r.hardnessStatus === QCStatus.NOT_OK).length;
    const heatTreatment = {
      testedQty: htTestedQty,
      passOkQty: htPassQty,
      failNotOkQty: htFailQty,
      passRatePercent: htTestedQty > 0 ? Math.round((htPassQty / htTestedQty) * 1000) / 10 : 0,
    };

    const tensileTestedQty = myReports.filter(
      (r) =>
        r.mechanicalStatus === QCStatus.OK ||
        r.mechanicalStatus === QCStatus.NOT_OK ||
        Number(r.uts) > 0 ||
        Number(r.ys) > 0,
    ).length;
    const tensilePassQty = myReports.filter((r) => r.mechanicalStatus === QCStatus.OK).length;
    const tensileFailQty = myReports.filter((r) => r.mechanicalStatus === QCStatus.NOT_OK).length;
    const tensile = {
      testedQty: tensileTestedQty,
      passOkQty: tensilePassQty,
      failNotOkQty: tensileFailQty,
      passRatePercent: tensileTestedQty > 0 ? Math.round((tensilePassQty / tensileTestedQty) * 1000) / 10 : 0,
    };

    const overallQuality = {
      totalEvaluated: myReports.length,
      overallOk: okReports,
      overallNotOk: notOkReports,
      firstPassYieldPercent: myReports.length > 0 ? Math.round((okReports / myReports.length) * 1000) / 10 : 0,
    };

    const nextPendingTask =
      myRequests.find(
        (r) => r.status === RequestStatus.ASSIGNED || r.status === RequestStatus.IN_PROGRESS,
      ) || null;

    const runChartData = myRequests
      .filter((r) => r.report && (Number(r.report.bhn) > 0 || Number(r.report.ys) > 0 || Number(r.report.uts) > 0))
      .slice()
      .sort((a, b) => {
        const dateA = a.report?.reportDate || a.date;
        const dateB = b.report?.reportDate || b.date;
        if (dateA !== dateB) return dateA.localeCompare(dateB);
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      })
      .map((r, idx) => {
        const rep = r.report!;
        return {
          index: idx + 1,
          requestId: r.id,
          requestNumber: r.requestNumber,
          date: r.date,
          reportDate: rep.reportDate || r.date,
          heatBatchNumber: rep.heatBatchNumber || `BATCH-${idx + 1}`,
          partName: r.partName,
          partNumber: r.partNumber,
          bhn: Number(rep.bhn) || 0,
          ys: Number(rep.ys) || 0,
          uts: Number(rep.uts) || 0,
          elongation: Number(rep.elongation) || 0,
          hardnessStatus: rep.hardnessStatus,
          mechanicalStatus: rep.mechanicalStatus,
          overallStatus: rep.overallStatus,
        };
      });

    const availablePartNumbers = Array.from(
      new Set(myRequests.map((r) => r.partNumber).filter(Boolean)),
    ).sort();

    return {
      kpi: {
        totalAssigned,
        pending,
        inProgress,
        completed,
        notOkReports,
        throughput,
        heatTreatment,
        tensile,
        overallQuality,
      },
      requestsByStatus: [
        { status: 'Assigned', count: pending },
        { status: 'In Progress', count: inProgress },
        { status: 'Completed', count: completed },
      ],
      distribution: [
        { name: 'OK', count: okReports },
        { name: 'Not OK', count: notOkReports },
        { name: 'Pending', count: pending + inProgress },
      ],
      recentAssignedTasks: myRequests.slice(0, 5),
      nextPendingTask,
      runChartData,
      availablePartNumbers,
    };
  }
}
