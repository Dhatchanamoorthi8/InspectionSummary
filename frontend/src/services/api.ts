import axios from 'axios';
import {
  User,
  SystemPermission,
  PartMaster,
  InspectionRequest,
  InspectionReport,
  HeatTreatmentSummaryData,
  ProductionDashboardData,
  InspectorDashboardData,
  AuditLog,
} from '../types';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Don't auto-redirect if already on login page
      if (window.location.pathname !== '/login') {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  },
);

export const authApi = {
  login: async (username: string, password: string) => {
    const res = await api.post<{ token: string; user: User }>('/auth/login', {
      username,
      password,
    });
    return res.data;
  },
  logout: async () => {
    try {
      await api.post('/auth/logout');
    } finally {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
  },
  getMe: async () => {
    const res = await api.get<{ user: User }>('/auth/me');
    return res.data.user;
  },
};

export const usersApi = {
  getInspectors: async () => {
    const res = await api.get<User[]>('/users/inspectors');
    return res.data;
  },
  getUsers: async () => {
    const res = await api.get<User[]>('/users');
    return res.data;
  },
  createUser: async (user: {
    username: string;
    fullName: string;
    password?: string;
    role: string;
    canManageUsers?: boolean;
    isActive?: boolean;
  }) => {
    const res = await api.post<User>('/users', user);
    return res.data;
  },
  updateUser: async (id: string, updates: Partial<User> & { password?: string }) => {
    const res = await api.put<User>(`/users/${id}`, updates);
    return res.data;
  },
  updateSignature: async (id: string, signatureData: string) => {
    const res = await api.put<{ success: boolean; signatureData: string }>(
      `/users/${id}/signature`,
      { signatureData },
    );
    return res.data;
  },
  deleteUser: async (id: string) => {
    const res = await api.delete<{ success: boolean; message: string }>(`/users/${id}`);
    return res.data;
  },
  getPermissions: async () => {
    const res = await api.get<SystemPermission[]>('/users/permissions');
    return res.data;
  },
  createPermission: async (payload: { id: string; name: string; description?: string; category?: string }) => {
    const res = await api.post<SystemPermission>('/users/permissions', payload);
    return res.data;
  },
  updateUserPermissions: async (id: string, permissions: string[]) => {
    const res = await api.put<{
      success: boolean;
      id: string;
      username: string;
      customPermissions: string[];
      effectivePermissions: string[];
    }>(`/users/${id}/permissions`, { permissions });
    return res.data;
  },
};

export const partsApi = {
  getParts: async (search?: string) => {
    const res = await api.get<PartMaster[]>('/parts', { params: { search } });
    return res.data;
  },
  getPartNames: async () => {
    const res = await api.get<string[]>('/parts/names');
    return res.data;
  },
  getPartNumbers: async (partName?: string) => {
    const res = await api.get<string[]>('/parts/numbers', {
      params: { partName },
    });
    return res.data;
  },
  createPart: async (partName: string, partNumber: string) => {
    const res = await api.post<PartMaster>('/parts', { partName, partNumber });
    return res.data;
  },
  activatePart: async (id: string) => {
    const res = await api.post<{ success: boolean; message: string }>(`/parts/${id}/activate`);
    return res.data;
  },
  deletePart: async (id: string, permanent: boolean = true) => {
    const res = await api.delete<{ success: boolean }>(`/parts/${id}`, {
      params: { permanent },
    });
    return res.data;
  },
  previewImport: async (rows: { partName: string; partNumber: string }[]) => {
    const res = await api.post<{
      totalRows: number;
      validRows: { partName: string; partNumber: string }[];
      invalidRows: { row: number; partName: string; partNumber: string; error: string }[];
    }>('/parts/import/preview', { rows });
    return res.data;
  },
  commitImport: async (validRows: { partName: string; partNumber: string }[]) => {
    const res = await api.post<{
      importedCount: number;
      insertedParts: PartMaster[];
    }>('/parts/import/commit', { validRows });
    return res.data;
  },
};

export const requestsApi = {
  getRequests: async (filters?: {
    status?: string;
    partName?: string;
    inspectorId?: string;
    reportResult?: string;
    hardnessStatus?: string;
    mechanicalStatus?: string;
    shift?: string;
  }) => {
    const res = await api.get<InspectionRequest[]>('/requests', {
      params: filters,
    });
    return res.data;
  },
  getRequestById: async (id: string) => {
    const res = await api.get<InspectionRequest>(`/requests/${id}`);
    return res.data;
  },
  createRequest: async (data: {
    partName: string;
    partNumber: string;
    shift?: string;
    assignedInspectorId?: string;
    remarks?: string;
    moduleType?: string;
    moduleMetadata?: any;
  }) => {
    const res = await api.post<InspectionRequest>('/requests', data);
    return res.data;
  },
  deleteRequest: async (id: string) => {
    const res = await api.delete<{ success: boolean; message: string }>(`/requests/${id}`);
    return res.data;
  },
  assignRequest: async (id: string, inspectorId: string, reason?: string) => {
    const res = await api.patch<InspectionRequest>(`/requests/${id}/assign`, {
      inspectorId,
      reason,
    });
    return res.data;
  },
  reassignInspector: async (
    id: string,
    data: { newInspectorId: string; reason?: string },
  ) => {
    const res = await api.patch<InspectionRequest>(`/requests/${id}/assign`, {
      inspectorId: data.newInspectorId,
      reason: data.reason,
    });
    return res.data;
  },
  startInspection: async (id: string) => {
    const res = await api.patch<InspectionRequest>(`/requests/${id}/start`);
    return res.data;
  },
  cancelRequest: async (id: string) => {
    const res = await api.patch<InspectionRequest>(`/requests/${id}/cancel`);
    return res.data;
  },
};

export const reportsApi = {
  getSummary: async (filters?: { startDate?: string; endDate?: string; partName?: string }) => {
    const res = await api.get<HeatTreatmentSummaryData>('/reports/summary', { params: filters });
    return res.data;
  },
  submitReport: async (data: {
    requestId: string;
    reportDate?: string;
    heatBatchNumber?: string;
    furnace?: string;
    autoReport?: string;
    sampleBatchDate?: string;
    bhn?: number;
    ys?: number;
    uts?: number;
    elongation?: number;
    inspectorRemarks?: string;
    moduleType?: string;
    moduleData?: any;
    [key: string]: any;
  }) => {
    const res = await api.post<InspectionReport>('/reports', data);
    return res.data;
  },
  deleteReport: async (id: string, reason?: string) => {
    const res = await api.delete<{ success: boolean; message: string }>(`/reports/${id}`, {
      data: { reason },
    });
    return res.data;
  },
  getReportById: async (id: string) => {
    const res = await api.get<InspectionReport>(`/reports/${id}`);
    return res.data;
  },
  createRevision: async (
    id: string,
    data: {
      reason: string;
      bhn?: number;
      ys?: number;
      uts?: number;
      elongation?: number;
      inspectorRemarks?: string;
    },
  ) => {
    const res = await api.post<InspectionReport>(`/reports/${id}/revision`, data);
    return res.data;
  },
  downloadPdf: async (id: string, requestNumber: string) => {
    const res = await api.get(`/reports/${id}/pdf`, {
      responseType: 'blob',
    });
    const blob = new Blob([res.data], { type: 'application/pdf' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `report_${requestNumber}.pdf`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },
};

export const dashboardApi = {
  getProductionDashboard: async (params?: {
    partName?: string;
    fromDate?: string;
    toDate?: string;
  }) => {
    const res = await api.get<ProductionDashboardData>('/dashboard/production', {
      params,
    });
    return res.data;
  },
  getInspectorDashboard: async (params?: {
    partName?: string;
    fromDate?: string;
    toDate?: string;
  }) => {
    const res = await api.get<InspectorDashboardData>('/dashboard/inspector', {
      params,
    });
    return res.data;
  },
};

export const auditApi = {
  getAuditLogs: async (filters?: {
    entityType?: string;
    entityId?: string;
    userId?: string;
  }) => {
    const res = await api.get<AuditLog[]>('/audit-logs', { params: filters });
    return res.data;
  },
};

export default api;
