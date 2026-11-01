import { Injectable, BadRequestException } from '@nestjs/common';
import { QCStatus } from '../common/enums/qc-status.enum';
import { InspectionModuleType } from '../common/enums/inspection-module.enum';

export interface CalculationInput {
  moduleType?: string;
  bhn?: any;
  ys?: any;
  uts?: any;
  elongation?: any;
  moduleData?: Record<string, any>;
  inspectorRemarks?: string | null;
}

export interface CalculationResult {
  moduleType: string;
  numBhn: number;
  numYs: number;
  numUts: number;
  numE: number;
  hardnessStatus: QCStatus;
  mechanicalStatus: QCStatus;
  overallStatus: QCStatus;
  inspectorRemarks: string;
  moduleData: Record<string, any>;
  evaluationSummary: Record<string, any>;
}

@Injectable()
export class CalculationsService {
  calculate(input: CalculationInput): CalculationResult {
    const moduleType = input.moduleType || InspectionModuleType.HEAT_TREATMENT;

    if (moduleType === InspectionModuleType.LINE_INSPECTION) {
      return this.calculateLineInspection(input);
    }

    return this.calculateHeatTreatment(input);
  }

  // 1. HEAT TREATMENT INSPECTION CALCULATION ENGINE
  calculateHeatTreatment(input: CalculationInput): CalculationResult {
    const { bhn, ys, uts, elongation, inspectorRemarks } = input;

    const numBhn = Number(bhn);
    const numYs = Number(ys);
    const numUts = Number(uts);
    const numE = Number(elongation);

    if (
      !Number.isFinite(numBhn) ||
      !Number.isFinite(numYs) ||
      !Number.isFinite(numUts) ||
      !Number.isFinite(numE)
    ) {
      throw new BadRequestException('BHN, YS, UTS, and Elongation must be valid finite numbers');
    }

    if (numBhn < 0 || numYs < 0 || numUts < 0 || numE < 0) {
      throw new BadRequestException(
        'Negative values are rejected for mechanical/hardness measurements',
      );
    }

    if (numBhn > 3000 || numYs > 5000 || numUts > 5000 || numE > 100) {
      throw new BadRequestException(
        'Measurement values exceed physical limits for heat treatment testing',
      );
    }

    // Hardness validation: BHN >= 80.00 -> OK, < 80.00 -> NOT_OK
    const hardnessStatus = numBhn >= 80.0 ? QCStatus.OK : QCStatus.NOT_OK;

    // Mechanical validation: YS >= 220.00, UTS >= 280.00, E >= 1.00 -> OK, else NOT_OK
    const mechanicalStatus =
      numYs >= 220.0 && numUts >= 280.0 && numE >= 1.0 ? QCStatus.OK : QCStatus.NOT_OK;

    // Overall status: OK iff both OK
    const overallStatus =
      hardnessStatus === QCStatus.OK && mechanicalStatus === QCStatus.OK
        ? QCStatus.OK
        : QCStatus.NOT_OK;

    const remarks =
      inspectorRemarks !== undefined && inspectorRemarks !== null
        ? String(inspectorRemarks)
        : '';

    // Remarks invariant: required if Overall Status is NOT_OK
    if (overallStatus === QCStatus.NOT_OK && !remarks.trim()) {
      throw new BadRequestException('Inspector Remarks required when Overall Status is Not OK');
    }

    return {
      moduleType: InspectionModuleType.HEAT_TREATMENT,
      numBhn,
      numYs,
      numUts,
      numE,
      hardnessStatus,
      mechanicalStatus,
      overallStatus,
      inspectorRemarks: remarks,
      moduleData: input.moduleData || {},
      evaluationSummary: {
        hardness: { value: numBhn, threshold: '>= 80.00', status: hardnessStatus },
        yieldStrength: { value: numYs, threshold: '>= 220.00 MPa', status: numYs >= 220.0 ? QCStatus.OK : QCStatus.NOT_OK },
        tensileStrength: { value: numUts, threshold: '>= 280.00 MPa', status: numUts >= 280.0 ? QCStatus.OK : QCStatus.NOT_OK },
        elongation: { value: numE, threshold: '>= 1.00%', status: numE >= 1.0 ? QCStatus.OK : QCStatus.NOT_OK },
      },
    };
  }

  // 2. LINE INSPECTION CALCULATION ENGINE
  calculateLineInspection(input: CalculationInput): CalculationResult {
    const mData = input.moduleData || {};
    const visualCheck = String(mData.visualCheck || 'PASS').toUpperCase();
    const torqueNm = Number(mData.torqueNm ?? 45.0);
    const dimensionDeviationMm = Number(mData.dimensionDeviationMm ?? 0.0);
    const defectCount = Number(mData.defectCount ?? 0);
    const lineId = String(mData.lineId || 'Line-01');
    const shift = String(mData.shift || 'Shift-A');

    if (!Number.isFinite(torqueNm) || !Number.isFinite(dimensionDeviationMm) || !Number.isFinite(defectCount)) {
      throw new BadRequestException('Torque, dimension deviation, and defect count must be valid numbers');
    }

    if (torqueNm < 0 || defectCount < 0) {
      throw new BadRequestException('Torque and defect count cannot be negative');
    }

    // Rules:
    // Visual Check: PASS -> OK
    const visualStatus = visualCheck === 'PASS' ? QCStatus.OK : QCStatus.NOT_OK;
    // Torque Tolerance: 40.0 - 50.0 Nm
    const torqueStatus = torqueNm >= 40.0 && torqueNm <= 50.0 ? QCStatus.OK : QCStatus.NOT_OK;
    // Dimension Tolerance: |deviation| <= 0.05 mm
    const dimensionStatus = Math.abs(dimensionDeviationMm) <= 0.05 ? QCStatus.OK : QCStatus.NOT_OK;
    // Defect Count: 0 -> OK, > 0 -> NOT_OK
    const defectStatus = defectCount === 0 ? QCStatus.OK : QCStatus.NOT_OK;

    const overallStatus =
      visualStatus === QCStatus.OK &&
      torqueStatus === QCStatus.OK &&
      dimensionStatus === QCStatus.OK &&
      defectStatus === QCStatus.OK
        ? QCStatus.OK
        : QCStatus.NOT_OK;

    const remarks =
      input.inspectorRemarks !== undefined && input.inspectorRemarks !== null
        ? String(input.inspectorRemarks)
        : '';

    if (overallStatus === QCStatus.NOT_OK && !remarks.trim()) {
      throw new BadRequestException('Inspector Remarks required when Line Inspection Status is Not OK');
    }

    return {
      moduleType: InspectionModuleType.LINE_INSPECTION,
      numBhn: 0,
      numYs: 0,
      numUts: 0,
      numE: 0,
      hardnessStatus: visualStatus,
      mechanicalStatus: torqueStatus,
      overallStatus,
      inspectorRemarks: remarks,
      moduleData: {
        lineId,
        shift,
        visualCheck,
        torqueNm,
        dimensionDeviationMm,
        defectCount,
      },
      evaluationSummary: {
        visualCheck: { value: visualCheck, target: 'PASS', status: visualStatus },
        torque: { value: torqueNm, unit: 'Nm', target: '40.0 - 50.0 Nm', status: torqueStatus },
        dimensionalDeviation: { value: dimensionDeviationMm, unit: 'mm', target: '<= 0.05 mm', status: dimensionStatus },
        defectCount: { value: defectCount, target: '0 defects', status: defectStatus },
      },
    };
  }
}
