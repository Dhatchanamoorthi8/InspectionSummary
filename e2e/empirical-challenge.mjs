#!/usr/bin/env node
// empirical-challenge.mjs
// Adversarial challenge harness executing empirical edge-case verification against live backend

import {
  api,
  loginAs,
  setupTestEnvironment,
  assert,
  assertEqual,
  assertStatus,
  assertNotEqual,
  assertTrue,
} from './helpers.mjs';

const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const CYAN = '\x1b[36m';
const YELLOW = '\x1b[33m';

let passedChallenges = 0;
let totalChallenges = 0;

async function runChallenge(name, fn) {
  totalChallenges++;
  process.stdout.write(`  [CHALLENGE ${totalChallenges}] ${name} ... `);
  const start = Date.now();
  try {
    await fn();
    const duration = Date.now() - start;
    console.log(`${GREEN}PASS${RESET} (${duration}ms)`);
    passedChallenges++;
  } catch (err) {
    const duration = Date.now() - start;
    console.log(`${RED}FAIL${RESET} (${duration}ms)\n    Error: ${err.message}`);
  }
}

async function main() {
  const baseUrl = await setupTestEnvironment('http://localhost:3000');
  console.log(`${BOLD}${CYAN}======================================================================${RESET}`);
  console.log(`${BOLD}     EMPIRICAL ADVERSARIAL CHALLENGE HARNESS FOR NESTJS BACKEND     ${RESET}`);
  console.log(`${BOLD}${CYAN}======================================================================${RESET}`);
  console.log(`Target Base URL: ${baseUrl}`);
  console.log(`Timestamp:       ${new Date().toISOString()}\n`);

  const peToken = await loginAs('pe_john');
  const davidToken = await loginAs('qi_david');
  const sarahToken = await loginAs('qi_sarah');

  // Helper to create a fresh request assigned to an inspector
  async function createTestRequest(inspectorId, partName = 'Axle Shaft', partNumber = 'AX-1001') {
    const res = await api('/api/requests', {
      method: 'POST',
      body: {
        partName,
        partNumber,
        assignedInspectorId: inspectorId,
        remarks: 'Empirical challenge test request',
      },
    }, peToken);
    assertStatus(res, 201, 'Request creation');
    return res.data;
  }

  console.log(`${BOLD}--- AREA 1: METALLURGICAL CALCULATION OVERRIDES & TAMPER RESISTANCE ---${RESET}`);

  await runChallenge(
    'Attempt overallStatus: "OK" with bad BHN (75) and no remarks -> Server detects failure and rejects with HTTP 400',
    async () => {
      const req = await createTestRequest('usr-qi-1');
      const spoofPayload = {
        requestId: req.id,
        heatBatchNumber: 'BATCH-SPOOF-BAD-BHN-1',
        furnace: 'Furnace-1',
        autoReport: 'AR-SPOOF-1',
        sampleBatchDate: '2026-10-27',
        bhn: 75.0, // FAILS (< 80)
        ys: 240.0,
        uts: 300.0,
        elongation: 2.0,
        hardnessStatus: 'OK', // Tamper attempt
        overallStatus: 'OK', // Tamper attempt
        inspectorRemarks: '', // Missing remarks on failure
      };

      const res = await api('/api/reports', { method: 'POST', body: spoofPayload }, davidToken);
      // Because BHN 75 is NOT_OK, remarks are mandatory. Server must NOT accept overallStatus: 'OK'.
      assertStatus(res, 400, 'Rejection of failing status without remarks');
      assert(
        res.data?.message?.includes('Remarks') || res.data?.message?.includes('remarks'),
        'Error message indicates remarks required for NOT_OK status'
      );
    }
  );

  await runChallenge(
    'Attempt overallStatus: "OK" with bad BHN (75) with remarks -> Server overrides client status to NOT_OK',
    async () => {
      const req = await createTestRequest('usr-qi-1');
      const spoofPayload = {
        requestId: req.id,
        heatBatchNumber: 'BATCH-SPOOF-BAD-BHN-2',
        furnace: 'Furnace-1',
        autoReport: 'AR-SPOOF-2',
        sampleBatchDate: '2026-10-27',
        bhn: 75.0, // FAILS (< 80)
        ys: 240.0,
        uts: 300.0,
        elongation: 2.0,
        hardnessStatus: 'OK', // Tamper attempt
        overallStatus: 'OK', // Tamper attempt
        inspectorRemarks: 'Hardness tested at 75 BHN which is below specification',
      };

      const res = await api('/api/reports', { method: 'POST', body: spoofPayload }, davidToken);
      assertStatus(res, 201, 'Report submission');
      assertEqual(res.data.hardnessStatus, 'NOT_OK', 'hardnessStatus recalculated to NOT_OK');
      assertEqual(res.data.overallStatus, 'NOT_OK', 'overallStatus overridden by server to NOT_OK');

      // Verify persisted report in database via GET
      const getRes = await api(`/api/reports/${res.data.id}`, {}, davidToken);
      assertStatus(getRes, 200, 'Report retrieval');
      assertEqual(getRes.data.hardnessStatus, 'NOT_OK', 'Persisted hardnessStatus is NOT_OK');
      assertEqual(getRes.data.overallStatus, 'NOT_OK', 'Persisted overallStatus is NOT_OK');
    }
  );

  await runChallenge(
    'Attempt overallStatus: "OK" with bad mechanical values (YS=210, UTS=270, E=0.8%) -> Server overrides to NOT_OK',
    async () => {
      const req = await createTestRequest('usr-qi-1');
      const spoofPayload = {
        requestId: req.id,
        heatBatchNumber: 'BATCH-SPOOF-MECH-FAIL',
        furnace: 'Furnace-1',
        autoReport: 'AR-SPOOF-MECH',
        sampleBatchDate: '2026-10-27',
        bhn: 85.0, // OK
        ys: 210.0, // FAILS (< 220)
        uts: 270.0, // FAILS (< 280)
        elongation: 0.8, // FAILS (< 1.0)
        overallStatus: 'OK', // Tamper attempt
        inspectorRemarks: 'Mechanical failure observed across tensile properties',
      };

      const res = await api('/api/reports', { method: 'POST', body: spoofPayload }, davidToken);
      assertStatus(res, 201, 'Report submission');
      assertEqual(res.data.hardnessStatus, 'OK', 'hardnessStatus is OK');
      assertEqual(res.data.mechanicalStatus, 'NOT_OK', 'mechanicalStatus recalculated to NOT_OK');
      assertEqual(res.data.overallStatus, 'NOT_OK', 'overallStatus overridden by server to NOT_OK');
    }
  );

  await runChallenge(
    'Attempt overallStatus: "NOT_OK" on passing measurements -> Server overrides to OK',
    async () => {
      const req = await createTestRequest('usr-qi-1');
      const spoofPayload = {
        requestId: req.id,
        heatBatchNumber: 'BATCH-SPOOF-PASSING',
        furnace: 'Furnace-1',
        autoReport: 'AR-SPOOF-3',
        sampleBatchDate: '2026-10-27',
        bhn: 85.0, // PASS
        ys: 240.0, // PASS
        uts: 300.0, // PASS
        elongation: 2.0, // PASS
        hardnessStatus: 'NOT_OK', // Tamper attempt to force fail
        overallStatus: 'NOT_OK', // Tamper attempt to force fail
      };

      const res = await api('/api/reports', { method: 'POST', body: spoofPayload }, davidToken);
      assertStatus(res, 201, 'Report submission');
      assertEqual(res.data.hardnessStatus, 'OK', 'hardnessStatus recalculated to OK');
      assertEqual(res.data.mechanicalStatus, 'OK', 'mechanicalStatus recalculated to OK');
      assertEqual(res.data.overallStatus, 'OK', 'overallStatus overridden by server to OK');
    }
  );

  await runChallenge(
    'Attempt negative BHN measurement (-50) -> Server rejects with HTTP 400 Bad Request',
    async () => {
      const req = await createTestRequest('usr-qi-1');
      const negativePayload = {
        requestId: req.id,
        heatBatchNumber: 'BATCH-NEG',
        furnace: 'Furnace-1',
        autoReport: 'AR-NEG',
        sampleBatchDate: '2026-10-27',
        bhn: -50.0,
        ys: 240.0,
        uts: 300.0,
        elongation: 2.0,
      };

      const res = await api('/api/reports', { method: 'POST', body: negativePayload }, davidToken);
      assertStatus(res, 400, 'Rejection of negative values');
    }
  );

  console.log(`\n${BOLD}--- AREA 2: CROSS-INSPECTOR TASK ISOLATION & AUTHORIZATION (403) ---${RESET}`);

  await runChallenge(
    'Inspector Sarah attempts GET on task assigned to David -> Server responds with HTTP 403',
    async () => {
      const req = await createTestRequest('usr-qi-1'); // Assigned to David
      const res = await api(`/api/requests/${req.id}`, {}, sarahToken);
      assertStatus(res, 403, 'Cross-inspector view rejected');
    }
  );

  await runChallenge(
    'Inspector Sarah attempts PATCH /start on task assigned to David -> Server responds with HTTP 403',
    async () => {
      const req = await createTestRequest('usr-qi-1'); // Assigned to David
      const res = await api(`/api/requests/${req.id}/start`, { method: 'PATCH' }, sarahToken);
      assertStatus(res, 403, 'Cross-inspector start rejected');
    }
  );

  await runChallenge(
    'Inspector Sarah attempts POST /api/reports on task assigned to David -> Server responds with HTTP 403',
    async () => {
      const req = await createTestRequest('usr-qi-1'); // Assigned to David
      const payload = {
        requestId: req.id,
        heatBatchNumber: 'BATCH-STEAL-REPORT',
        furnace: 'Furnace-1',
        autoReport: 'AR-STEAL',
        sampleBatchDate: '2026-10-27',
        bhn: 85.0,
        ys: 240.0,
        uts: 300.0,
        elongation: 2.0,
      };
      const res = await api('/api/reports', { method: 'POST', body: payload }, sarahToken);
      assertStatus(res, 403, 'Cross-inspector report submission rejected');
    }
  );

  await runChallenge(
    'Production Engineer attempts POST /api/reports -> Server responds with HTTP 403 (Role mismatch)',
    async () => {
      const req = await createTestRequest('usr-qi-1');
      const payload = {
        requestId: req.id,
        heatBatchNumber: 'BATCH-PE-SUBMIT',
        furnace: 'Furnace-1',
        autoReport: 'AR-PE',
        sampleBatchDate: '2026-10-27',
        bhn: 85.0,
        ys: 240.0,
        uts: 300.0,
        elongation: 2.0,
      };
      const res = await api('/api/reports', { method: 'POST', body: payload }, peToken);
      assertStatus(res, 403, 'PE submitting report rejected');
    }
  );

  await runChallenge(
    'Unauthenticated client attempts POST /api/reports -> Server responds with HTTP 401 Unauthorized',
    async () => {
      const res = await api('/api/reports', {
        method: 'POST',
        body: { requestId: 'req-fake' },
      });
      assertStatus(res, 401, 'Unauthenticated report submission rejected');
    }
  );

  console.log(`\n${BOLD}--- AREA 3: DUPLICATE REPORT PREVENTION & CONCURRENCY (409) ---${RESET}`);

  await runChallenge(
    'Inspector David submits duplicate report for same task sequentially -> Second call returns HTTP 409 Conflict',
    async () => {
      const req = await createTestRequest('usr-qi-1');
      const payload = {
        requestId: req.id,
        heatBatchNumber: 'BATCH-SEQ-DUP',
        furnace: 'Furnace-1',
        autoReport: 'AR-DUP-1',
        sampleBatchDate: '2026-10-27',
        bhn: 85.0,
        ys: 240.0,
        uts: 300.0,
        elongation: 2.0,
      };

      const firstRes = await api('/api/reports', { method: 'POST', body: payload }, davidToken);
      assertStatus(firstRes, 201, 'First report submission');

      // Verify request transitioned to Completed
      const checkReq = await api(`/api/requests/${req.id}`, {}, davidToken);
      assertStatus(checkReq, 200, 'Fetch request');
      assertEqual(checkReq.data.status, 'Completed', 'Request transitioned to Completed status');

      // Duplicate submission attempt
      const secondRes = await api('/api/reports', { method: 'POST', body: payload }, davidToken);
      assertStatus(secondRes, 409, 'Duplicate report rejected with HTTP 409 Conflict');
    }
  );

  await runChallenge(
    'Stress test: 5 concurrent simultaneous report submissions for same task -> Exactly 1 succeeds (201), 4 return 409',
    async () => {
      const req = await createTestRequest('usr-qi-1');
      const payload = {
        requestId: req.id,
        heatBatchNumber: 'BATCH-CONCURRENT-RACE',
        furnace: 'Furnace-1',
        autoReport: 'AR-RACE',
        sampleBatchDate: '2026-10-27',
        bhn: 85.0,
        ys: 240.0,
        uts: 300.0,
        elongation: 2.0,
      };

      // Fire 5 identical requests concurrently
      const promises = [1, 2, 3, 4, 5].map(() =>
        api('/api/reports', { method: 'POST', body: payload }, davidToken)
      );
      const results = await Promise.all(promises);

      const status201Count = results.filter((r) => r.status === 201).length;
      const status409Count = results.filter((r) => r.status === 409).length;

      assertEqual(status201Count, 1, 'Exactly one concurrent submission succeeds with 201');
      assertEqual(status409Count, 4, 'Remaining concurrent submissions rejected with 409 Conflict');
    }
  );

  console.log(`\n${BOLD}--- AREA 4: DIGITAL SIGNATURE SNAPSHOT & IMMUTABILITY ---${RESET}`);

  await runChallenge(
    'Inspector signature update does NOT mutate snapshot in existing reports',
    async () => {
      // Step 1: Set David's signature to Original
      const originalSig = 'data:image/png;base64,ORIGINAL_DAVID_SIGNATURE_SNAPSHOT_VERIFICATION';
      await api('/api/users/usr-qi-1/signature', {
        method: 'PUT',
        body: { signatureData: originalSig },
      }, davidToken);

      // Step 2: Submit a report
      const req = await createTestRequest('usr-qi-1');
      const repRes = await api('/api/reports', {
        method: 'POST',
        body: {
          requestId: req.id,
          heatBatchNumber: 'BATCH-SIG-TEST',
          furnace: 'Furnace-1',
          autoReport: 'AR-SIG',
          sampleBatchDate: '2026-10-27',
          bhn: 85.0,
          ys: 240.0,
          uts: 300.0,
          elongation: 2.0,
        },
      }, davidToken);
      assertStatus(repRes, 201, 'Report created');
      assertEqual(repRes.data.inspectorSignatureSnapshot, originalSig, 'Report captures initial signature');

      // Step 3: Mutate David's user profile signature
      const mutatedSig = 'data:image/png;base64,NEW_MUTATED_SIGNATURE_DATA_DIFFERENT';
      await api('/api/users/usr-qi-1/signature', {
        method: 'PUT',
        body: { signatureData: mutatedSig },
      }, davidToken);

      // Step 4: Fetch report and verify signature remained original
      const getRep = await api(`/api/reports/${repRes.data.id}`, {}, davidToken);
      assertStatus(getRep, 200, 'Fetch report');
      assertEqual(getRep.data.inspectorSignatureSnapshot, originalSig, 'Signature snapshot remained immutable');
      assertNotEqual(getRep.data.inspectorSignatureSnapshot, mutatedSig, 'Signature snapshot was not overwritten');
    }
  );

  console.log(`\n${BOLD}--- AREA 5: CONTROLLED REPORT REVISION TRACKING ---${RESET}`);

  await runChallenge(
    'Quality Inspector submits revision with reason -> creates versioned revision record and updates active report',
    async () => {
      const req = await createTestRequest('usr-qi-1');
      const origRes = await api('/api/reports', {
        method: 'POST',
        body: {
          requestId: req.id,
          heatBatchNumber: 'BATCH-REV-1',
          furnace: 'Furnace-1',
          autoReport: 'AR-REV',
          sampleBatchDate: '2026-10-27',
          bhn: 85.0,
          ys: 240.0,
          uts: 300.0,
          elongation: 2.0,
        },
      }, davidToken);
      assertStatus(origRes, 201, 'Original report created');
      const reportId = origRes.data.id;

      // Submit revision: change BHN to 90 with valid reason
      const revRes = await api(`/api/reports/${reportId}/revisions`, {
        method: 'POST',
        body: {
          bhn: 90.0,
          ys: 250.0,
          uts: 320.0,
          elongation: 2.5,
          reason: 'Recalibrated hardness tester verification',
        },
      }, davidToken);
      assertStatus(revRes, 200, 'Revision submitted');
      assertEqual(Number(revRes.data.bhn), 90.0, 'Updated BHN persisted');
      assertTrue(Array.isArray(revRes.data.revisions) && revRes.data.revisions.length >= 1, 'Revisions array populated');
      const latestRev = revRes.data.revisions[revRes.data.revisions.length - 1];
      assertEqual(Number(latestRev.previousSnapshot.bhn), 85.0, 'Previous BHN preserved in snapshot');
      assertEqual(latestRev.reason, 'Recalibrated hardness tester verification', 'Revision reason preserved');

      // Attempt revision without reason -> must fail with 400
      const badRev = await api(`/api/reports/${reportId}/revisions`, {
        method: 'POST',
        body: {
          bhn: 92.0,
          reason: '',
        },
      }, davidToken);
      assertStatus(badRev, 400, 'Revision without reason rejected');
    }
  );

  console.log(`\n${BOLD}--- AREA 6: SQL INJECTION & IMMUTABLE AUDIT LOG RESILIENCE ---${RESET}`);

  await runChallenge(
    'SQL injection payloads in search query are neutralized safely',
    async () => {
      const attackRes = await api("/api/requests?search=' UNION SELECT * FROM users --", {}, peToken);
      assertStatus(attackRes, 200, 'SQL injection probe returned 200 without syntax error');
      assertTrue(Array.isArray(attackRes.data), 'Array response maintained');
    }
  );

  await runChallenge(
    'Audit logs record mutation actions, require JWT auth (401 when missing), and return records',
    async () => {
      // Unauthenticated access must be rejected with 401
      const unauthRes = await api('/api/audit-logs');
      assertStatus(unauthRes, 401, 'Unauthenticated audit access rejected');

      // Authenticated PE can access
      const peRes = await api('/api/audit-logs', {}, peToken);
      assertStatus(peRes, 200, 'PE audit access granted');
      assertTrue(Array.isArray(peRes.data), 'Audit logs returned as array');
      assertTrue(peRes.data.length > 0, 'Audit entries are present');

      // Verify that audit log records contain the required fields
      const latest = peRes.data[0];
      assert(latest.id, 'Audit log has id');
      assert(latest.timestamp, 'Audit log has timestamp');
      assert(latest.action, 'Audit log has action');
      assert(latest.entityType, 'Audit log has entityType');
    }
  );

  console.log(`\n${BOLD}======================================================================${RESET}`);
  console.log(`CHALLENGE RESULTS: ${passedChallenges} / ${totalChallenges} Passed (${Math.round((passedChallenges / totalChallenges) * 100)}%)`);
  if (passedChallenges === totalChallenges) {
    console.log(`${BOLD}${GREEN}ALL EMPIRICAL CHALLENGES PASSED SUCCESSFULLY!${RESET}`);
  } else {
    console.log(`${BOLD}${RED}SOME CHALLENGES FAILED.${RESET}`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Fatal error during challenge execution:', err);
  process.exit(1);
});
