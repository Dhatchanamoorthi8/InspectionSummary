export type InspectionModuleType = 'HEAT_TREATMENT' | 'LINE_INSPECTION';

export interface InspectionModuleDefinition {
  type: InspectionModuleType;
  name: string;
  shortCode: string;
  category: string;
  description: string;
  requiredPermission: string;
}

export interface LineInspectionData {
  lineId: string;
  shift: string;
  stationId?: string;
  supervisor?: string;
  visualCheck: 'PASS' | 'FAIL';
  torqueNm: number;
  dimensionDeviationMm: number;
  defectCount: number;
  inspectorRemarks?: string;
}

export interface LineInspectionEvaluation {
  visualStatus: 'OK' | 'NOT_OK';
  torqueStatus: 'OK' | 'NOT_OK';
  dimensionStatus: 'OK' | 'NOT_OK';
  defectStatus: 'OK' | 'NOT_OK';
  overallStatus: 'OK' | 'NOT_OK';
}

