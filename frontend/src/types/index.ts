export type UserRole = 'PRODUCTION_ENGINEER' | 'QUALITY_INSPECTOR';

export type RequestStatus =
  | 'Draft'
  | 'Assigned'
  | 'In Progress'
  | 'Completed'
  | 'Cancelled';

export type QCStatus = 'OK' | 'NOT_OK';

export interface User {
  id: string;
  username: string;
  fullName: string;
  role: UserRole;
  isActive: boolean;
  canManageUsers: boolean;
  signatureData?: string | null;
  customPermissions?: string[];
  effectivePermissions?: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface SystemPermission {
  id: string;
  name: string;
  description?: string | null;
  category: string;
  isSystem: boolean;
  createdAt?: string;
}

export interface PartMaster {
  id: string;
  partName: string;
  partNumber: string;
  isActive: boolean;
  createdAt?: string;
}

export interface AssignmentHistoryItem {
  id: string;
  requestId: string;
  assignedInspectorId: string;
  assignedInspectorName: string;
  assignedBy: string;
  assignedAt: string;
  reason: string;
}

export interface ReportRevision {
  id: string;
  reportId: string;
  revisionNumber: number;
  revisedBy: string;
  reason: string;
  previousSnapshot: any;
  createdAt: string;
}

export interface InspectionReport {
  id: string;
  requestId: string;
  requestNumber: string;
  partName: string;
  partNumber: string;
  moduleType?: string;
  moduleData?: Record<string, any> | null;
  evaluationSummary?: Record<string, any> | null;
  reportDate: string;
  heatBatchNumber: string;
  furnace: string;
  autoReport: string;
  sampleBatchDate: string;
  bhn: number;
  ys: number;
  uts: number;
  elongation: number;
  hardnessStatus: QCStatus;
  mechanicalStatus: QCStatus;
  overallStatus: QCStatus;
  inspectorRemarks?: string;
  inspectorId: string;
  inspectorName: string;
  inspectorSignatureSnapshot: string;
  submissionTimestamp: string;
  revisions?: ReportRevision[];
  createdAt?: string;
}

export interface InspectionRequest {
  id: string;
  requestNumber: string;
  date: string;
  shift?: string;
  moduleType?: string;
  moduleMetadata?: Record<string, any> | null;
  partId: string;
  partName: string;
  partNumber: string;
  assignedInspectorId: string | null;
  assignedInspectorName: string | null;
  status: RequestStatus;
  remarks: string;
  createdBy: string;
  createdAt: string;
  assignmentHistory?: AssignmentHistoryItem[];
  report?: InspectionReport | null;
}

export interface DomainThroughput {
  totalAssignedQty: number;
  completedDoneQty: number;
  pendingBalanceQty: number;
  inProgressQty: number;
  draftQty?: number;
  completionRatePercent: number;
}

export interface DomainQualityGate {
  testedQty: number;
  passOkQty: number;
  failNotOkQty: number;
  passRatePercent: number;
}

export interface DomainOverallQuality {
  totalEvaluated: number;
  overallOk: number;
  overallNotOk: number;
  firstPassYieldPercent: number;
}

export interface RunChartPoint {
  index: number;
  requestId: string;
  requestNumber: string;
  date: string;
  shift?: string;
  reportDate: string;
  heatBatchNumber: string;
  partName: string;
  partNumber: string;
  bhn: number;
  ys: number;
  uts: number;
  elongation: number;
  hardnessStatus: QCStatus;
  mechanicalStatus: QCStatus;
  overallStatus: QCStatus;
}

export interface ProductionDashboardData {
  kpi: {
    totalRequests: number;
    draft: number;
    assigned: number;
    inProgress: number;
    completed: number;
    pending: number;
    notOkReports: number;
    throughput?: DomainThroughput;
    heatTreatment?: DomainQualityGate;
    tensile?: DomainQualityGate;
    overallQuality?: DomainOverallQuality;
  };
  requestsByStatus: { status: string; count: number }[];
  distribution: { name: string; count: number }[];
  last5Completed: {
    requestId: string;
    requestNumber: string;
    date: string;
    partName: string;
    partNumber: string;
    assignedInspector: string;
    overallStatus: string;
  }[];
  runChartData?: RunChartPoint[];
  availablePartNumbers?: string[];
}

export interface InspectorDashboardData {
  kpi: {
    totalAssigned: number;
    pending: number;
    inProgress: number;
    completed: number;
    notOkReports: number;
    throughput?: DomainThroughput;
    heatTreatment?: DomainQualityGate;
    tensile?: DomainQualityGate;
    overallQuality?: DomainOverallQuality;
  };
  requestsByStatus: { status: string; count: number }[];
  distribution: { name: string; count: number }[];
  recentAssignedTasks: InspectionRequest[];
  nextPendingTask: InspectionRequest | null;
  runChartData?: RunChartPoint[];
  availablePartNumbers?: string[];
}

export interface AuditLog {
  id: string;
  timestamp: string;
  userId: string;
  username: string;
  action: string;
  entityType: string;
  entityId: string;
  previousValue: any;
  newValue: any;
}

export interface HeatTreatmentSummaryRow {
  partName: string;
  partNumbers: string[];
  noOfReceivedBatch: number;
  noOfQaReceivedBatch: number;
  gap: number;
  hardnessQty: {
    completed: number;
    balance: number;
  };
  hardnessStatus: 'OK' | 'NOT_OK' | 'PENDING';
  tensileQty: {
    completed: number;
    balance: number;
  };
  tensileStatus: 'OK' | 'NOT_OK' | 'PENDING';
  overallStatus: 'OK' | 'NOT_OK' | 'PENDING';
  totalRequests: number;
  completedCount: number;
}

export interface HeatTreatmentSummaryData {
  title: string;
  generatedAt: string;
  rows: HeatTreatmentSummaryRow[];
  totals: {
    noOfReceivedBatch: number;
    noOfQaReceivedBatch: number;
    gap: number;
    hardnessQty: { completed: number; balance: number };
    tensileQty: { completed: number; balance: number };
    totalRequests: number;
    completedCount: number;
  };
}
