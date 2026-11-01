// tier4-workflows.test.mjs
// Tier 4: Real-World Industrial Application Scenarios
// Implements the 5 complete end-to-end multi-role industrial workflows.

import {
  api,
  loginAs,
  assertEqual,
  assertNotEqual,
  assertTrue,
  assertFalse,
  assertStatus,
  assertIncludes,
} from './helpers.mjs';

export const tier4Tests = [
  // =========================================================================
  // SCENARIO 1: Standard Greenfield Onboarding & Master Data Ingestion
  // =========================================================================
  {
    id: 'T4-01',
    name: '[WORKFLOW-1] Greenfield Onboarding & Master Data Ingestion',
    fn: async () => {
      // Step 1.1: Production Engineer logs in
      const peToken = await loginAs('pe_john');
      const meRes = await api('/api/auth/me', {}, peToken);
      assertStatus(meRes, 200, 'PE Auth me');
      assertEqual(meRes.data.user.role, 'PRODUCTION_ENGINEER');

      // Step 1.2: PE creates a new Quality Inspector user
      const uniqueUsername = `qi_workflow_${Date.now()}`;
      const createUserRes = await api('/api/users', {
        method: 'POST',
        body: {
          username: uniqueUsername,
          password: 'Password123!',
          fullName: 'Workflow Inspector',
          role: 'QUALITY_INSPECTOR',
          canManageUsers: false,
          isActive: true,
        },
      }, peToken);
      assertStatus(createUserRes, 201, 'Create QI user');
      const newQiId = createUserRes.data.id;

      // Step 1.3: New QI logs in and uploads digital signature
      const newQiToken = await loginAs(uniqueUsername, 'Password123!');
      const sigData = 'data:image/png;base64,WORKFLOW_SIGNATURE_DATA_CANVAS';
      const sigRes = await api(`/api/users/${newQiId}/signature`, {
        method: 'PUT',
        body: { signatureData: sigData },
      }, newQiToken);
      assertStatus(sigRes, 200, 'Upload signature for new QI');

      // Step 1.4: PE downloads CSV template for Part Master
      const templateRes = await api('/api/parts/template', {}, peToken);
      assertStatus(templateRes, 200, 'Download CSV template');
      assertIncludes(templateRes.rawText, 'Part Name,Part Number');

      // Step 1.5: PE prepares bulk rows and tests preview validation
      const sampleImportRows = [
        { 'Part Name': 'Crankshaft V8', 'Part Number': `CS-V8-${Date.now()}` },
        { 'Part Name': 'Crankshaft V6', 'Part Number': `CS-V6-${Date.now()}` },
      ];
      const previewRes = await api('/api/parts/import/preview', {
        method: 'POST',
        body: { rows: sampleImportRows },
      }, peToken);
      assertStatus(previewRes, 200, 'Preview bulk import');
      assertEqual(previewRes.data.validCount, 2, 'Two valid rows');
      assertEqual(previewRes.data.errorCount, 0, 'Zero errors');

      // Step 1.6: PE commits bulk import
      const commitRes = await api('/api/parts/import/commit', {
        method: 'POST',
        body: { validRows: previewRes.data.validRows },
      }, peToken);
      assertStatus(commitRes, 200, 'Commit bulk import');
      assertEqual(commitRes.data.importedCount, 2, 'Imported 2 parts');

      // Step 1.7: Autocomplete shows newly imported part names and part numbers
      const namesRes = await api('/api/parts/names', {}, peToken);
      assertStatus(namesRes, 200, 'Autocomplete names');
      assertIncludes(namesRes.data, 'Crankshaft V8');

      // Step 1.8: Audit trail records user creation and bulk part import
      const auditRes = await api('/api/audit', {}, peToken);
      assertStatus(auditRes, 200, 'Audit logs');
      assertTrue(auditRes.data.some((a) => a.action === 'CREATE_USER' && a.entityId === newQiId));
      assertTrue(auditRes.data.some((a) => a.action === 'BULK_IMPORT_PARTS'));
    },
  },

  // =========================================================================
  // SCENARIO 2: End-to-End Passing Inspection Lifecycle
  // =========================================================================
  {
    id: 'T4-02',
    name: '[WORKFLOW-2] End-to-End Passing Inspection Lifecycle',
    fn: async () => {
      // Step 2.1: PE logs in and captures baseline dashboard KPIs
      const peToken = await loginAs('pe_john');
      const baseDashRes = await api('/api/dashboard/production', {}, peToken);
      assertStatus(baseDashRes, 200, 'Base PE dashboard');
      const initialCompleted = baseDashRes.data.kpi.completed;

      // Step 2.2: PE creates an inspection request for 'Axle Shaft' -> 'AX-1001' assigned to QI David
      const createReqRes = await api('/api/requests', {
        method: 'POST',
        body: {
          partName: 'Axle Shaft',
          partNumber: 'AX-1001',
          assignedInspectorId: 'usr-qi-1',
          remarks: 'Aerospace grade batch verification',
        },
      }, peToken);
      assertStatus(createReqRes, 201, 'Create inspection request');
      const reqId = createReqRes.data.id;
      const reqNumber = createReqRes.data.requestNumber;
      assertEqual(createReqRes.data.status, 'Assigned');

      // Step 2.3: QI David logs in, views Inspector Dashboard, sees the assigned task
      const qiToken = await loginAs('qi_david');
      const qiDashRes = await api('/api/dashboard/inspector', {}, qiToken);
      assertStatus(qiDashRes, 200, 'QI Dashboard');
      assertTrue(qiDashRes.data.kpi.totalAssigned > 0);

      // Step 2.4: QI starts inspection task -> status transitions to 'In Progress'
      const startRes = await api(`/api/requests/${reqId}/start`, { method: 'PATCH' }, qiToken);
      assertStatus(startRes, 200, 'Start task');
      assertEqual(startRes.data.status, 'In Progress');

      // Step 2.5: QI enters passing metallurgical data (BHN=88, YS=245, UTS=315, E=2.8%)
      const submitRes = await api('/api/reports', {
        method: 'POST',
        body: {
          requestId: reqId,
          heatBatchNumber: 'BATCH-WF2-PASS',
          furnace: 'Furnace-Vacuum-3',
          autoReport: 'AR-WF2-99',
          sampleBatchDate: '2026-10-27',
          bhn: 88.0, // >= 80 -> OK
          ys: 245.0, // >= 220 -> OK
          uts: 315.0, // >= 280 -> OK
          elongation: 2.8, // >= 1.00% -> OK
          inspectorRemarks: 'All metallurgical properties conform to AMS-2750 spec',
        },
      }, qiToken);
      assertStatus(submitRes, 201, 'Submit passing report');
      const reportId = submitRes.data.id;

      // Step 2.6: Verify calculation results & signature snapshot
      assertEqual(submitRes.data.hardnessStatus, 'OK');
      assertEqual(submitRes.data.mechanicalStatus, 'OK');
      assertEqual(submitRes.data.overallStatus, 'OK');
      assertTrue(!!submitRes.data.inspectorSignatureSnapshot, 'Signature snapshot exists');

      // Step 2.7: Request status is now 'Completed'
      const checkReqRes = await api(`/api/requests/${reqId}`, {}, peToken);
      assertStatus(checkReqRes, 200, 'Check request status');
      assertEqual(checkReqRes.data.status, 'Completed');

      // Step 2.8: PE views completed report and downloads PDF export
      const viewRepRes = await api(`/api/reports/${reportId}`, {}, peToken);
      assertStatus(viewRepRes, 200, 'View report');
      assertEqual(viewRepRes.data.overallStatus, 'OK');

      const pdfRes = await api(`/api/reports/${reportId}/pdf`, {}, peToken);
      assertStatus(pdfRes, 200, 'Download PDF');
      assertEqual(pdfRes.headers.get('content-type'), 'application/pdf');

      // Step 2.9: PE Dashboard reflects incremented completed count
      const updatedDashRes = await api('/api/dashboard/production', {}, peToken);
      assertEqual(updatedDashRes.data.kpi.completed, initialCompleted + 1, 'Completed count incremented');
    },
  },

  // =========================================================================
  // SCENARIO 3: Metallurgical Failure & Mandatory Remarks Rejection Workflow
  // =========================================================================
  {
    id: 'T4-03',
    name: '[WORKFLOW-3] Metallurgical Failure & Mandatory Remarks Enforcement',
    fn: async () => {
      // Step 3.1: PE creates request for 'Turbine Blade' assigned to QI Sarah
      const peToken = await loginAs('pe_john');
      const createRes = await api('/api/requests', {
        method: 'POST',
        body: {
          partName: 'Turbine Blade',
          partNumber: 'TB-2001',
          assignedInspectorId: 'usr-qi-2', // Sarah
        },
      }, peToken);
      assertStatus(createRes, 201, 'Create turbine request');
      const reqId = createRes.data.id;

      // Step 3.2: QI Sarah logs in and starts the task
      const sarahToken = await loginAs('qi_sarah');
      const startRes = await api(`/api/requests/${reqId}/start`, { method: 'PATCH' }, sarahToken);
      assertStatus(startRes, 200, 'Sarah starts task');

      // Step 3.3: QI Sarah attempts to submit failing metallurgical values (BHN=72.0 < 80)
      // WITHOUT providing Inspector Remarks
      const failNoRemarksRes = await api('/api/reports', {
        method: 'POST',
        body: {
          requestId: reqId,
          heatBatchNumber: 'BATCH-WF3-FAIL',
          furnace: 'Furnace-Gas-1',
          autoReport: 'AR-WF3-FAIL',
          sampleBatchDate: '2026-10-27',
          bhn: 72.0, // < 80 -> NOT_OK
          ys: 210.0, // < 220 -> NOT_OK
          uts: 270.0, // < 280 -> NOT_OK
          elongation: 0.8, // < 1.0 -> NOT_OK
          inspectorRemarks: '', // Missing remarks!
        },
      }, sarahToken);
      assertStatus(failNoRemarksRes, 400, 'Rejection of empty remarks on Not OK');
      assertIncludes(failNoRemarksRes.data.message, 'Remarks required');

      // Step 3.4: QI Sarah tries with whitespace-only remarks -> also rejected
      const failWhitespaceRes = await api('/api/reports', {
        method: 'POST',
        body: {
          requestId: reqId,
          heatBatchNumber: 'BATCH-WF3-FAIL',
          furnace: 'Furnace-Gas-1',
          autoReport: 'AR-WF3-FAIL',
          sampleBatchDate: '2026-10-27',
          bhn: 72.0,
          ys: 210.0,
          uts: 270.0,
          elongation: 0.8,
          inspectorRemarks: '     \t\n  ',
        },
      }, sarahToken);
      assertStatus(failWhitespaceRes, 400, 'Rejection of whitespace remarks');

      // Step 3.5: QI Sarah enters mandatory metallurgical remarks explaining the failure
      const rejectionRemarks = 'Quench oil temperature exceeded limit causing insufficient martensite transformation. BHN 72 and YS 210 MPa below required threshold.';
      const validFailSubmitRes = await api('/api/reports', {
        method: 'POST',
        body: {
          requestId: reqId,
          heatBatchNumber: 'BATCH-WF3-FAIL',
          furnace: 'Furnace-Gas-1',
          autoReport: 'AR-WF3-FAIL',
          sampleBatchDate: '2026-10-27',
          bhn: 72.0,
          ys: 210.0,
          uts: 270.0,
          elongation: 0.8,
          inspectorRemarks: rejectionRemarks,
        },
      }, sarahToken);
      assertStatus(validFailSubmitRes, 201, 'Submit failing report with remarks');
      assertEqual(validFailSubmitRes.data.hardnessStatus, 'NOT_OK');
      assertEqual(validFailSubmitRes.data.mechanicalStatus, 'NOT_OK');
      assertEqual(validFailSubmitRes.data.overallStatus, 'NOT_OK');
      assertEqual(validFailSubmitRes.data.inspectorRemarks, rejectionRemarks);

      // Step 3.6: PE checks dashboard and verifies Not OK Reports KPI is updated
      const peDashRes = await api('/api/dashboard/production', {}, peToken);
      assertStatus(peDashRes, 200, 'PE Dashboard');
      assertTrue(peDashRes.data.kpi.notOkReports >= 1, 'Not OK reports counter contains failure');

      // Step 3.7: Audit log verifies report submission with failure status logged
      const auditRes = await api('/api/audit?entityType=REPORT', {}, peToken);
      assertStatus(auditRes, 200, 'Audit report entries');
      assertTrue(auditRes.data.some((a) => a.entityId === validFailSubmitRes.data.id));
    },
  },

  // =========================================================================
  // SCENARIO 4: Reassignment, Concurrent Conflict & Revision Lifecycle
  // =========================================================================
  {
    id: 'T4-04',
    name: '[WORKFLOW-4] Reassignment, Ownership Transfer & Controlled Revision',
    fn: async () => {
      // Step 4.1: PE creates inspection request and initially assigns to QI David
      const peToken = await loginAs('pe_john');
      const createRes = await api('/api/requests', {
        method: 'POST',
        body: {
          partName: 'Turbine Blade',
          partNumber: 'TB-2002',
          assignedInspectorId: 'usr-qi-1', // David
          remarks: 'Pre-flight check',
        },
      }, peToken);
      assertStatus(createRes, 201, 'Create request');
      const reqId = createRes.data.id;

      // Step 4.2: PE decides to reassign to QI Sarah due to shift handover
      const reassignRes = await api(`/api/requests/${reqId}/reassign`, {
        method: 'PUT',
        body: {
          inspectorId: 'usr-qi-2', // Sarah
          reason: 'Shift handover to night inspector',
        },
      }, peToken);
      assertStatus(reassignRes, 200, 'Reassign to Sarah');
      assertEqual(reassignRes.data.assignedInspectorId, 'usr-qi-2');

      // Step 4.3: QI David attempts to start or submit -> Receives HTTP 403 Forbidden!
      const davidToken = await loginAs('qi_david');
      const davidStart = await api(`/api/requests/${reqId}/start`, { method: 'PATCH' }, davidToken);
      assertStatus(davidStart, 403, 'David cannot start reassigned task');

      const davidSubmit = await api('/api/reports', {
        method: 'POST',
        body: {
          requestId: reqId,
          heatBatchNumber: 'BATCH-4',
          furnace: 'Furnace-1',
          autoReport: 'AR-4',
          sampleBatchDate: '2026-10-27',
          bhn: 85.0,
          ys: 240.0,
          uts: 300.0,
          elongation: 2.0,
        },
      }, davidToken);
      assertStatus(davidSubmit, 403, 'David cannot submit report for reassigned task');

      // Step 4.4: QI Sarah starts task and successfully submits report
      const sarahToken = await loginAs('qi_sarah');
      const sarahStart = await api(`/api/requests/${reqId}/start`, { method: 'PATCH' }, sarahToken);
      assertStatus(sarahStart, 200, 'Sarah starts task');

      const sarahSubmit = await api('/api/reports', {
        method: 'POST',
        body: {
          requestId: reqId,
          heatBatchNumber: 'BATCH-WF4-SARAH',
          furnace: 'Furnace-2',
          autoReport: 'AR-WF4-SARAH',
          sampleBatchDate: '2026-10-27',
          bhn: 81.5,
          ys: 228.0,
          uts: 288.0,
          elongation: 1.4,
          inspectorRemarks: 'Passed initial testing',
        },
      }, sarahToken);
      assertStatus(sarahSubmit, 201, 'Sarah submits report');
      const repId = sarahSubmit.data.id;
      assertEqual(sarahSubmit.data.overallStatus, 'OK');

      // Step 4.5: PE initiates a post-submission controlled revision (e.g., recalibrated hardness re-test)
      const revRes = await api(`/api/reports/${repId}/revisions`, {
        method: 'POST',
        body: {
          bhn: 84.0,
          reason: 'Hardness value verified on calibrated Rockwell/Brinell dual tester',
        },
      }, peToken);
      assertStatus(revRes, 200, 'Revision committed');
      assertEqual(revRes.data.bhn, 84.0, 'Updated BHN');
      assertEqual(revRes.data.revisions.length, 1, 'Revision history length is 1');
      assertEqual(revRes.data.revisions[0].previousSnapshot.bhn, 81.5, 'Original value preserved in history');

      // Step 4.6: Audit log captures both reassignment and report revision
      const auditRes = await api('/api/audit', {}, peToken);
      assertStatus(auditRes, 200, 'Audit check');
      assertTrue(auditRes.data.some((a) => a.action === 'REASSIGN_REQUEST' && a.entityId === reqId));
      assertTrue(auditRes.data.some((a) => a.action === 'REVISE_REPORT' && a.entityId === repId));
    },
  },

  // =========================================================================
  // SCENARIO 5: Security Attack Surface & Penetration Invariants
  // =========================================================================
  {
    id: 'T4-05',
    name: '[WORKFLOW-5] Security Attack Surface & Penetration Invariants',
    fn: async () => {
      // Step 5.1: Attack attempt with forged / invalid bearer token
      const forgedToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.fake_signature';
      const unauthReq = await api('/api/users', {}, forgedToken);
      assertStatus(unauthReq, 401, 'Forged token rejected');

      // Step 5.2: Role escalation attack - QI attempts to create administrative user
      const qiToken = await loginAs('qi_david');
      const escalateUserRes = await api('/api/users', {
        method: 'POST',
        body: {
          username: 'escalated_admin',
          password: 'Password123!',
          fullName: 'Hacker Admin',
          role: 'PRODUCTION_ENGINEER',
          canManageUsers: true,
        },
      }, qiToken);
      assertStatus(escalateUserRes, 403, 'Privilege escalation rejected');

      // Step 5.3: Cross-tenant / cross-inspector snooping - QI David tries to inspect Sarah tasks
      const peToken = await loginAs('pe_john');
      const sarahReqRes = await api('/api/requests', {
        method: 'POST',
        body: {
          partName: 'Axle Shaft',
          partNumber: 'AX-1002',
          assignedInspectorId: 'usr-qi-2', // Sarah
        },
      }, peToken);
      const sarahReqId = sarahReqRes.data.id;

      const davidSnoopRes = await api(`/api/requests/${sarahReqId}`, {}, qiToken);
      assertStatus(davidSnoopRes, 403, 'Cross-inspector snooping rejected');

      // Step 5.4: Client payload tampering attack - sending overallStatus='OK' with failing values
      const sarahToken = await loginAs('qi_sarah');
      const tamperRes = await api('/api/reports', {
        method: 'POST',
        body: {
          requestId: sarahReqId,
          heatBatchNumber: 'BATCH-TAMPER',
          furnace: 'Furnace-1',
          autoReport: 'AR-TAMPER',
          sampleBatchDate: '2026-10-27',
          bhn: 45.0, // Sub-threshold hardness
          ys: 180.0, // Sub-threshold YS
          uts: 240.0, // Sub-threshold UTS
          elongation: 0.5, // Sub-threshold E
          overallStatus: 'OK', // Attacker attempt to bypass
          hardnessStatus: 'OK',
          mechanicalStatus: 'OK',
          inspectorRemarks: 'Tamper attempt payload',
        },
      }, sarahToken);
      assertStatus(tamperRes, 201, 'Report created');
      assertEqual(tamperRes.data.overallStatus, 'NOT_OK', 'Calculated status overrides client spoofing');
      assertEqual(tamperRes.data.hardnessStatus, 'NOT_OK');
      assertEqual(tamperRes.data.mechanicalStatus, 'NOT_OK');

      // Step 5.5: Double-submission race condition attack
      const doubleSubmitRes = await api('/api/reports', {
        method: 'POST',
        body: {
          requestId: sarahReqId,
          heatBatchNumber: 'BATCH-TAMPER-2',
          furnace: 'Furnace-1',
          autoReport: 'AR-TAMPER-2',
          sampleBatchDate: '2026-10-27',
          bhn: 90.0,
          ys: 250.0,
          uts: 320.0,
          elongation: 2.0,
        },
      }, sarahToken);
      assertStatus(doubleSubmitRes, 409, 'Double submission race condition rejected with 409 Conflict');

      // Step 5.6: Confirm audit logs recorded all operations
      const auditRes = await api('/api/audit', {}, peToken);
      assertStatus(auditRes, 200, 'Audit log check');
      assertTrue(auditRes.data.length > 5, 'Comprehensive audit entries exist');
    },
  },
];
