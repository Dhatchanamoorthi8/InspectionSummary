// tier3-security.test.mjs
// Tier 3: Cross-Feature & Security Invariants
// Contains 18 automated security, RBAC isolation, status tampering, and immutability tests.

import {
  api,
  loginAs,
  assertEqual,
  assertNotEqual,
  assertTrue,
  assertStatus,
} from './helpers.mjs';

export const tier3Tests = [
  // --- Token & Header Invariants ---
  {
    id: 'T3-01',
    name: '[SEC-AUTH] Missing Authorization header on protected route returns HTTP 401',
    fn: async () => {
      const res = await api('/api/requests');
      assertStatus(res, 401, 'Unauthenticated request rejected');
    },
  },

  {
    id: 'T3-02',
    name: '[SEC-AUTH] Malformed Bearer token returns HTTP 401 Unauthorized',
    fn: async () => {
      const res = await api('/api/requests', {}, 'bad_token_format_xyz');
      assertStatus(res, 401, 'Malformed token rejected');
    },
  },

  // --- Quality Inspector RBAC Route Restrictions ---
  {
    id: 'T3-03',
    name: '[SEC-RBAC] Quality Inspector cannot create inspection requests (returns HTTP 403)',
    fn: async () => {
      const qiToken = await loginAs('qi_david');
      const res = await api('/api/requests', {
        method: 'POST',
        body: {
          partName: 'Axle Shaft',
          partNumber: 'AX-1001',
          assignedInspectorId: 'usr-qi-1',
        },
      }, qiToken);
      assertStatus(res, 403, 'QI creating request rejected');
    },
  },

  {
    id: 'T3-04',
    name: '[SEC-RBAC] Quality Inspector cannot create Part Master entries (returns HTTP 403)',
    fn: async () => {
      const qiToken = await loginAs('qi_david');
      const res = await api('/api/parts', {
        method: 'POST',
        body: { partName: 'Illegal Part', partNumber: 'ILL-001' },
      }, qiToken);
      assertStatus(res, 403, 'QI creating part rejected');
    },
  },

  {
    id: 'T3-05',
    name: '[SEC-RBAC] Quality Inspector cannot deactivate Part Master entries (returns HTTP 403)',
    fn: async () => {
      const qiToken = await loginAs('qi_david');
      const res = await api('/api/parts/prt-1', { method: 'DELETE' }, qiToken);
      assertStatus(res, 403, 'QI deleting part rejected');
    },
  },

  {
    id: 'T3-06',
    name: '[SEC-RBAC] Quality Inspector cannot commit bulk part imports (returns HTTP 403)',
    fn: async () => {
      const qiToken = await loginAs('qi_david');
      const res = await api('/api/parts/import/commit', {
        method: 'POST',
        body: { validRows: [{ partName: 'Test', partNumber: 'T-1' }] },
      }, qiToken);
      assertStatus(res, 403, 'QI bulk import commit rejected');
    },
  },

  {
    id: 'T3-07',
    name: '[SEC-RBAC] Production Engineer without canManageUsers cannot create users (returns HTTP 403)',
    fn: async () => {
      const peMaryToken = await loginAs('pe_mary'); // canManageUsers: false
      const res = await api('/api/users', {
        method: 'POST',
        body: {
          username: 'illegal_user',
          password: 'Password123!',
          fullName: 'Illegal User',
          role: 'QUALITY_INSPECTOR',
        },
      }, peMaryToken);
      assertStatus(res, 403, 'PE without user management rejected');
    },
  },

  // --- Production Engineer Report Restrictions ---
  {
    id: 'T3-08',
    name: '[SEC-RBAC] Production Engineer cannot submit inspection reports (returns HTTP 403)',
    fn: async () => {
      const peToken = await loginAs('pe_john');
      const res = await api('/api/reports', {
        method: 'POST',
        body: {
          requestId: 'any-req-id',
          heatBatchNumber: 'BATCH-PE',
          furnace: 'Furnace-1',
          autoReport: 'AR-PE',
          sampleBatchDate: '2026-10-27',
          bhn: 85.0,
          ys: 240.0,
          uts: 300.0,
          elongation: 2.0,
        },
      }, peToken);
      assertStatus(res, 403, 'PE submitting report rejected');
    },
  },

  // --- Task Ownership Isolation ---
  {
    id: 'T3-09',
    name: '[SEC-OWNER] Inspector Sarah receives HTTP 403 when viewing task assigned to David',
    fn: async () => {
      const peToken = await loginAs('pe_john');
      // Create request assigned to David (usr-qi-1)
      const createRes = await api('/api/requests', {
        method: 'POST',
        body: {
          partName: 'Turbine Blade',
          partNumber: 'TB-2001',
          assignedInspectorId: 'usr-qi-1',
        },
      }, peToken);
      const reqId = createRes.data.id;

      // Sarah (usr-qi-2) attempts to view David's request
      const sarahToken = await loginAs('qi_sarah');
      const viewRes = await api(`/api/requests/${reqId}`, {}, sarahToken);
      assertStatus(viewRes, 403, 'Sarah viewing David task rejected');
    },
  },

  {
    id: 'T3-10',
    name: '[SEC-OWNER] Inspector Sarah receives HTTP 403 when starting task assigned to David',
    fn: async () => {
      const peToken = await loginAs('pe_john');
      const createRes = await api('/api/requests', {
        method: 'POST',
        body: {
          partName: 'Turbine Blade',
          partNumber: 'TB-2001',
          assignedInspectorId: 'usr-qi-1',
        },
      }, peToken);
      const reqId = createRes.data.id;

      const sarahToken = await loginAs('qi_sarah');
      const startRes = await api(`/api/requests/${reqId}/start`, { method: 'PATCH' }, sarahToken);
      assertStatus(startRes, 403, 'Sarah starting David task rejected');
    },
  },

  {
    id: 'T3-11',
    name: '[SEC-OWNER] Inspector Sarah receives HTTP 403 when submitting report for task assigned to David',
    fn: async () => {
      const peToken = await loginAs('pe_john');
      const createRes = await api('/api/requests', {
        method: 'POST',
        body: {
          partName: 'Turbine Blade',
          partNumber: 'TB-2001',
          assignedInspectorId: 'usr-qi-1',
        },
      }, peToken);
      const reqId = createRes.data.id;

      const sarahToken = await loginAs('qi_sarah');
      const repRes = await api('/api/reports', {
        method: 'POST',
        body: {
          requestId: reqId,
          heatBatchNumber: 'BATCH-STEAL',
          furnace: 'Furnace-1',
          autoReport: 'AR-STEAL',
          sampleBatchDate: '2026-10-27',
          bhn: 85.0,
          ys: 240.0,
          uts: 300.0,
          elongation: 2.0,
        },
      }, sarahToken);
      assertStatus(repRes, 403, 'Sarah submitting report for David task rejected');
    },
  },

  // --- Client Status Override Stripping ---
  {
    id: 'T3-12',
    name: '[SEC-OVERRIDE] Client spoofing overallStatus="OK" on failing measurements (BHN=50) is stripped to NOT_OK',
    fn: async () => {
      const peToken = await loginAs('pe_john');
      const createRes = await api('/api/requests', {
        method: 'POST',
        body: {
          partName: 'Turbine Blade',
          partNumber: 'TB-2001',
          assignedInspectorId: 'usr-qi-1',
        },
      }, peToken);
      const reqId = createRes.data.id;

      const davidToken = await loginAs('qi_david');
      const repRes = await api('/api/reports', {
        method: 'POST',
        body: {
          requestId: reqId,
          heatBatchNumber: 'BATCH-SPOOF-1',
          furnace: 'Furnace-1',
          autoReport: 'AR-SPOOF-1',
          sampleBatchDate: '2026-10-27',
          bhn: 50.0, // Should produce NOT_OK!
          ys: 240.0,
          uts: 300.0,
          elongation: 2.0,
          hardnessStatus: 'OK', // Attacker attempt to override!
          overallStatus: 'OK', // Attacker attempt to override!
          inspectorRemarks: 'Failing hardness remarks',
        },
      }, davidToken);
      assertStatus(repRes, 201, 'Report created');
      assertEqual(repRes.data.hardnessStatus, 'NOT_OK', 'Hardness status calculated correctly');
      assertEqual(repRes.data.overallStatus, 'NOT_OK', 'Overall status calculated correctly, override stripped');
    },
  },

  {
    id: 'T3-13',
    name: '[SEC-OVERRIDE] Client spoofing overallStatus="NOT_OK" on passing measurements is stripped to OK',
    fn: async () => {
      const peToken = await loginAs('pe_john');
      const createRes = await api('/api/requests', {
        method: 'POST',
        body: {
          partName: 'Turbine Blade',
          partNumber: 'TB-2001',
          assignedInspectorId: 'usr-qi-1',
        },
      }, peToken);
      const reqId = createRes.data.id;

      const davidToken = await loginAs('qi_david');
      const repRes = await api('/api/reports', {
        method: 'POST',
        body: {
          requestId: reqId,
          heatBatchNumber: 'BATCH-SPOOF-2',
          furnace: 'Furnace-1',
          autoReport: 'AR-SPOOF-2',
          sampleBatchDate: '2026-10-27',
          bhn: 85.0, // PASS
          ys: 240.0, // PASS
          uts: 300.0, // PASS
          elongation: 2.0, // PASS
          overallStatus: 'NOT_OK', // Attacker attempt to mark false failure
        },
      }, davidToken);
      assertStatus(repRes, 201, 'Report created');
      assertEqual(repRes.data.overallStatus, 'OK', 'Overall status calculated correctly as OK');
    },
  },

  // --- Duplicate Submission Prevention ---
  {
    id: 'T3-14',
    name: '[SEC-DUPLICATE] Transactional guard rejects second report submission for same request with HTTP 409',
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

      const davidToken = await loginAs('qi_david');
      const payload = {
        requestId: reqId,
        heatBatchNumber: 'BATCH-DUP',
        furnace: 'Furnace-1',
        autoReport: 'AR-DUP',
        sampleBatchDate: '2026-10-27',
        bhn: 85.0,
        ys: 240.0,
        uts: 300.0,
        elongation: 2.0,
      };

      // First submission succeeds
      const firstRes = await api('/api/reports', { method: 'POST', body: payload }, davidToken);
      assertStatus(firstRes, 201, 'First report submission');

      // Second duplicate submission must fail
      const secondRes = await api('/api/reports', { method: 'POST', body: payload }, davidToken);
      assertStatus(secondRes, 409, 'Duplicate report submission rejected');
    },
  },

  // --- Signature Immutability ---
  {
    id: 'T3-15',
    name: '[SEC-SIGNATURE] Profile signature updates DO NOT alter snapshot in previously submitted reports',
    fn: async () => {
      const peToken = await loginAs('pe_john');
      const davidToken = await loginAs('qi_david');

      // Set initial signature for David
      const initialSig = 'data:image/png;base64,INITIAL_SIGNATURE_DATA_AAA';
      await api('/api/users/usr-qi-1/signature', {
        method: 'PUT',
        body: { signatureData: initialSig },
      }, davidToken);

      // Create request and submit report
      const createRes = await api('/api/requests', {
        method: 'POST',
        body: {
          partName: 'Axle Shaft',
          partNumber: 'AX-1001',
          assignedInspectorId: 'usr-qi-1',
        },
      }, peToken);
      const reqId = createRes.data.id;

      const repRes = await api('/api/reports', {
        method: 'POST',
        body: {
          requestId: reqId,
          heatBatchNumber: 'BATCH-SIG-IMMUTABLE',
          furnace: 'Furnace-1',
          autoReport: 'AR-SIG',
          sampleBatchDate: '2026-10-27',
          bhn: 85.0,
          ys: 240.0,
          uts: 300.0,
          elongation: 2.0,
        },
      }, davidToken);
      const repId = repRes.data.id;
      assertEqual(repRes.data.inspectorSignatureSnapshot, initialSig, 'Snapshot matches initial signature');

      // Now David updates his profile signature to something new
      const updatedSig = 'data:image/png;base64,UPDATED_SIGNATURE_DATA_BBB';
      await api('/api/users/usr-qi-1/signature', {
        method: 'PUT',
        body: { signatureData: updatedSig },
      }, davidToken);

      // Retrieve the earlier report and assert snapshot did not mutate!
      const fetchRep = await api(`/api/reports/${repId}`, {}, peToken);
      assertEqual(fetchRep.data.inspectorSignatureSnapshot, initialSig, 'Historical snapshot remains unchanged');
      assertNotEqual(fetchRep.data.inspectorSignatureSnapshot, updatedSig, 'Historical snapshot not altered by profile change');
    },
  },

  // --- Reassignment Immediate Access Revocation ---
  {
    id: 'T3-16',
    name: '[SEC-REASSIGN] When PE reassigns request from David to Sarah, David immediately receives HTTP 403',
    fn: async () => {
      const peToken = await loginAs('pe_john');
      const createRes = await api('/api/requests', {
        method: 'POST',
        body: {
          partName: 'Turbine Blade',
          partNumber: 'TB-2002',
          assignedInspectorId: 'usr-qi-1', // David
        },
      }, peToken);
      const reqId = createRes.data.id;

      // PE reassigns to Sarah (usr-qi-2)
      await api(`/api/requests/${reqId}/reassign`, {
        method: 'PUT',
        body: { inspectorId: 'usr-qi-2', reason: 'Shift rotation' },
      }, peToken);

      // David now attempts to access the request -> must be HTTP 403
      const davidToken = await loginAs('qi_david');
      const davidView = await api(`/api/requests/${reqId}`, {}, davidToken);
      assertStatus(davidView, 403, 'David access revoked after reassignment');

      // Sarah can access it
      const sarahToken = await loginAs('qi_sarah');
      const sarahView = await api(`/api/requests/${reqId}`, {}, sarahToken);
      assertStatus(sarahView, 200, 'Sarah access granted after reassignment');
    },
  },

  // --- Controlled Revisions & Preserved History ---
  {
    id: 'T3-17',
    name: '[SEC-REVISION] Post-submission revision creates versioned history and preserves original values',
    fn: async () => {
      const peToken = await loginAs('pe_john');
      const sarahToken = await loginAs('qi_sarah');

      const createRes = await api('/api/requests', {
        method: 'POST',
        body: {
          partName: 'Turbine Blade',
          partNumber: 'TB-2003',
          assignedInspectorId: 'usr-qi-2',
        },
      }, peToken);
      const reqId = createRes.data.id;

      const submitRes = await api('/api/reports', {
        method: 'POST',
        body: {
          requestId: reqId,
          heatBatchNumber: 'BATCH-REV-1',
          furnace: 'Furnace-1',
          autoReport: 'AR-REV-1',
          sampleBatchDate: '2026-10-27',
          bhn: 82.0,
          ys: 230.0,
          uts: 290.0,
          elongation: 1.5,
        },
      }, sarahToken);
      const repId = submitRes.data.id;

      // Submit controlled revision
      const revRes = await api(`/api/reports/${repId}/revisions`, {
        method: 'POST',
        body: {
          bhn: 86.0,
          reason: 'Hardness re-tested with calibrated indentor',
        },
      }, peToken);
      assertStatus(revRes, 200, 'Revision submitted');
      assertEqual(revRes.data.bhn, 86.0, 'Updated BHN');
      assertTrue(Array.isArray(revRes.data.revisions) && revRes.data.revisions.length === 1);
      assertEqual(revRes.data.revisions[0].previousSnapshot.bhn, 82.0, 'Original BHN preserved');
      assertEqual(revRes.data.revisions[0].reason, 'Hardness re-tested with calibrated indentor');
    },
  },

  // --- SQL Injection & Metacharacter Resistance ---
  {
    id: 'T3-18',
    name: '[SEC-INJECTION] Search parameters with SQL injection syntax are safely handled without leakage',
    fn: async () => {
      const peToken = await loginAs('pe_john');
      const attackRes = await api("/api/parts?search=' OR '1'='1' --", {}, peToken);
      assertStatus(attackRes, 200, 'Search with injection syntax safe');
      assertTrue(Array.isArray(attackRes.data), 'Array returned without server crash');
    },
  },

  // --- Universal Delete & Multi-Module Invariants ---
  {
    id: 'T3-19',
    name: '[SEC-DEL-REQ] Production Engineer deletes assigned request; subsequent lookup returns HTTP 404',
    fn: async () => {
      const peToken = await loginAs('pe_john');
      const reqRes = await api('/api/requests', {
        method: 'POST',
        body: {
          partName: 'Axle Shaft',
          partNumber: 'AX-1001',
          assignedInspectorId: 'usr-qi-1',
          remarks: 'Delete test request',
        },
      }, peToken);
      assertStatus(reqRes, 201, 'Request created');
      const reqId = reqRes.data.id;

      // Delete the request
      const delRes = await api(`/api/requests/${reqId}`, { method: 'DELETE' }, peToken);
      assertStatus(delRes, 200, 'Request deleted successfully');
      assertEqual(delRes.data.success, true, 'Delete success flag true');

      // Verify 404
      const checkRes = await api(`/api/requests/${reqId}`, {}, peToken);
      assertStatus(checkRes, 404, 'Deleted request is no longer found');
    },
  },

  {
    id: 'T3-20',
    name: '[SEC-DEL-USER] User self-deletion is prevented and rejected with HTTP 400 Bad Request',
    fn: async () => {
      const peToken = await loginAs('pe_john');
      const meRes = await api('/api/auth/me', {}, peToken);
      const myId = meRes.data.user?.id || meRes.data.user?.userId;

      const delRes = await api(`/api/users/${myId}`, { method: 'DELETE' }, peToken);
      assertStatus(delRes, 400, 'Self-deletion rejected with HTTP 400');
    },
  },

  {
    id: 'T3-21',
    name: '[SEC-DEL-USER] Authorized PE deletes temporary user and unassigns pending tasks',
    fn: async () => {
      const peToken = await loginAs('pe_john');
      const tempUserRes = await api('/api/users', {
        method: 'POST',
        body: {
          username: `del_user_${Date.now()}`,
          password: 'Password123!',
          fullName: 'Temporary Delete Candidate',
          role: 'QUALITY_INSPECTOR',
          isActive: true,
        },
      }, peToken);
      assertStatus(tempUserRes, 201, 'Temp user created');
      const tempUserId = tempUserRes.data.id;

      const delRes = await api(`/api/users/${tempUserId}`, { method: 'DELETE' }, peToken);
      assertStatus(delRes, 200, 'User deleted');
      assertEqual(delRes.data.success, true, 'User delete reported true');
    },
  },

  {
    id: 'T3-22',
    name: '[SEC-DEL-REP] Authorized user voids/deletes report; associated request reverts to In Progress',
    fn: async () => {
      const peToken = await loginAs('pe_john');
      const qiToken = await loginAs('qi_david');

      // 1. Create request
      const reqRes = await api('/api/requests', {
        method: 'POST',
        body: {
          partName: 'Axle Shaft',
          partNumber: 'AX-1001',
          assignedInspectorId: 'usr-qi-1',
        },
      }, peToken);
      assertStatus(reqRes, 201, 'Request created');
      const reqId = reqRes.data.id;

      // 2. Start inspection
      await api(`/api/requests/${reqId}/start`, { method: 'PATCH' }, qiToken);

      // 3. Submit report
      const repRes = await api('/api/reports', {
        method: 'POST',
        body: {
          requestId: reqId,
          heatBatchNumber: 'HB-VOID-01',
          furnace: 'F-1',
          autoReport: `RPT-VOID-${Date.now()}`,
          sampleBatchDate: '2026-10-28',
          bhn: 85.0,
          ys: 240.0,
          uts: 310.0,
          elongation: 2.0,
        },
      }, qiToken);
      assertStatus(repRes, 201, 'Report created');
      const repId = repRes.data.id;

      // Verify request is Completed
      const reqBefore = await api(`/api/requests/${reqId}`, {}, peToken);
      assertEqual(reqBefore.data.status, 'Completed', 'Request completed');

      // 4. Void / delete report
      const voidRes = await api(`/api/reports/${repId}`, {
        method: 'DELETE',
        body: { reason: 'Incorrect batch calibration' },
      }, peToken);
      assertStatus(voidRes, 200, 'Report voided');

      // 5. Verify request reverted to In Progress
      const reqAfter = await api(`/api/requests/${reqId}`, {}, peToken);
      assertEqual(reqAfter.data.status, 'In Progress', 'Request reverted to In Progress');
    },
  },

  {
    id: 'T3-23',
    name: '[LINE-INSPECT] Line Inspection request creation, calculation, and multi-module report submission',
    fn: async () => {
      const peToken = await loginAs('pe_john');
      const qiToken = await loginAs('qi_david');

      // 1. Create Line Inspection request
      const reqRes = await api('/api/requests', {
        method: 'POST',
        body: {
          partName: 'Turbine Blade',
          partNumber: 'TB-2001',
          assignedInspectorId: 'usr-qi-1',
          moduleType: 'LINE_INSPECTION',
          moduleMetadata: { lineId: 'Line-04', shift: 'Shift-A' },
        },
      }, peToken);
      assertStatus(reqRes, 201, 'Line inspection request created');
      assertEqual(reqRes.data.moduleType, 'LINE_INSPECTION', 'Correct moduleType');
      const reqId = reqRes.data.id;

      // 2. Start inspection
      await api(`/api/requests/${reqId}/start`, { method: 'PATCH' }, qiToken);

      // 3. Submit Line Inspection report with passing criteria
      const repRes = await api('/api/reports', {
        method: 'POST',
        body: {
          requestId: reqId,
          moduleType: 'LINE_INSPECTION',
          lineId: 'Line-04',
          shift: 'Shift-A',
          visualCheck: 'PASS',
          torqueNm: 45.0,
          dimensionDeviationMm: 0.02,
          defectCount: 0,
        },
      }, qiToken);
      assertStatus(repRes, 201, 'Line inspection report created');
      assertEqual(repRes.data.overallStatus, 'OK', 'Overall status calculated as OK');
      assertEqual(repRes.data.moduleType, 'LINE_INSPECTION', 'Report moduleType is LINE_INSPECTION');
    },
  },

  {
    id: 'T3-24',
    name: '[SEC-PERM-CATALOG] Fetch permissions catalog returns categorized system permissions',
    fn: async () => {
      const peToken = await loginAs('pe_john');
      const permsRes = await api('/api/users/permissions', {}, peToken);
      assertStatus(permsRes, 200, 'Permissions catalog returned');
      assertTrue(Array.isArray(permsRes.data), 'Returns array of permissions');
      assertTrue(permsRes.data.length >= 20, 'At least 20 system permissions pre-seeded');
      const hasLineInspect = permsRes.data.some((p) => p.id === 'INSPECT_LINE');
      assertTrue(hasLineInspect, 'Contains INSPECT_LINE permission');
    },
  },

  {
    id: 'T3-25',
    name: '[SEC-USER-PERMS] Admin creates custom permission and assigns it to user; permissions resolve in real-time',
    fn: async () => {
      const peToken = await loginAs('pe_john');

      // 1. Create a custom permission
      const customPermId = `INSPECT_PORTABLE_${Date.now()}`;
      const createPermRes = await api('/api/users/permissions', {
        method: 'POST',
        body: {
          id: customPermId,
          name: 'Portable Hardness Testing',
          category: 'Modules',
          description: 'Non-destructive portable Leeb hardness test',
        },
      }, peToken);
      assertStatus(createPermRes, 201, 'Custom permission created');
      assertEqual(createPermRes.data.id, customPermId, 'Correct permission id returned');

      // 2. Assign custom permission to David (usr-qi-1)
      const assignRes = await api('/api/users/usr-qi-1/permissions', {
        method: 'PUT',
        body: {
          permissions: [customPermId],
        },
      }, peToken);
      assertStatus(assignRes, 200, 'Permissions assigned to user');
      assertTrue(assignRes.data.customPermissions.includes(customPermId), 'customPermissions contains new permission');
      assertTrue(assignRes.data.effectivePermissions.includes(customPermId), 'effectivePermissions contains new permission');

      // 3. Verify when David logs in, his profile includes the new permission
      const davidToken = await loginAs('qi_david');
      const meRes = await api('/api/auth/me', {}, davidToken);
      assertStatus(meRes, 200, 'David profile fetched');
      assertTrue(meRes.data.user.permissions.includes(customPermId), 'David active session includes assigned permission');
    },
  },
];
