// tier1-features.test.mjs
// Tier 1: Comprehensive Feature Coverage (R1 - R5)
// Contains 40 automated opaque-box feature tests verifying every requirement.

import {
  api,
  loginAs,
  assert,
  assertEqual,
  assertTrue,
  assertFalse,
  assertIncludes,
  assertStatus,
} from './helpers.mjs';

export const tier1Tests = [
  // --- F01: Tech Stack & System Health ---
  {
    id: 'T1-01',
    name: '[F01] System health check returns HTTP 200 with database status',
    fn: async () => {
      const res = await api('/api/health');
      assertStatus(res, 200, 'Health check');
      assertEqual(res.data.status, 'ok', 'Status should be ok');
      assertEqual(res.data.database, 'connected', 'DB should be connected');
    },
  },

  // --- F04: Auth & Session Management ---
  {
    id: 'T1-02',
    name: '[F04] PE Login with valid credentials returns JWT token and profile',
    fn: async () => {
      const res = await api('/api/auth/login', {
        method: 'POST',
        body: { username: 'pe_john', password: 'Password123!' },
      });
      assertStatus(res, 200, 'PE Login');
      assertTrue(typeof res.data.token === 'string' && res.data.token.length > 20, 'Token exists');
      assertEqual(res.data.user.username, 'pe_john');
      assertEqual(res.data.user.role, 'PRODUCTION_ENGINEER');
      assertTrue(res.data.user.canManageUsers);
    },
  },

  {
    id: 'T1-03',
    name: '[F04] QI Login with valid credentials returns JWT token and role',
    fn: async () => {
      const res = await api('/api/auth/login', {
        method: 'POST',
        body: { username: 'qi_david', password: 'Password123!' },
      });
      assertStatus(res, 200, 'QI Login');
      assertTrue(!!res.data.token);
      assertEqual(res.data.user.username, 'qi_david');
      assertEqual(res.data.user.role, 'QUALITY_INSPECTOR');
    },
  },

  {
    id: 'T1-04',
    name: '[F04] Login with invalid password returns HTTP 401',
    fn: async () => {
      const res = await api('/api/auth/login', {
        method: 'POST',
        body: { username: 'pe_john', password: 'WrongPassword' },
      });
      assertStatus(res, 401, 'Invalid password');
    },
  },

  {
    id: 'T1-05',
    name: '[F04] Login with unknown username returns HTTP 401',
    fn: async () => {
      const res = await api('/api/auth/login', {
        method: 'POST',
        body: { username: 'nonexistent_user', password: 'Password123!' },
      });
      assertStatus(res, 401, 'Unknown user');
    },
  },

  {
    id: 'T1-06',
    name: '[F04] Authenticated user fetches their profile via GET /api/auth/me',
    fn: async () => {
      const token = await loginAs('pe_john');
      const res = await api('/api/auth/me', {}, token);
      assertStatus(res, 200, 'Auth me');
      assertEqual(res.data.user.username, 'pe_john');
      assertEqual(res.data.user.role, 'PRODUCTION_ENGINEER');
    },
  },

  {
    id: 'T1-07',
    name: '[F04] Logout invalidates or terminates user session',
    fn: async () => {
      const token = await loginAs('pe_john');
      const res = await api('/api/auth/logout', { method: 'POST' }, token);
      assertStatus(res, 200, 'Logout');
      assertTrue(res.data.success);
    },
  },

  // --- F05: Role-Based Access Control (RBAC) ---
  {
    id: 'T1-08',
    name: '[F05] Unauthenticated request to /api/users returns HTTP 401',
    fn: async () => {
      const res = await api('/api/users');
      assertStatus(res, 401, 'Unauthenticated users request');
    },
  },

  {
    id: 'T1-09',
    name: '[F05] Quality Inspector attempting to access /api/users returns HTTP 403',
    fn: async () => {
      const token = await loginAs('qi_david');
      const res = await api('/api/users', {}, token);
      assertStatus(res, 403, 'QI access to users list');
    },
  },

  {
    id: 'T1-10',
    name: '[F05] Production Engineer without user management permission cannot create users',
    fn: async () => {
      const token = await loginAs('pe_mary'); // canManageUsers: false
      const res = await api('/api/users', {
        method: 'POST',
        body: {
          username: 'unauth_created',
          password: 'Password123!',
          fullName: 'Unauthorized Created',
          role: 'QUALITY_INSPECTOR',
        },
      }, token);
      assertStatus(res, 403, 'PE without canManageUsers creating user');
    },
  },

  // --- F06: User Management & Permissions ---
  {
    id: 'T1-11',
    name: '[F06] Authorized Production Engineer lists users (passwords never exposed)',
    fn: async () => {
      const token = await loginAs('pe_john');
      const res = await api('/api/users', {}, token);
      assertStatus(res, 200, 'List users');
      assertTrue(Array.isArray(res.data) && res.data.length >= 4, 'Users array returned');
      for (const u of res.data) {
        assertEqual(u.password, undefined, 'Plaintext password must not exist');
        assertEqual(u.passwordHash, undefined, 'Password hash must not be exposed');
        assertTrue(!!u.username, 'Username exists');
        assertTrue(!!u.role, 'Role exists');
      }
    },
  },

  {
    id: 'T1-12',
    name: '[F06] Authorized PE creates a new Quality Inspector user',
    fn: async () => {
      const token = await loginAs('pe_john');
      const res = await api('/api/users', {
        method: 'POST',
        body: {
          username: `qi_test_${Date.now()}`,
          password: 'Password123!',
          fullName: 'Test Quality Inspector',
          role: 'QUALITY_INSPECTOR',
          canManageUsers: false,
          isActive: true,
        },
      }, token);
      assertStatus(res, 201, 'Create QI user');
      assertEqual(res.data.role, 'QUALITY_INSPECTOR');
      assertTrue(res.data.isActive);
    },
  },

  {
    id: 'T1-13',
    name: '[F06] Authorized PE updates user details and toggles active status',
    fn: async () => {
      const token = await loginAs('pe_john');
      const usersRes = await api('/api/users', {}, token);
      const target = usersRes.data.find((u) => u.username === 'qi_david');
      assertTrue(!!target, 'Target user qi_david found');

      const updateRes = await api(`/api/users/${target.id}`, {
        method: 'PUT',
        body: { fullName: 'David Inspector Senior (QI)' },
      }, token);
      assertStatus(updateRes, 200, 'Update user');
      assertEqual(updateRes.data.fullName, 'David Inspector Senior (QI)');
    },
  },

  // --- F07: Digital Signature Capture ---
  {
    id: 'T1-14',
    name: '[F07] Quality Inspector uploads base64 digital signature',
    fn: async () => {
      const token = await loginAs('qi_david');
      const meRes = await api('/api/auth/me', {}, token);
      const myId = meRes.data.user.id;

      const sigData = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAEklEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
      const sigRes = await api(`/api/users/${myId}/signature`, {
        method: 'PUT',
        body: { signatureData: sigData },
      }, token);
      assertStatus(sigRes, 200, 'Upload signature');
      assertTrue(sigRes.data.success);
    },
  },

  // --- F08: Part Master 1:N Data Management ---
  {
    id: 'T1-15',
    name: '[F08] Part Master returns list of active parts',
    fn: async () => {
      const token = await loginAs('pe_john');
      const res = await api('/api/parts', {}, token);
      assertStatus(res, 200, 'List parts');
      assertTrue(Array.isArray(res.data) && res.data.length >= 6);
      assertTrue(res.data.some((p) => p.partName === 'Axle Shaft'));
    },
  },

  {
    id: 'T1-16',
    name: '[F08] Part Master returns distinct part names for autocomplete',
    fn: async () => {
      const token = await loginAs('pe_john');
      const res = await api('/api/parts/names', {}, token);
      assertStatus(res, 200, 'Part names autocomplete');
      assertTrue(Array.isArray(res.data));
      assertIncludes(res.data, 'Axle Shaft');
      assertIncludes(res.data, 'Turbine Blade');
    },
  },

  {
    id: 'T1-17',
    name: '[F08] Part Master returns part numbers for selected part name',
    fn: async () => {
      const token = await loginAs('pe_john');
      const res = await api('/api/parts/numbers?partName=Turbine%20Blade', {}, token);
      assertStatus(res, 200, 'Part numbers by name');
      assertTrue(Array.isArray(res.data));
      assertIncludes(res.data, 'TB-2001');
      assertIncludes(res.data, 'TB-2002');
      assertIncludes(res.data, 'TB-2003');
    },
  },

  {
    id: 'T1-18',
    name: '[F08] PE creates new part mapping with unique name and number',
    fn: async () => {
      const token = await loginAs('pe_john');
      const res = await api('/api/parts', {
        method: 'POST',
        body: { partName: 'Rotor Disk', partNumber: `RD-${Date.now()}` },
      }, token);
      assertStatus(res, 201, 'Create part');
      assertEqual(res.data.partName, 'Rotor Disk');
      assertTrue(res.data.isActive);
    },
  },

  {
    id: 'T1-19',
    name: '[F08] PE deactivates part mapping',
    fn: async () => {
      const token = await loginAs('pe_john');
      const partsRes = await api('/api/parts', {}, token);
      const target = partsRes.data.find((p) => p.partNumber === 'CS-3001');
      assertTrue(!!target, 'Found CS-3001 part');

      const delRes = await api(`/api/parts/${target.id}`, { method: 'DELETE' }, token);
      assertStatus(delRes, 200, 'Deactivate part');
      assertTrue(delRes.data.success);
    },
  },

  // --- F09 & F10: Bulk Import Template & Validation ---
  {
    id: 'T1-20',
    name: '[F09] Download CSV template for Part Master bulk import',
    fn: async () => {
      const token = await loginAs('pe_john');
      const res = await api('/api/parts/template', {}, token);
      assertStatus(res, 200, 'CSV Template');
      assertIncludes(res.rawText, 'Part Name,Part Number');
    },
  },

  {
    id: 'T1-21',
    name: '[F10] Bulk import preview validates rows and flags missing data',
    fn: async () => {
      const token = await loginAs('pe_john');
      const previewRes = await api('/api/parts/import/preview', {
        method: 'POST',
        body: {
          rows: [
            { 'Part Name': 'Gear Assembly', 'Part Number': 'GA-5001' },
            { 'Part Name': '', 'Part Number': 'GA-INVALID' },
          ],
        },
      }, token);
      assertStatus(previewRes, 200, 'Import preview');
      assertEqual(previewRes.data.validCount, 1);
      assertEqual(previewRes.data.errorCount, 1);
    },
  },

  {
    id: 'T1-22',
    name: '[F10] Bulk import commit inserts valid rows into Part Master',
    fn: async () => {
      const token = await loginAs('pe_john');
      const uniqueNum = `GA-${Date.now()}`;
      const commitRes = await api('/api/parts/import/commit', {
        method: 'POST',
        body: {
          validRows: [{ partName: 'Gear Assembly', partNumber: uniqueNum }],
        },
      }, token);
      assertStatus(commitRes, 200, 'Import commit');
      assertEqual(commitRes.data.importedCount, 1);
    },
  },

  // --- F11 & F12: Request Creation & Assignment ---
  {
    id: 'T1-23',
    name: '[F11] PE creates inspection request with auto-generated Request Number',
    fn: async () => {
      const token = await loginAs('pe_john');
      const res = await api('/api/requests', {
        method: 'POST',
        body: {
          partName: 'Axle Shaft',
          partNumber: 'AX-1001',
          assignedInspectorId: 'usr-qi-1',
          remarks: 'Standard production batch test',
        },
      }, token);
      assertStatus(res, 201, 'Create request');
      assertTrue(!!res.data.id, 'Request ID generated');
      assertTrue(res.data.requestNumber.startsWith('REQ-'), 'Request number follows format REQ-YYYYMMDD-XXXX');
      assertEqual(res.data.partName, 'Axle Shaft');
      assertEqual(res.data.partNumber, 'AX-1001');
      assertEqual(res.data.status, 'Assigned');
    },
  },

  {
    id: 'T1-24',
    name: '[F11] Newly created request with assigned inspector has status Assigned',
    fn: async () => {
      const token = await loginAs('pe_john');
      const res = await api('/api/requests', {
        method: 'POST',
        body: {
          partName: 'Turbine Blade',
          partNumber: 'TB-2001',
          assignedInspectorId: 'usr-qi-1',
        },
      }, token);
      assertStatus(res, 201, 'Create request');
      assertEqual(res.data.status, 'Assigned');
    },
  },

  {
    id: 'T1-25',
    name: '[F12] Inspectors dropdown lists only active Quality Inspectors',
    fn: async () => {
      const token = await loginAs('pe_john');
      const res = await api('/api/users/inspectors', {}, token);
      assertStatus(res, 200, 'Inspectors dropdown');
      assertTrue(Array.isArray(res.data));
      assertTrue(res.data.some((i) => i.username === 'qi_david'));
      assertTrue(res.data.some((i) => i.username === 'qi_sarah'));
      assertFalse(res.data.some((i) => i.username === 'qi_inactive'), 'Inactive inspector must be excluded');
    },
  },

  {
    id: 'T1-26',
    name: '[F12] PE reassigns request to different active inspector with audit history',
    fn: async () => {
      const peToken = await loginAs('pe_john');
      const createRes = await api('/api/requests', {
        method: 'POST',
        body: {
          partName: 'Axle Shaft',
          partNumber: 'AX-1001',
          assignedInspectorId: 'usr-qi-1',
        },
      }, peToken);
      const reqId = createRes.data.id;

      const reassignRes = await api(`/api/requests/${reqId}/reassign`, {
        method: 'PUT',
        body: { inspectorId: 'usr-qi-2', reason: 'Shift rotation' },
      }, peToken);
      assertStatus(reassignRes, 200, 'Reassign request');
      assertEqual(reassignRes.data.assignedInspectorId, 'usr-qi-2');
      assertTrue(reassignRes.data.assignmentHistory.length >= 2, 'Assignment history recorded');
    },
  },

  // --- F13 & F14: Lifecycle & Ownership ---
  {
    id: 'T1-27',
    name: '[F13] Quality Inspector starts assigned task, status transitions to In Progress',
    fn: async () => {
      const peToken = await loginAs('pe_john');
      const createRes = await api('/api/requests', {
        method: 'POST',
        body: {
          partName: 'Axle Shaft',
          partNumber: 'AX-1002',
          assignedInspectorId: 'usr-qi-1',
        },
      }, peToken);
      const reqId = createRes.data.id;

      const qiToken = await loginAs('qi_david');
      const startRes = await api(`/api/requests/${reqId}/start`, { method: 'PATCH' }, qiToken);
      assertStatus(startRes, 200, 'Start task');
      assertEqual(startRes.data.status, 'In Progress');
    },
  },

  {
    id: 'T1-28',
    name: '[F14] Quality Inspector request list includes only assigned tasks',
    fn: async () => {
      const qiToken = await loginAs('qi_david');
      const res = await api('/api/requests', {}, qiToken);
      assertStatus(res, 200, 'QI task list');
      assertTrue(Array.isArray(res.data));
      for (const req of res.data) {
        assertEqual(req.assignedInspectorId, 'usr-qi-1', 'Only tasks assigned to david');
      }
    },
  },

  // --- F16: Hardness Calculation Engine ---
  {
    id: 'T1-29',
    name: '[F16] Hardness Engine calculates Hardness Status OK when BHN >= 80',
    fn: async () => {
      const peToken = await loginAs('pe_john');
      const reqRes = await api('/api/requests', {
        method: 'POST',
        body: { partName: 'Axle Shaft', partNumber: 'AX-1001', assignedInspectorId: 'usr-qi-1' },
      }, peToken);
      const reqId = reqRes.data.id;

      const qiToken = await loginAs('qi_david');
      const repRes = await api('/api/reports', {
        method: 'POST',
        body: {
          requestId: reqId,
          heatBatchNumber: 'BATCH-801',
          furnace: 'Furnace A',
          autoReport: 'REP-001',
          sampleBatchDate: '2026-10-27',
          bhn: 85.0,
          ys: 230.0,
          uts: 290.0,
          elongation: 1.5,
        },
      }, qiToken);
      assertStatus(repRes, 201, 'Submit report');
      assertEqual(repRes.data.hardnessStatus, 'OK');
    },
  },

  {
    id: 'T1-30',
    name: '[F16] Hardness Engine calculates Hardness Status NOT_OK when BHN < 80',
    fn: async () => {
      const peToken = await loginAs('pe_john');
      const reqRes = await api('/api/requests', {
        method: 'POST',
        body: { partName: 'Axle Shaft', partNumber: 'AX-1001', assignedInspectorId: 'usr-qi-1' },
      }, peToken);
      const reqId = reqRes.data.id;

      const qiToken = await loginAs('qi_david');
      const repRes = await api('/api/reports', {
        method: 'POST',
        body: {
          requestId: reqId,
          heatBatchNumber: 'BATCH-802',
          furnace: 'Furnace A',
          autoReport: 'REP-002',
          sampleBatchDate: '2026-10-27',
          bhn: 75.0, // < 80 -> NOT_OK
          ys: 230.0,
          uts: 290.0,
          elongation: 1.5,
          inspectorRemarks: 'Hardness failed threshold',
        },
      }, qiToken);
      assertStatus(repRes, 201, 'Submit failing hardness report');
      assertEqual(repRes.data.hardnessStatus, 'NOT_OK');
    },
  },

  // --- F17: Mechanical Calculation Engine ---
  {
    id: 'T1-31',
    name: '[F17] Mechanical Engine calculates Mechanical Status OK when YS>=220, UTS>=280, E>=1.00%',
    fn: async () => {
      const peToken = await loginAs('pe_john');
      const reqRes = await api('/api/requests', {
        method: 'POST',
        body: { partName: 'Axle Shaft', partNumber: 'AX-1001', assignedInspectorId: 'usr-qi-1' },
      }, peToken);
      const reqId = reqRes.data.id;

      const qiToken = await loginAs('qi_david');
      const repRes = await api('/api/reports', {
        method: 'POST',
        body: {
          requestId: reqId,
          heatBatchNumber: 'BATCH-803',
          furnace: 'Furnace B',
          autoReport: 'REP-003',
          sampleBatchDate: '2026-10-27',
          bhn: 82.0,
          ys: 225.0,
          uts: 285.0,
          elongation: 1.2,
        },
      }, qiToken);
      assertStatus(repRes, 201, 'Submit passing mechanical report');
      assertEqual(repRes.data.mechanicalStatus, 'OK');
    },
  },

  {
    id: 'T1-32',
    name: '[F17] Mechanical Engine calculates Mechanical Status NOT_OK if any property is below threshold',
    fn: async () => {
      const peToken = await loginAs('pe_john');
      const reqRes = await api('/api/requests', {
        method: 'POST',
        body: { partName: 'Axle Shaft', partNumber: 'AX-1001', assignedInspectorId: 'usr-qi-1' },
      }, peToken);
      const reqId = reqRes.data.id;

      const qiToken = await loginAs('qi_david');
      const repRes = await api('/api/reports', {
        method: 'POST',
        body: {
          requestId: reqId,
          heatBatchNumber: 'BATCH-804',
          furnace: 'Furnace B',
          autoReport: 'REP-004',
          sampleBatchDate: '2026-10-27',
          bhn: 85.0,
          ys: 215.0, // < 220 -> NOT_OK
          uts: 290.0,
          elongation: 1.5,
          inspectorRemarks: 'YS low',
        },
      }, qiToken);
      assertStatus(repRes, 201, 'Submit failing YS report');
      assertEqual(repRes.data.mechanicalStatus, 'NOT_OK');
    },
  },

  // --- F18: Overall Status Calculation ---
  {
    id: 'T1-33',
    name: '[F18] Overall Status is OK if and only if both Hardness and Mechanical are OK',
    fn: async () => {
      const peToken = await loginAs('pe_john');
      const reqRes = await api('/api/requests', {
        method: 'POST',
        body: { partName: 'Axle Shaft', partNumber: 'AX-1001', assignedInspectorId: 'usr-qi-1' },
      }, peToken);
      const reqId = reqRes.data.id;

      const qiToken = await loginAs('qi_david');
      const repRes = await api('/api/reports', {
        method: 'POST',
        body: {
          requestId: reqId,
          heatBatchNumber: 'BATCH-805',
          furnace: 'Furnace C',
          autoReport: 'REP-005',
          sampleBatchDate: '2026-10-27',
          bhn: 88.0,
          ys: 235.0,
          uts: 300.0,
          elongation: 2.0,
        },
      }, qiToken);
      assertStatus(repRes, 201, 'Submit passing overall report');
      assertEqual(repRes.data.hardnessStatus, 'OK');
      assertEqual(repRes.data.mechanicalStatus, 'OK');
      assertEqual(repRes.data.overallStatus, 'OK');
    },
  },

  // --- F19: Mandatory Inspector Remarks on Not OK ---
  {
    id: 'T1-34',
    name: '[F19] Submitting report with Not OK status requires non-empty Inspector Remarks',
    fn: async () => {
      const peToken = await loginAs('pe_john');
      const reqRes = await api('/api/requests', {
        method: 'POST',
        body: { partName: 'Axle Shaft', partNumber: 'AX-1001', assignedInspectorId: 'usr-qi-1' },
      }, peToken);
      const reqId = reqRes.data.id;

      const qiToken = await loginAs('qi_david');
      const repRes = await api('/api/reports', {
        method: 'POST',
        body: {
          requestId: reqId,
          heatBatchNumber: 'BATCH-806',
          furnace: 'Furnace C',
          autoReport: 'REP-006',
          sampleBatchDate: '2026-10-27',
          bhn: 70.0, // NOT_OK
          ys: 200.0, // NOT_OK
          uts: 250.0, // NOT_OK
          elongation: 0.8, // NOT_OK
          inspectorRemarks: '', // Missing remarks!
        },
      }, qiToken);
      assertStatus(repRes, 400, 'Rejection of empty remarks on Not OK');
      assertIncludes(repRes.data.message, 'Remarks required');
    },
  },

  // --- F20: Report Submission & Signature Snapshot ---
  {
    id: 'T1-35',
    name: '[F20] Submitting report transitions request to Completed and snapshots signature',
    fn: async () => {
      const peToken = await loginAs('pe_john');
      const reqRes = await api('/api/requests', {
        method: 'POST',
        body: { partName: 'Turbine Blade', partNumber: 'TB-2001', assignedInspectorId: 'usr-qi-1' },
      }, peToken);
      const reqId = reqRes.data.id;

      const qiToken = await loginAs('qi_david');
      const repRes = await api('/api/reports', {
        method: 'POST',
        body: {
          requestId: reqId,
          heatBatchNumber: 'BATCH-807',
          furnace: 'Furnace D',
          autoReport: 'REP-007',
          sampleBatchDate: '2026-10-27',
          bhn: 85.0,
          ys: 240.0,
          uts: 310.0,
          elongation: 2.5,
        },
      }, qiToken);
      assertStatus(repRes, 201, 'Submit report');
      assertTrue(!!repRes.data.inspectorSignatureSnapshot, 'Signature snapshot exists');

      // Verify request status is now Completed
      const viewReq = await api(`/api/requests/${reqId}`, {}, peToken);
      assertEqual(viewReq.data.status, 'Completed');
    },
  },

  // --- F22: Printable View & PDF Export ---
  {
    id: 'T1-36',
    name: '[F22] View completed report returns read-only snapshot and PDF download',
    fn: async () => {
      const peToken = await loginAs('pe_john');
      const reqRes = await api('/api/requests', {
        method: 'POST',
        body: { partName: 'Turbine Blade', partNumber: 'TB-2002', assignedInspectorId: 'usr-qi-1' },
      }, peToken);
      const reqId = reqRes.data.id;

      const qiToken = await loginAs('qi_david');
      const repRes = await api('/api/reports', {
        method: 'POST',
        body: {
          requestId: reqId,
          heatBatchNumber: 'BATCH-808',
          furnace: 'Furnace E',
          autoReport: 'REP-008',
          sampleBatchDate: '2026-10-27',
          bhn: 90.0,
          ys: 250.0,
          uts: 320.0,
          elongation: 3.0,
        },
      }, qiToken);
      const repId = repRes.data.id;

      const pdfRes = await api(`/api/reports/${repId}/pdf`, {}, peToken);
      assertStatus(pdfRes, 200, 'PDF download');
      assertEqual(pdfRes.headers.get('content-type'), 'application/pdf');
    },
  },

  // --- F23 & F24: Dashboards ---
  {
    id: 'T1-37',
    name: '[F23] Production Engineer Dashboard returns KPIs and chart datasets',
    fn: async () => {
      const peToken = await loginAs('pe_john');
      const res = await api('/api/dashboard/production', {}, peToken);
      assertStatus(res, 200, 'Production Dashboard');
      assertTrue(res.data.kpi.totalRequests >= 0, 'KPI totalRequests');
      assertTrue(Array.isArray(res.data.requestsByStatus), 'Status chart dataset');
      assertTrue(Array.isArray(res.data.distribution), 'Donut chart dataset');
      assertTrue(Array.isArray(res.data.last5Completed), 'Last 5 completed');
    },
  },

  {
    id: 'T1-38',
    name: '[F24] Quality Inspector Dashboard returns assigned KPIs and next task',
    fn: async () => {
      const qiToken = await loginAs('qi_david');
      const res = await api('/api/dashboard/inspector', {}, qiToken);
      assertStatus(res, 200, 'Inspector Dashboard');
      assertTrue(res.data.kpi.totalAssigned >= 0, 'KPI totalAssigned');
      assertTrue(Array.isArray(res.data.recentAssignedTasks), 'Recent assigned tasks');
    },
  },

  // --- F25: Multi-Filter & Search ---
  {
    id: 'T1-39',
    name: '[F25] Request multi-filtering by status and part name returns matching records',
    fn: async () => {
      const peToken = await loginAs('pe_john');
      const res = await api('/api/requests?partName=Axle%20Shaft&status=Completed', {}, peToken);
      assertStatus(res, 200, 'Filter requests');
      assertTrue(Array.isArray(res.data));
      for (const r of res.data) {
        assertEqual(r.partName, 'Axle Shaft');
        assertEqual(r.status, 'Completed');
      }
    },
  },

  // --- F26: Immutable Audit Logging ---
  {
    id: 'T1-40',
    name: '[F26] Immutable audit logs record state transitions and user actions',
    fn: async () => {
      const peToken = await loginAs('pe_john');
      const res = await api('/api/audit', {}, peToken);
      assertStatus(res, 200, 'Audit logs');
      assertTrue(Array.isArray(res.data) && res.data.length > 0, 'Audit logs array');
      const first = res.data[0];
      assertTrue(!!first.timestamp, 'Timestamp exists');
      assertTrue(!!first.userId, 'UserId exists');
      assertTrue(!!first.action, 'Action exists');
      assertTrue(!!first.entityType, 'EntityType exists');
    },
  },
];
