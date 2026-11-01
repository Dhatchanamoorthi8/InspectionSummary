// challenger-adversarial.mjs
// Empirical Challenger independent adversarial test suite
// Directly stress-tests all critical invariants against live NestJS server on port 3000

import { api, loginAs, assert, assertEqual, assertTrue, assertStatus, setupTestEnvironment } from './helpers.mjs';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

async function runAdversarialSuite() {
  await setupTestEnvironment(BASE_URL);
  console.log(`\n============================================================`);
  console.log(` EMPIRICAL CHALLENGER: ADVERSARIAL STRESS & CONTRACT HARNESS`);
  console.log(` Target Server: ${BASE_URL}`);
  console.log(` Timestamp: ${new Date().toISOString()}`);
  console.log(`============================================================\n`);

  let passed = 0;
  let failed = 0;

  async function test(name, fn) {
    try {
      await fn();
      console.log(`  [PASS] ${name}`);
      passed++;
    } catch (err) {
      console.error(`  [FAIL] ${name}: ${err.message}`);
      failed++;
    }
  }

  // Tokens
  const peToken = await loginAs('pe_john', 'Password123!');
  const peMaryToken = await loginAs('pe_mary', 'Password123!');
  const qiDavidToken = await loginAs('qi_david', 'Password123!');
  const qiSarahToken = await loginAs('qi_sarah', 'Password123!');

  // Ensure active part exists
  const partRes = await api('/api/parts', {}, peToken);
  let activePart = partRes.data.find(p => p.isActive);
  if (!activePart) {
    const createPart = await api('/api/parts', {
      method: 'POST',
      body: { partName: 'Pinion Shaft', partNumber: 'PS-ADV-01' },
    }, peToken);
    activePart = createPart.data;
  }

  // --- 1. HARDNESS BOUNDARY (BHN 79.99 vs 80.00) ---
  await test('ADV-01: BHN 79.999 produces Hardness Status NOT_OK & Overall NOT_OK', async () => {
    const req = await api('/api/requests', {
      method: 'POST',
      body: { partName: activePart.partName, partNumber: activePart.partNumber, assignedInspectorId: 'usr-qi-1' }
    }, peToken);
    const reqId = req.data.id;

    await api(`/api/requests/${reqId}/start`, { method: 'PATCH' }, qiDavidToken);

    const reportRes = await api('/api/reports', {
      method: 'POST',
      body: {
        requestId: reqId,
        heatBatchNumber: 'BATCH-ADV-01',
        furnace: 'Furnace-1',
        autoReport: 'RPT-ADV-01',
        sampleBatchDate: '2026-10-27',
        bhn: 79.999,
        ys: 300,
        uts: 400,
        elongation: 5.0,
        inspectorRemarks: 'Hardness below threshold'
      }
    }, qiDavidToken);

    assertStatus(reportRes, 201);
    assertEqual(reportRes.data.hardnessStatus, 'NOT_OK', 'Hardness status must be NOT_OK');
    assertEqual(reportRes.data.mechanicalStatus, 'OK', 'Mechanical status must be OK');
    assertEqual(reportRes.data.overallStatus, 'NOT_OK', 'Overall status must be NOT_OK');
  });

  await test('ADV-02: BHN 80.000 produces Hardness Status OK & Overall OK', async () => {
    const req = await api('/api/requests', {
      method: 'POST',
      body: { partName: activePart.partName, partNumber: activePart.partNumber, assignedInspectorId: 'usr-qi-1' }
    }, peToken);
    const reqId = req.data.id;

    await api(`/api/requests/${reqId}/start`, { method: 'PATCH' }, qiDavidToken);

    const reportRes = await api('/api/reports', {
      method: 'POST',
      body: {
        requestId: reqId,
        heatBatchNumber: 'BATCH-ADV-02',
        furnace: 'Furnace-1',
        autoReport: 'RPT-ADV-02',
        sampleBatchDate: '2026-10-27',
        bhn: 80.000,
        ys: 220,
        uts: 280,
        elongation: 1.0,
      }
    }, qiDavidToken);

    assertStatus(reportRes, 201);
    assertEqual(reportRes.data.hardnessStatus, 'OK', 'Hardness status must be OK');
    assertEqual(reportRes.data.mechanicalStatus, 'OK', 'Mechanical status must be OK');
    assertEqual(reportRes.data.overallStatus, 'OK', 'Overall status must be OK');
  });

  // --- 2. MECHANICAL BOUNDARIES (YS 219.99 vs 220, UTS 279.99 vs 280, E 0.999 vs 1.000) ---
  await test('ADV-03: YS 219.999 produces Mechanical NOT_OK', async () => {
    const req = await api('/api/requests', {
      method: 'POST',
      body: { partName: activePart.partName, partNumber: activePart.partNumber, assignedInspectorId: 'usr-qi-1' }
    }, peToken);
    await api(`/api/requests/${req.data.id}/start`, { method: 'PATCH' }, qiDavidToken);

    const reportRes = await api('/api/reports', {
      method: 'POST',
      body: {
        requestId: req.data.id,
        heatBatchNumber: 'BATCH-ADV-03',
        furnace: 'Furnace-1',
        autoReport: 'RPT-ADV-03',
        sampleBatchDate: '2026-10-27',
        bhn: 85,
        ys: 219.999,
        uts: 300,
        elongation: 2.0,
        inspectorRemarks: 'Sub-yield failure'
      }
    }, qiDavidToken);

    assertStatus(reportRes, 201);
    assertEqual(reportRes.data.mechanicalStatus, 'NOT_OK');
    assertEqual(reportRes.data.overallStatus, 'NOT_OK');
  });

  await test('ADV-04: UTS 279.999 produces Mechanical NOT_OK', async () => {
    const req = await api('/api/requests', {
      method: 'POST',
      body: { partName: activePart.partName, partNumber: activePart.partNumber, assignedInspectorId: 'usr-qi-1' }
    }, peToken);
    await api(`/api/requests/${req.data.id}/start`, { method: 'PATCH' }, qiDavidToken);

    const reportRes = await api('/api/reports', {
      method: 'POST',
      body: {
        requestId: req.data.id,
        heatBatchNumber: 'BATCH-ADV-04',
        furnace: 'Furnace-1',
        autoReport: 'RPT-ADV-04',
        sampleBatchDate: '2026-10-27',
        bhn: 85,
        ys: 250,
        uts: 279.999,
        elongation: 2.0,
        inspectorRemarks: 'Sub-UTS failure'
      }
    }, qiDavidToken);

    assertStatus(reportRes, 201);
    assertEqual(reportRes.data.mechanicalStatus, 'NOT_OK');
    assertEqual(reportRes.data.overallStatus, 'NOT_OK');
  });

  await test('ADV-05: Elongation 0.999% produces Mechanical NOT_OK', async () => {
    const req = await api('/api/requests', {
      method: 'POST',
      body: { partName: activePart.partName, partNumber: activePart.partNumber, assignedInspectorId: 'usr-qi-1' }
    }, peToken);
    await api(`/api/requests/${req.data.id}/start`, { method: 'PATCH' }, qiDavidToken);

    const reportRes = await api('/api/reports', {
      method: 'POST',
      body: {
        requestId: req.data.id,
        heatBatchNumber: 'BATCH-ADV-05',
        furnace: 'Furnace-1',
        autoReport: 'RPT-ADV-05',
        sampleBatchDate: '2026-10-27',
        bhn: 85,
        ys: 250,
        uts: 300,
        elongation: 0.999,
        inspectorRemarks: 'Sub-elongation failure'
      }
    }, qiDavidToken);

    assertStatus(reportRes, 201);
    assertEqual(reportRes.data.mechanicalStatus, 'NOT_OK');
    assertEqual(reportRes.data.overallStatus, 'NOT_OK');
  });

  // --- 3. CALCULATED FIELDS IMMUNITY (PAYLOAD TAMPERING) ---
  await test('ADV-06: Client injecting overallStatus="OK" on failing measurements is overridden', async () => {
    const req = await api('/api/requests', {
      method: 'POST',
      body: { partName: activePart.partName, partNumber: activePart.partNumber, assignedInspectorId: 'usr-qi-1' }
    }, peToken);
    await api(`/api/requests/${req.data.id}/start`, { method: 'PATCH' }, qiDavidToken);

    const reportRes = await api('/api/reports', {
      method: 'POST',
      body: {
        requestId: req.data.id,
        heatBatchNumber: 'BATCH-ADV-06',
        furnace: 'Furnace-1',
        autoReport: 'RPT-ADV-06',
        sampleBatchDate: '2026-10-27',
        bhn: 50, // Failing
        ys: 150, // Failing
        uts: 200, // Failing
        elongation: 0.5, // Failing
        overallStatus: 'OK', // Hostile override attempt
        hardnessStatus: 'OK',
        mechanicalStatus: 'OK',
        inspectorRemarks: 'Attempted spoof'
      }
    }, qiDavidToken);

    assertStatus(reportRes, 201);
    assertEqual(reportRes.data.hardnessStatus, 'NOT_OK');
    assertEqual(reportRes.data.mechanicalStatus, 'NOT_OK');
    assertEqual(reportRes.data.overallStatus, 'NOT_OK', 'Spoofed overallStatus must be overwritten to NOT_OK');

    // Verify stored entity in GET /api/reports/:id
    const fetched = await api(`/api/reports/${reportRes.data.id}`, {}, qiDavidToken);
    assertEqual(fetched.data.overallStatus, 'NOT_OK', 'Persisted report entity must remain NOT_OK');
  });

  // --- 4. MANDATORY REMARKS INVARIANT ---
  await test('ADV-07: Submitting failing report without remarks is rejected with HTTP 400', async () => {
    const req = await api('/api/requests', {
      method: 'POST',
      body: { partName: activePart.partName, partNumber: activePart.partNumber, assignedInspectorId: 'usr-qi-1' }
    }, peToken);
    await api(`/api/requests/${req.data.id}/start`, { method: 'PATCH' }, qiDavidToken);

    const reportRes = await api('/api/reports', {
      method: 'POST',
      body: {
        requestId: req.data.id,
        heatBatchNumber: 'BATCH-ADV-07',
        furnace: 'Furnace-1',
        autoReport: 'RPT-ADV-07',
        sampleBatchDate: '2026-10-27',
        bhn: 70, // Failing
        ys: 250,
        uts: 300,
        elongation: 2.0,
        inspectorRemarks: '' // Empty remarks
      }
    }, qiDavidToken);

    assertStatus(reportRes, 400, 'Empty remarks on NOT_OK must fail');
  });

  await test('ADV-08: Submitting failing report with only whitespace remarks is rejected with HTTP 400', async () => {
    const req = await api('/api/requests', {
      method: 'POST',
      body: { partName: activePart.partName, partNumber: activePart.partNumber, assignedInspectorId: 'usr-qi-1' }
    }, peToken);
    await api(`/api/requests/${req.data.id}/start`, { method: 'PATCH' }, qiDavidToken);

    const reportRes = await api('/api/reports', {
      method: 'POST',
      body: {
        requestId: req.data.id,
        heatBatchNumber: 'BATCH-ADV-08',
        furnace: 'Furnace-1',
        autoReport: 'RPT-ADV-08',
        sampleBatchDate: '2026-10-27',
        bhn: 70, // Failing
        ys: 250,
        uts: 300,
        elongation: 2.0,
        inspectorRemarks: '     \t  \n  ' // Whitespace only
      }
    }, qiDavidToken);

    assertStatus(reportRes, 400, 'Whitespace remarks on NOT_OK must fail');
  });

  // --- 5. ROLE BOUNDARIES & RBAC ---
  await test('ADV-09: Production Engineer cannot submit inspection report (HTTP 403)', async () => {
    const req = await api('/api/requests', {
      method: 'POST',
      body: { partName: activePart.partName, partNumber: activePart.partNumber, assignedInspectorId: 'usr-qi-1' }
    }, peToken);

    const reportRes = await api('/api/reports', {
      method: 'POST',
      body: {
        requestId: req.data.id,
        heatBatchNumber: 'BATCH-PE',
        furnace: 'Furnace-1',
        autoReport: 'RPT-PE',
        sampleBatchDate: '2026-10-27',
        bhn: 90,
        ys: 250,
        uts: 300,
        elongation: 2.0,
      }
    }, peToken);

    assertStatus(reportRes, 403, 'PE cannot submit report');
  });

  await test('ADV-10: Quality Inspector cannot create inspection request (HTTP 403)', async () => {
    const res = await api('/api/requests', {
      method: 'POST',
      body: { partName: activePart.partName, partNumber: activePart.partNumber }
    }, qiDavidToken);
    assertStatus(res, 403, 'QI cannot create request');
  });

  await test('ADV-11: Quality Inspector cannot manage Part Master (HTTP 403)', async () => {
    const res = await api('/api/parts', {
      method: 'POST',
      body: { partName: 'Illegal Part', partNumber: 'IP-01' }
    }, qiDavidToken);
    assertStatus(res, 403, 'QI cannot create part');
  });

  await test('ADV-12: Quality Inspector cannot access /api/users (HTTP 403)', async () => {
    const res = await api('/api/users', {}, qiDavidToken);
    assertStatus(res, 403, 'QI cannot access users');
  });

  await test('ADV-13: Production Engineer without canManageUsers cannot create users (HTTP 403)', async () => {
    const res = await api('/api/users', {
      method: 'POST',
      body: {
        username: 'unauth_user',
        password: 'Password123!',
        fullName: 'Unauth User',
        role: 'QUALITY_INSPECTOR'
      }
    }, peMaryToken);
    assertStatus(res, 403, 'PE without flag cannot create users');
  });

  // --- 6. TASK OWNERSHIP ISOLATION & REASSIGNMENT ---
  await test('ADV-14: Ownership isolation (HTTP 403 for other inspector tasks)', async () => {
    // Request assigned to David
    const req = await api('/api/requests', {
      method: 'POST',
      body: { partName: activePart.partName, partNumber: activePart.partNumber, assignedInspectorId: 'usr-qi-1' }
    }, peToken);
    const reqId = req.data.id;

    // Sarah attempts to view
    const viewRes = await api(`/api/requests/${reqId}`, {}, qiSarahToken);
    assertStatus(viewRes, 403, 'Sarah viewing David task');

    // Sarah attempts to start
    const startRes = await api(`/api/requests/${reqId}/start`, { method: 'PATCH' }, qiSarahToken);
    assertStatus(startRes, 403, 'Sarah starting David task');

    // Sarah attempts to submit
    const submitRes = await api('/api/reports', {
      method: 'POST',
      body: {
        requestId: reqId,
        heatBatchNumber: 'BATCH-SPOOF',
        furnace: 'Furnace-1',
        autoReport: 'RPT-SPOOF',
        sampleBatchDate: '2026-10-27',
        bhn: 85,
        ys: 250,
        uts: 300,
        elongation: 2.0,
      }
    }, qiSarahToken);
    assertStatus(submitRes, 403, 'Sarah submitting David task');
  });

  await test('ADV-15: Reassignment dynamically transfers access and audit history', async () => {
    // Request initially assigned to David
    const req = await api('/api/requests', {
      method: 'POST',
      body: { partName: activePart.partName, partNumber: activePart.partNumber, assignedInspectorId: 'usr-qi-1' }
    }, peToken);
    const reqId = req.data.id;

    // Reassign to Sarah
    const reassignRes = await api(`/api/requests/${reqId}/assign`, {
      method: 'PATCH',
      body: { inspectorId: 'usr-qi-2', reason: 'Shift handover' }
    }, peToken);
    assertStatus(reassignRes, 200);
    assertEqual(reassignRes.data.assignedInspectorId, 'usr-qi-2');

    // David now receives 403
    const davidView = await api(`/api/requests/${reqId}`, {}, qiDavidToken);
    assertStatus(davidView, 403, 'David viewing reassigned task');

    // Sarah can now start and submit
    const sarahStart = await api(`/api/requests/${reqId}/start`, { method: 'PATCH' }, qiSarahToken);
    assertStatus(sarahStart, 200);
    assertEqual(sarahStart.data.status, 'In Progress');

    const sarahSubmit = await api('/api/reports', {
      method: 'POST',
      body: {
        requestId: reqId,
        heatBatchNumber: 'BATCH-SARAH',
        furnace: 'Furnace-2',
        autoReport: 'RPT-SARAH',
        sampleBatchDate: '2026-10-27',
        bhn: 85,
        ys: 250,
        uts: 300,
        elongation: 2.0,
      }
    }, qiSarahToken);
    assertStatus(sarahSubmit, 201);
    assertEqual(sarahSubmit.data.overallStatus, 'OK');

    // Verify request status is COMPLETED
    const peView = await api(`/api/requests/${reqId}`, {}, peToken);
    assertEqual(peView.data.status, 'Completed');
    assertTrue(peView.data.assignmentHistory.length >= 2, 'History must record both assignments');
  });

  // --- 7. IMMUTABLE SIGNATURE SNAPSHOT ---
  await test('ADV-16: Signature snapshot remains immutable despite profile signature update', async () => {
    // Unique signature for Sarah
    const sigV1 = 'data:image/png;base64,SIGNATURE_VERSION_1_ORIGINAL';
    await api('/api/users/usr-qi-2/signature', {
      method: 'PUT',
      body: { signatureData: sigV1 }
    }, qiSarahToken);

    const req = await api('/api/requests', {
      method: 'POST',
      body: { partName: activePart.partName, partNumber: activePart.partNumber, assignedInspectorId: 'usr-qi-2' }
    }, peToken);
    await api(`/api/requests/${req.data.id}/start`, { method: 'PATCH' }, qiSarahToken);

    const rep = await api('/api/reports', {
      method: 'POST',
      body: {
        requestId: req.data.id,
        heatBatchNumber: 'BATCH-SIG',
        furnace: 'Furnace-1',
        autoReport: 'RPT-SIG',
        sampleBatchDate: '2026-10-27',
        bhn: 85,
        ys: 250,
        uts: 300,
        elongation: 2.0,
      }
    }, qiSarahToken);
    assertStatus(rep, 201);
    assertEqual(rep.data.inspectorSignatureSnapshot, sigV1, 'Initial snapshot must match sigV1');

    // Update profile signature to V2
    const sigV2 = 'data:image/png;base64,SIGNATURE_VERSION_2_ALTERED';
    await api('/api/users/usr-qi-2/signature', {
      method: 'PUT',
      body: { signatureData: sigV2 }
    }, qiSarahToken);

    // Fetch the previously submitted report
    const fetchedRep = await api(`/api/reports/${rep.data.id}`, {}, qiSarahToken);
    assertEqual(fetchedRep.data.inspectorSignatureSnapshot, sigV1, 'Report snapshot must NOT change when profile updates');
  });

  // --- 8. CONTROLLED POST-SUBMISSION REVISION ---
  await test('ADV-17: Revision preserves historical snapshot and increments revision number', async () => {
    const req = await api('/api/requests', {
      method: 'POST',
      body: { partName: activePart.partName, partNumber: activePart.partNumber, assignedInspectorId: 'usr-qi-1' }
    }, peToken);
    await api(`/api/requests/${req.data.id}/start`, { method: 'PATCH' }, qiDavidToken);

    const rep = await api('/api/reports', {
      method: 'POST',
      body: {
        requestId: req.data.id,
        heatBatchNumber: 'BATCH-REV',
        furnace: 'Furnace-1',
        autoReport: 'RPT-REV',
        sampleBatchDate: '2026-10-27',
        bhn: 85,
        ys: 250,
        uts: 300,
        elongation: 2.0,
      }
    }, qiDavidToken);

    // Revision without reason fails
    const failRev = await api(`/api/reports/${rep.data.id}/revision`, {
      method: 'POST',
      body: { bhn: 95, reason: '' }
    }, qiDavidToken);
    assertStatus(failRev, 400, 'Revision without reason fails');

    // Valid revision
    const okRev = await api(`/api/reports/${rep.data.id}/revision`, {
      method: 'POST',
      body: { bhn: 92, reason: 'Re-measurement of test coupon' }
    }, qiDavidToken);
    assertStatus(okRev, 200);
    assertEqual(Number(okRev.data.bhn), 92);
    assertTrue(Array.isArray(okRev.data.revisions) && okRev.data.revisions.length === 1);
    assertEqual(Number(okRev.data.revisions[0].previousSnapshot.bhn), 85);
  });

  // --- 9. TRANSACTIONAL DUPLICATE SUBMISSION GUARD ---
  await test('ADV-18: Second report submission for same request returns HTTP 409 Conflict', async () => {
    const req = await api('/api/requests', {
      method: 'POST',
      body: { partName: activePart.partName, partNumber: activePart.partNumber, assignedInspectorId: 'usr-qi-1' }
    }, peToken);
    await api(`/api/requests/${req.data.id}/start`, { method: 'PATCH' }, qiDavidToken);

    const rep1 = await api('/api/reports', {
      method: 'POST',
      body: {
        requestId: req.data.id,
        heatBatchNumber: 'BATCH-DUP-1',
        furnace: 'Furnace-1',
        autoReport: 'RPT-DUP-1',
        sampleBatchDate: '2026-10-27',
        bhn: 85,
        ys: 250,
        uts: 300,
        elongation: 2.0,
      }
    }, qiDavidToken);
    assertStatus(rep1, 201);

    const rep2 = await api('/api/reports', {
      method: 'POST',
      body: {
        requestId: req.data.id,
        heatBatchNumber: 'BATCH-DUP-2',
        furnace: 'Furnace-1',
        autoReport: 'RPT-DUP-2',
        sampleBatchDate: '2026-10-27',
        bhn: 85,
        ys: 250,
        uts: 300,
        elongation: 2.0,
      }
    }, qiDavidToken);
    assertStatus(rep2, 409, 'Duplicate report must return 409 Conflict');
  });

  // --- 10. INPUT VALIDATION & NEGATIVE VALUES ---
  await test('ADV-19: Negative numerical inputs rejected with HTTP 400', async () => {
    const req = await api('/api/requests', {
      method: 'POST',
      body: { partName: activePart.partName, partNumber: activePart.partNumber, assignedInspectorId: 'usr-qi-1' }
    }, peToken);
    await api(`/api/requests/${req.data.id}/start`, { method: 'PATCH' }, qiDavidToken);

    const badPayloads = [
      { bhn: -80, ys: 250, uts: 300, elongation: 2.0 },
      { bhn: 80, ys: -220, uts: 300, elongation: 2.0 },
      { bhn: 80, ys: 250, uts: -280, elongation: 2.0 },
      { bhn: 80, ys: 250, uts: 300, elongation: -1.0 },
    ];

    for (const p of badPayloads) {
      const res = await api('/api/reports', {
        method: 'POST',
        body: {
          requestId: req.data.id,
          heatBatchNumber: 'BATCH-NEG',
          furnace: 'Furnace-1',
          autoReport: 'RPT-NEG',
          sampleBatchDate: '2026-10-27',
          ...p,
        }
      }, qiDavidToken);
      assertStatus(res, 400, `Negative value must be rejected: ${JSON.stringify(p)}`);
    }
  });

  // --- 11. PASSWORDS NEVER EXPOSED ---
  await test('ADV-20: User listing never contains plaintext passwords or password hashes', async () => {
    const res = await api('/api/users', {}, peToken);
    assertStatus(res, 200);
    assertTrue(Array.isArray(res.data) && res.data.length > 0);
    for (const u of res.data) {
      assertEqual(u.password, undefined, 'password field must be undefined');
      assertEqual(u.passwordHash, undefined, 'passwordHash field must be undefined');
    }
  });

  console.log(`\n------------------------------------------------------------`);
  console.log(` ADVERSARIAL STRESS TEST SUMMARY`);
  console.log(` Total: ${passed + failed} | Passed: ${passed} | Failed: ${failed}`);
  console.log(` Pass Rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);
  console.log(`------------------------------------------------------------\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runAdversarialSuite().catch(err => {
  console.error('Adversarial harness execution error:', err);
  process.exit(1);
});
