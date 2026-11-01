// tier2-boundary.test.mjs
// Tier 2: Boundary Value Analysis & Corner Case Tests
// Contains 28 automated boundary tests covering exact cutoffs, negative numbers, remarks invariants, and extreme values.

import {
  api,
  loginAs,
  assertEqual,
  assertStatus,
  assertIncludes,
} from './helpers.mjs';

// Helper to create an assigned request for testing report submission
async function createFreshRequest(peToken, qiId = 'usr-qi-1') {
  const res = await api('/api/requests', {
    method: 'POST',
    body: {
      partName: 'Turbine Blade',
      partNumber: 'TB-2001',
      assignedInspectorId: qiId,
    },
  }, peToken);
  assertStatus(res, 201, 'Create fresh request for boundary test');
  return res.data.id;
}

export const tier2Tests = [
  // --- BHN Boundary Tests: 79.99 vs 80.00 vs 80.01 ---
  {
    id: 'T2-01',
    name: '[BVA-BHN] BHN 79.99 produces Hardness Status NOT_OK',
    fn: async () => {
      const peToken = await loginAs('pe_john');
      const qiToken = await loginAs('qi_david');
      const reqId = await createFreshRequest(peToken);

      const res = await api('/api/reports', {
        method: 'POST',
        body: {
          requestId: reqId,
          heatBatchNumber: 'BVA-01',
          furnace: 'Furnace-1',
          autoReport: 'AR-01',
          sampleBatchDate: '2026-10-27',
          bhn: 79.99,
          ys: 240.0,
          uts: 300.0,
          elongation: 2.0,
          inspectorRemarks: 'BHN just below threshold 80.00',
        },
      }, qiToken);
      assertStatus(res, 201, 'Submit report BHN 79.99');
      assertEqual(res.data.hardnessStatus, 'NOT_OK');
    },
  },

  {
    id: 'T2-02',
    name: '[BVA-BHN] BHN 80.00 produces Hardness Status OK (Exact boundary)',
    fn: async () => {
      const peToken = await loginAs('pe_john');
      const qiToken = await loginAs('qi_david');
      const reqId = await createFreshRequest(peToken);

      const res = await api('/api/reports', {
        method: 'POST',
        body: {
          requestId: reqId,
          heatBatchNumber: 'BVA-02',
          furnace: 'Furnace-1',
          autoReport: 'AR-02',
          sampleBatchDate: '2026-10-27',
          bhn: 80.0,
          ys: 240.0,
          uts: 300.0,
          elongation: 2.0,
        },
      }, qiToken);
      assertStatus(res, 201, 'Submit report BHN 80.00');
      assertEqual(res.data.hardnessStatus, 'OK');
    },
  },

  {
    id: 'T2-03',
    name: '[BVA-BHN] BHN 80.01 produces Hardness Status OK',
    fn: async () => {
      const peToken = await loginAs('pe_john');
      const qiToken = await loginAs('qi_david');
      const reqId = await createFreshRequest(peToken);

      const res = await api('/api/reports', {
        method: 'POST',
        body: {
          requestId: reqId,
          heatBatchNumber: 'BVA-03',
          furnace: 'Furnace-1',
          autoReport: 'AR-03',
          sampleBatchDate: '2026-10-27',
          bhn: 80.01,
          ys: 240.0,
          uts: 300.0,
          elongation: 2.0,
        },
      }, qiToken);
      assertStatus(res, 201, 'Submit report BHN 80.01');
      assertEqual(res.data.hardnessStatus, 'OK');
    },
  },

  // --- YS Boundary Tests: 219.9 vs 220.0 vs 220.1 ---
  {
    id: 'T2-04',
    name: '[BVA-YS] YS 219.9 MPa produces Mechanical Status NOT_OK',
    fn: async () => {
      const peToken = await loginAs('pe_john');
      const qiToken = await loginAs('qi_david');
      const reqId = await createFreshRequest(peToken);

      const res = await api('/api/reports', {
        method: 'POST',
        body: {
          requestId: reqId,
          heatBatchNumber: 'BVA-04',
          furnace: 'Furnace-1',
          autoReport: 'AR-04',
          sampleBatchDate: '2026-10-27',
          bhn: 85.0,
          ys: 219.9,
          uts: 300.0,
          elongation: 2.0,
          inspectorRemarks: 'YS just below threshold 220 MPa',
        },
      }, qiToken);
      assertStatus(res, 201, 'Submit report YS 219.9');
      assertEqual(res.data.mechanicalStatus, 'NOT_OK');
    },
  },

  {
    id: 'T2-05',
    name: '[BVA-YS] YS 220.0 MPa produces Mechanical Status OK (Exact boundary)',
    fn: async () => {
      const peToken = await loginAs('pe_john');
      const qiToken = await loginAs('qi_david');
      const reqId = await createFreshRequest(peToken);

      const res = await api('/api/reports', {
        method: 'POST',
        body: {
          requestId: reqId,
          heatBatchNumber: 'BVA-05',
          furnace: 'Furnace-1',
          autoReport: 'AR-05',
          sampleBatchDate: '2026-10-27',
          bhn: 85.0,
          ys: 220.0,
          uts: 300.0,
          elongation: 2.0,
        },
      }, qiToken);
      assertStatus(res, 201, 'Submit report YS 220.0');
      assertEqual(res.data.mechanicalStatus, 'OK');
    },
  },

  {
    id: 'T2-06',
    name: '[BVA-YS] YS 220.1 MPa produces Mechanical Status OK',
    fn: async () => {
      const peToken = await loginAs('pe_john');
      const qiToken = await loginAs('qi_david');
      const reqId = await createFreshRequest(peToken);

      const res = await api('/api/reports', {
        method: 'POST',
        body: {
          requestId: reqId,
          heatBatchNumber: 'BVA-06',
          furnace: 'Furnace-1',
          autoReport: 'AR-06',
          sampleBatchDate: '2026-10-27',
          bhn: 85.0,
          ys: 220.1,
          uts: 300.0,
          elongation: 2.0,
        },
      }, qiToken);
      assertStatus(res, 201, 'Submit report YS 220.1');
      assertEqual(res.data.mechanicalStatus, 'OK');
    },
  },

  // --- UTS Boundary Tests: 279.9 vs 280.0 vs 280.1 ---
  {
    id: 'T2-07',
    name: '[BVA-UTS] UTS 279.9 MPa produces Mechanical Status NOT_OK',
    fn: async () => {
      const peToken = await loginAs('pe_john');
      const qiToken = await loginAs('qi_david');
      const reqId = await createFreshRequest(peToken);

      const res = await api('/api/reports', {
        method: 'POST',
        body: {
          requestId: reqId,
          heatBatchNumber: 'BVA-07',
          furnace: 'Furnace-1',
          autoReport: 'AR-07',
          sampleBatchDate: '2026-10-27',
          bhn: 85.0,
          ys: 240.0,
          uts: 279.9,
          elongation: 2.0,
          inspectorRemarks: 'UTS just below 280 MPa',
        },
      }, qiToken);
      assertStatus(res, 201, 'Submit report UTS 279.9');
      assertEqual(res.data.mechanicalStatus, 'NOT_OK');
    },
  },

  {
    id: 'T2-08',
    name: '[BVA-UTS] UTS 280.0 MPa produces Mechanical Status OK (Exact boundary)',
    fn: async () => {
      const peToken = await loginAs('pe_john');
      const qiToken = await loginAs('qi_david');
      const reqId = await createFreshRequest(peToken);

      const res = await api('/api/reports', {
        method: 'POST',
        body: {
          requestId: reqId,
          heatBatchNumber: 'BVA-08',
          furnace: 'Furnace-1',
          autoReport: 'AR-08',
          sampleBatchDate: '2026-10-27',
          bhn: 85.0,
          ys: 240.0,
          uts: 280.0,
          elongation: 2.0,
        },
      }, qiToken);
      assertStatus(res, 201, 'Submit report UTS 280.0');
      assertEqual(res.data.mechanicalStatus, 'OK');
    },
  },

  {
    id: 'T2-09',
    name: '[BVA-UTS] UTS 280.1 MPa produces Mechanical Status OK',
    fn: async () => {
      const peToken = await loginAs('pe_john');
      const qiToken = await loginAs('qi_david');
      const reqId = await createFreshRequest(peToken);

      const res = await api('/api/reports', {
        method: 'POST',
        body: {
          requestId: reqId,
          heatBatchNumber: 'BVA-09',
          furnace: 'Furnace-1',
          autoReport: 'AR-09',
          sampleBatchDate: '2026-10-27',
          bhn: 85.0,
          ys: 240.0,
          uts: 280.1,
          elongation: 2.0,
        },
      }, qiToken);
      assertStatus(res, 201, 'Submit report UTS 280.1');
      assertEqual(res.data.mechanicalStatus, 'OK');
    },
  },

  // --- Elongation Boundary Tests: 0.99% vs 1.00% vs 1.01% ---
  {
    id: 'T2-10',
    name: '[BVA-E] Elongation 0.99% produces Mechanical Status NOT_OK',
    fn: async () => {
      const peToken = await loginAs('pe_john');
      const qiToken = await loginAs('qi_david');
      const reqId = await createFreshRequest(peToken);

      const res = await api('/api/reports', {
        method: 'POST',
        body: {
          requestId: reqId,
          heatBatchNumber: 'BVA-10',
          furnace: 'Furnace-1',
          autoReport: 'AR-10',
          sampleBatchDate: '2026-10-27',
          bhn: 85.0,
          ys: 240.0,
          uts: 300.0,
          elongation: 0.99,
          inspectorRemarks: 'Elongation below 1.00%',
        },
      }, qiToken);
      assertStatus(res, 201, 'Submit report E 0.99');
      assertEqual(res.data.mechanicalStatus, 'NOT_OK');
    },
  },

  {
    id: 'T2-11',
    name: '[BVA-E] Elongation 1.00% produces Mechanical Status OK (Exact boundary)',
    fn: async () => {
      const peToken = await loginAs('pe_john');
      const qiToken = await loginAs('qi_david');
      const reqId = await createFreshRequest(peToken);

      const res = await api('/api/reports', {
        method: 'POST',
        body: {
          requestId: reqId,
          heatBatchNumber: 'BVA-11',
          furnace: 'Furnace-1',
          autoReport: 'AR-11',
          sampleBatchDate: '2026-10-27',
          bhn: 85.0,
          ys: 240.0,
          uts: 300.0,
          elongation: 1.0,
        },
      }, qiToken);
      assertStatus(res, 201, 'Submit report E 1.00');
      assertEqual(res.data.mechanicalStatus, 'OK');
    },
  },

  {
    id: 'T2-12',
    name: '[BVA-E] Elongation 1.01% produces Mechanical Status OK',
    fn: async () => {
      const peToken = await loginAs('pe_john');
      const qiToken = await loginAs('qi_david');
      const reqId = await createFreshRequest(peToken);

      const res = await api('/api/reports', {
        method: 'POST',
        body: {
          requestId: reqId,
          heatBatchNumber: 'BVA-12',
          furnace: 'Furnace-1',
          autoReport: 'AR-12',
          sampleBatchDate: '2026-10-27',
          bhn: 85.0,
          ys: 240.0,
          uts: 300.0,
          elongation: 1.01,
        },
      }, qiToken);
      assertStatus(res, 201, 'Submit report E 1.01');
      assertEqual(res.data.mechanicalStatus, 'OK');
    },
  },

  // --- Exact Quad Boundary Convergence ---
  {
    id: 'T2-13',
    name: '[BVA-QUAD] Full Exact Boundary Convergence (BHN=80.00, YS=220.0, UTS=280.0, E=1.00%) produces Overall Status OK',
    fn: async () => {
      const peToken = await loginAs('pe_john');
      const qiToken = await loginAs('qi_david');
      const reqId = await createFreshRequest(peToken);

      const res = await api('/api/reports', {
        method: 'POST',
        body: {
          requestId: reqId,
          heatBatchNumber: 'BVA-13',
          furnace: 'Furnace-Quad',
          autoReport: 'AR-13',
          sampleBatchDate: '2026-10-27',
          bhn: 80.0,
          ys: 220.0,
          uts: 280.0,
          elongation: 1.0,
        },
      }, qiToken);
      assertStatus(res, 201, 'Submit quad boundary report');
      assertEqual(res.data.hardnessStatus, 'OK');
      assertEqual(res.data.mechanicalStatus, 'OK');
      assertEqual(res.data.overallStatus, 'OK');
    },
  },

  // --- Combinatorial Single Flaw Failures ---
  {
    id: 'T2-14',
    name: '[BVA-FLAW] Single Flaw: BHN 79.99 with all other metrics passing produces Overall Status NOT_OK',
    fn: async () => {
      const peToken = await loginAs('pe_john');
      const qiToken = await loginAs('qi_david');
      const reqId = await createFreshRequest(peToken);

      const res = await api('/api/reports', {
        method: 'POST',
        body: {
          requestId: reqId,
          heatBatchNumber: 'BVA-14',
          furnace: 'Furnace-Quad',
          autoReport: 'AR-14',
          sampleBatchDate: '2026-10-27',
          bhn: 79.99, // Fails
          ys: 220.0,
          uts: 280.0,
          elongation: 1.0,
          inspectorRemarks: 'Hardness below threshold',
        },
      }, qiToken);
      assertStatus(res, 201);
      assertEqual(res.data.hardnessStatus, 'NOT_OK');
      assertEqual(res.data.mechanicalStatus, 'OK');
      assertEqual(res.data.overallStatus, 'NOT_OK');
    },
  },

  {
    id: 'T2-15',
    name: '[BVA-FLAW] Single Flaw: YS 219.9 with all other metrics passing produces Overall Status NOT_OK',
    fn: async () => {
      const peToken = await loginAs('pe_john');
      const qiToken = await loginAs('qi_david');
      const reqId = await createFreshRequest(peToken);

      const res = await api('/api/reports', {
        method: 'POST',
        body: {
          requestId: reqId,
          heatBatchNumber: 'BVA-15',
          furnace: 'Furnace-Quad',
          autoReport: 'AR-15',
          sampleBatchDate: '2026-10-27',
          bhn: 80.0,
          ys: 219.9, // Fails
          uts: 280.0,
          elongation: 1.0,
          inspectorRemarks: 'YS below threshold',
        },
      }, qiToken);
      assertStatus(res, 201);
      assertEqual(res.data.hardnessStatus, 'OK');
      assertEqual(res.data.mechanicalStatus, 'NOT_OK');
      assertEqual(res.data.overallStatus, 'NOT_OK');
    },
  },

  {
    id: 'T2-16',
    name: '[BVA-FLAW] Single Flaw: UTS 279.9 with all other metrics passing produces Overall Status NOT_OK',
    fn: async () => {
      const peToken = await loginAs('pe_john');
      const qiToken = await loginAs('qi_david');
      const reqId = await createFreshRequest(peToken);

      const res = await api('/api/reports', {
        method: 'POST',
        body: {
          requestId: reqId,
          heatBatchNumber: 'BVA-16',
          furnace: 'Furnace-Quad',
          autoReport: 'AR-16',
          sampleBatchDate: '2026-10-27',
          bhn: 80.0,
          ys: 220.0,
          uts: 279.9, // Fails
          elongation: 1.0,
          inspectorRemarks: 'UTS below threshold',
        },
      }, qiToken);
      assertStatus(res, 201);
      assertEqual(res.data.hardnessStatus, 'OK');
      assertEqual(res.data.mechanicalStatus, 'NOT_OK');
      assertEqual(res.data.overallStatus, 'NOT_OK');
    },
  },

  {
    id: 'T2-17',
    name: '[BVA-FLAW] Single Flaw: Elongation 0.99% with all other metrics passing produces Overall Status NOT_OK',
    fn: async () => {
      const peToken = await loginAs('pe_john');
      const qiToken = await loginAs('qi_david');
      const reqId = await createFreshRequest(peToken);

      const res = await api('/api/reports', {
        method: 'POST',
        body: {
          requestId: reqId,
          heatBatchNumber: 'BVA-17',
          furnace: 'Furnace-Quad',
          autoReport: 'AR-17',
          sampleBatchDate: '2026-10-27',
          bhn: 80.0,
          ys: 220.0,
          uts: 280.0,
          elongation: 0.99, // Fails
          inspectorRemarks: 'Elongation below threshold',
        },
      }, qiToken);
      assertStatus(res, 201);
      assertEqual(res.data.hardnessStatus, 'OK');
      assertEqual(res.data.mechanicalStatus, 'NOT_OK');
      assertEqual(res.data.overallStatus, 'NOT_OK');
    },
  },

  // --- Negative Value Rejections ---
  {
    id: 'T2-18',
    name: '[BVA-NEG] Negative BHN (-0.01) is rejected with HTTP 400 Bad Request',
    fn: async () => {
      const peToken = await loginAs('pe_john');
      const qiToken = await loginAs('qi_david');
      const reqId = await createFreshRequest(peToken);

      const res = await api('/api/reports', {
        method: 'POST',
        body: {
          requestId: reqId,
          heatBatchNumber: 'BVA-NEG-1',
          furnace: 'Furnace-1',
          autoReport: 'AR-NEG1',
          sampleBatchDate: '2026-10-27',
          bhn: -0.01,
          ys: 220.0,
          uts: 280.0,
          elongation: 1.0,
        },
      }, qiToken);
      assertStatus(res, 400, 'Negative BHN rejected');
      assertIncludes(res.data.message, 'Negative');
    },
  },

  {
    id: 'T2-19',
    name: '[BVA-NEG] Negative YS (-1.0) is rejected with HTTP 400 Bad Request',
    fn: async () => {
      const peToken = await loginAs('pe_john');
      const qiToken = await loginAs('qi_david');
      const reqId = await createFreshRequest(peToken);

      const res = await api('/api/reports', {
        method: 'POST',
        body: {
          requestId: reqId,
          heatBatchNumber: 'BVA-NEG-2',
          furnace: 'Furnace-1',
          autoReport: 'AR-NEG2',
          sampleBatchDate: '2026-10-27',
          bhn: 80.0,
          ys: -1.0,
          uts: 280.0,
          elongation: 1.0,
        },
      }, qiToken);
      assertStatus(res, 400, 'Negative YS rejected');
    },
  },

  {
    id: 'T2-20',
    name: '[BVA-NEG] Negative UTS (-5.0) is rejected with HTTP 400 Bad Request',
    fn: async () => {
      const peToken = await loginAs('pe_john');
      const qiToken = await loginAs('qi_david');
      const reqId = await createFreshRequest(peToken);

      const res = await api('/api/reports', {
        method: 'POST',
        body: {
          requestId: reqId,
          heatBatchNumber: 'BVA-NEG-3',
          furnace: 'Furnace-1',
          autoReport: 'AR-NEG3',
          sampleBatchDate: '2026-10-27',
          bhn: 80.0,
          ys: 220.0,
          uts: -5.0,
          elongation: 1.0,
        },
      }, qiToken);
      assertStatus(res, 400, 'Negative UTS rejected');
    },
  },

  {
    id: 'T2-21',
    name: '[BVA-NEG] Negative Elongation (-0.5%) is rejected with HTTP 400 Bad Request',
    fn: async () => {
      const peToken = await loginAs('pe_john');
      const qiToken = await loginAs('qi_david');
      const reqId = await createFreshRequest(peToken);

      const res = await api('/api/reports', {
        method: 'POST',
        body: {
          requestId: reqId,
          heatBatchNumber: 'BVA-NEG-4',
          furnace: 'Furnace-1',
          autoReport: 'AR-NEG4',
          sampleBatchDate: '2026-10-27',
          bhn: 80.0,
          ys: 220.0,
          uts: 280.0,
          elongation: -0.5,
        },
      }, qiToken);
      assertStatus(res, 400, 'Negative elongation rejected');
    },
  },

  // --- Inspector Remarks Invariant Boundaries ---
  {
    id: 'T2-22',
    name: '[BVA-REMARKS] Empty string remarks ("") on Not OK rejected with HTTP 400',
    fn: async () => {
      const peToken = await loginAs('pe_john');
      const qiToken = await loginAs('qi_david');
      const reqId = await createFreshRequest(peToken);

      const res = await api('/api/reports', {
        method: 'POST',
        body: {
          requestId: reqId,
          heatBatchNumber: 'BVA-REM-1',
          furnace: 'Furnace-1',
          autoReport: 'AR-REM1',
          sampleBatchDate: '2026-10-27',
          bhn: 70.0,
          ys: 200.0,
          uts: 250.0,
          elongation: 0.5,
          inspectorRemarks: '',
        },
      }, qiToken);
      assertStatus(res, 400, 'Empty remarks on Not OK rejected');
    },
  },

  {
    id: 'T2-23',
    name: '[BVA-REMARKS] Whitespace-only remarks ("   \\t\\n  ") on Not OK rejected with HTTP 400',
    fn: async () => {
      const peToken = await loginAs('pe_john');
      const qiToken = await loginAs('qi_david');
      const reqId = await createFreshRequest(peToken);

      const res = await api('/api/reports', {
        method: 'POST',
        body: {
          requestId: reqId,
          heatBatchNumber: 'BVA-REM-2',
          furnace: 'Furnace-1',
          autoReport: 'AR-REM2',
          sampleBatchDate: '2026-10-27',
          bhn: 70.0,
          ys: 200.0,
          uts: 250.0,
          elongation: 0.5,
          inspectorRemarks: '   \t\n  ',
        },
      }, qiToken);
      assertStatus(res, 400, 'Whitespace remarks on Not OK rejected');
    },
  },

  {
    id: 'T2-24',
    name: '[BVA-REMARKS] Non-empty single character remarks ("A") on Not OK accepted with HTTP 201',
    fn: async () => {
      const peToken = await loginAs('pe_john');
      const qiToken = await loginAs('qi_david');
      const reqId = await createFreshRequest(peToken);

      const res = await api('/api/reports', {
        method: 'POST',
        body: {
          requestId: reqId,
          heatBatchNumber: 'BVA-REM-3',
          furnace: 'Furnace-1',
          autoReport: 'AR-REM3',
          sampleBatchDate: '2026-10-27',
          bhn: 70.0,
          ys: 200.0,
          uts: 250.0,
          elongation: 0.5,
          inspectorRemarks: 'A',
        },
      }, qiToken);
      assertStatus(res, 201, 'Single character remarks on Not OK accepted');
      assertEqual(res.data.overallStatus, 'NOT_OK');
    },
  },

  {
    id: 'T2-25',
    name: '[BVA-REMARKS] Empty string remarks ("") on OK status accepted with HTTP 201 Created',
    fn: async () => {
      const peToken = await loginAs('pe_john');
      const qiToken = await loginAs('qi_david');
      const reqId = await createFreshRequest(peToken);

      const res = await api('/api/reports', {
        method: 'POST',
        body: {
          requestId: reqId,
          heatBatchNumber: 'BVA-REM-4',
          furnace: 'Furnace-1',
          autoReport: 'AR-REM4',
          sampleBatchDate: '2026-10-27',
          bhn: 85.0,
          ys: 230.0,
          uts: 290.0,
          elongation: 1.5,
          inspectorRemarks: '', // Optional for OK
        },
      }, qiToken);
      assertStatus(res, 201, 'Empty remarks on OK accepted');
      assertEqual(res.data.overallStatus, 'OK');
    },
  },

  // --- Zero & Extreme Values ---
  {
    id: 'T2-26',
    name: '[BVA-EXTREME] Zero Values (BHN=0, YS=0, UTS=0, E=0) calculates as NOT_OK',
    fn: async () => {
      const peToken = await loginAs('pe_john');
      const qiToken = await loginAs('qi_david');
      const reqId = await createFreshRequest(peToken);

      const res = await api('/api/reports', {
        method: 'POST',
        body: {
          requestId: reqId,
          heatBatchNumber: 'BVA-ZERO',
          furnace: 'Furnace-1',
          autoReport: 'AR-ZERO',
          sampleBatchDate: '2026-10-27',
          bhn: 0,
          ys: 0,
          uts: 0,
          elongation: 0,
          inspectorRemarks: 'All properties zero',
        },
      }, qiToken);
      assertStatus(res, 201, 'Zero values submitted');
      assertEqual(res.data.hardnessStatus, 'NOT_OK');
      assertEqual(res.data.mechanicalStatus, 'NOT_OK');
      assertEqual(res.data.overallStatus, 'NOT_OK');
    },
  },

  {
    id: 'T2-27',
    name: '[BVA-EXTREME] Extreme High Values (BHN=999.9, YS=2500, UTS=3500, E=50.0%) accepted and calculated as OK',
    fn: async () => {
      const peToken = await loginAs('pe_john');
      const qiToken = await loginAs('qi_david');
      const reqId = await createFreshRequest(peToken);

      const res = await api('/api/reports', {
        method: 'POST',
        body: {
          requestId: reqId,
          heatBatchNumber: 'BVA-MAX',
          furnace: 'Furnace-1',
          autoReport: 'AR-MAX',
          sampleBatchDate: '2026-10-27',
          bhn: 999.9,
          ys: 2500.0,
          uts: 3500.0,
          elongation: 50.0,
        },
      }, qiToken);
      assertStatus(res, 201, 'Extreme values accepted');
      assertEqual(res.data.overallStatus, 'OK');
    },
  },

  {
    id: 'T2-28',
    name: '[BVA-DATE] Malformed date string ("invalid-date-format") is rejected with HTTP 400 Bad Request',
    fn: async () => {
      const peToken = await loginAs('pe_john');
      const qiToken = await loginAs('qi_david');
      const reqId = await createFreshRequest(peToken);

      const res = await api('/api/reports', {
        method: 'POST',
        body: {
          requestId: reqId,
          heatBatchNumber: 'BVA-DATE',
          furnace: 'Furnace-1',
          autoReport: 'AR-DATE',
          sampleBatchDate: 'invalid-date-format',
          bhn: 85.0,
          ys: 230.0,
          uts: 290.0,
          elongation: 1.5,
        },
      }, qiToken);
      assertStatus(res, 400, 'Invalid date rejected');
    },
  },
];
