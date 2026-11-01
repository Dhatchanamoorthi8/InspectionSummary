import { InspectionModuleDefinition, InspectionModuleType, LineInspectionData, LineInspectionEvaluation } from './types';

export const INSPECTION_MODULES: Record<InspectionModuleType, InspectionModuleDefinition> = {
  HEAT_TREATMENT: {
    type: 'HEAT_TREATMENT',
    name: 'Heat Treatment Inspection',
    shortCode: 'HTI',
    category: 'Metallurgical Quality',
    description: 'Brinell hardness (BHN), yield strength (YS), ultimate tensile strength (UTS), and elongation testing.',
    requiredPermission: 'INSPECT_HEAT_TREATMENT',
  },
  LINE_INSPECTION: {
    type: 'LINE_INSPECTION',
    name: 'Line Assembly Inspection',
    shortCode: 'LAI',
    category: 'Production Line QC',
    description: 'Station visual check, bolt tightening torque verification, dimensional deviation tolerance, and inline defect counting.',
    requiredPermission: 'INSPECT_LINE',
  },
};

export function getModuleDefinition(type?: string): InspectionModuleDefinition {
  if (type === 'LINE_INSPECTION') {
    return INSPECTION_MODULES.LINE_INSPECTION;
  }
  return INSPECTION_MODULES.HEAT_TREATMENT;
}

export function evaluateLineInspection(data: Partial<LineInspectionData>): LineInspectionEvaluation {
  const visualStatus = data.visualCheck === 'PASS' ? 'OK' : 'NOT_OK';
  
  const torque = Number(data.torqueNm ?? 0);
  const torqueStatus = (torque >= 40.0 && torque <= 50.0) ? 'OK' : 'NOT_OK';

  const dev = Math.abs(Number(data.dimensionDeviationMm ?? 0));
  const dimensionStatus = dev <= 0.05 ? 'OK' : 'NOT_OK';

  const defects = Number(data.defectCount ?? 0);
  const defectStatus = defects === 0 ? 'OK' : 'NOT_OK';

  const overallStatus =
    visualStatus === 'OK' &&
    torqueStatus === 'OK' &&
    dimensionStatus === 'OK' &&
    defectStatus === 'OK'
      ? 'OK'
      : 'NOT_OK';

  return {
    visualStatus,
    torqueStatus,
    dimensionStatus,
    defectStatus,
    overallStatus,
  };
}

