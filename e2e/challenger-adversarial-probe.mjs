#!/usr/bin/env node
// challenger-adversarial-probe.mjs
// Empirical Challenger Deep Stress & Boundary Validation Suite

import { api, loginAs, setupTestEnvironment, teardownTestEnvironment, assertEqual, assertStatus } from './helpers.mjs';

const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';
const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const CYAN = '\x1b[36m';
const YELLOW = '\x1b[33m';

let testsPassed = 0;
let testsFailed = 0;

async function test(name, fn) {
  process.stdout.write(`  [CHALLENGER-PROBE] ${name}... `);
  const start = Date.now();
  try {
    await fn();
    const duration = Date.now() - start;
    console.log(`${GREEN}PASSED${RESET} (${duration}ms)`);
    testsPassed++;
  } catch (err) {
    const duration = Date.now() - start;
    console.log(`${RED}FAILED${RESET} (${duration}ms)`);
    console.log(`    ${RED}Error: ${err.message}${RESET}`);
    testsFailed++;
  }
}

async function runChallengerDeepStress() {
  console.log(`${BOLD}${CYAN}======================================================================${RESET}`);
  console.log(`${BOLD}${CYAN}   CHALLENGER DEEP STRESS & ADVERSARIAL ORACLE HARNESS   ${RESET}`);
  console.log(`${BOLD}${CYAN}======================================================================${RESET}`);

  await setupTestEnvironment();

  // Auth tokens
  const peToken = await loginAs('pe_john');
  const qiToken = await loginAs('qi_david');

  // 1. Extreme Concurrency Probe: 25 simultaneous request creations
  await test('High-load concurrency: 25 simultaneous request creations for unique sequences', async () => {
    const promises = Array.from({ length: 25 }, (_, i) =>
      api('/api/requests', {
        method: 'POST',
        body: {
          partName: 'Axle Shaft',
          partNumber: 'AX-1001',
          assignedInspectorId: 'usr-qi-1',
          remarks: `Challenger high-load burst ${i}`,
        },
      }, peToken)
    );

    const responses = await Promise.all(promises);
    const count201 = responses.filter((r) => r.status === 201).length;
    const count500 = responses.filter((r) => r.status === 500).length;

    if (count500 > 0) {
      throw new Error(`Concurrency race condition detected: ${count500} requests returned HTTP 500!`);
    }
    assertEqual(count201, 25, `Expected 25 successful creations, got ${count201}`);

    // Verify all 25 request numbers are unique
    const reqNumbers = responses.map((r) => r.data.requestNumber);
    const uniqueReqNumbers = new Set(reqNumbers);
    assertEqual(uniqueReqNumbers.size, 25, `Expected 25 unique request numbers, got ${uniqueReqNumbers.size}`);
  });

  // Helper to create a fresh request for boundary testing
  async function createTestRequest() {
    const res = await api('/api/requests', {
      method: 'POST',
      body: {
        partName: 'Axle Shaft',
        partNumber: 'AX-1001',
        assignedInspectorId: 'usr-qi-1',
        remarks: 'Challenger probe request',
      },
    }, peToken);
    assertStatus(res, 201, 'Request creation');
    return res.data;
  }

  // 2. Physical Limits & Numeric Overflow Boundary Checks
  await test('Extreme float overflow: 1e20 returns HTTP 400 (not PostgreSQL 500 overflow)', async () => {
    const req = await createTestRequest();
    const res = await api('/api/reports', {
      method: 'POST',
      body: {
        requestId: req.id,
        heatBatchNumber: 'BATCH-OVERFLOW-1',
        furnace: 'Furnace-1',
        autoReport: 'AR-OF1',
        sampleBatchDate: '2026-10-27',
        bhn: 1e20,
        ys: 240,
        uts: 300,
        elongation: 2.0,
      },
    }, qiToken);

    if (res.status === 500) {
      throw new Error('Triggered HTTP 500 database numeric overflow!');
    }
    assertStatus(res, 400, 'Expected HTTP 400 for 1e20');
  });

  await test('Negative infinity "-Infinity" returns HTTP 400', async () => {
    const req = await createTestRequest();
    const res = await api('/api/reports', {
      method: 'POST',
      body: {
        requestId: req.id,
        heatBatchNumber: 'BATCH-NINF',
        furnace: 'Furnace-1',
        autoReport: 'AR-NINF',
        sampleBatchDate: '2026-10-27',
        bhn: '-Infinity',
        ys: 240,
        uts: 300,
        elongation: 2.0,
      },
    }, qiToken);

    if (res.status === 500) {
      throw new Error('Triggered HTTP 500 for -Infinity!');
    }
    assertStatus(res, 400, 'Expected HTTP 400 for -Infinity');
  });

  await test('Invalid string "NaN" returns HTTP 400', async () => {
    const req = await createTestRequest();
    const res = await api('/api/reports', {
      method: 'POST',
      body: {
        requestId: req.id,
        heatBatchNumber: 'BATCH-NAN',
        furnace: 'Furnace-1',
        autoReport: 'AR-NAN',
        sampleBatchDate: '2026-10-27',
        bhn: 'NaN',
        ys: 240,
        uts: 300,
        elongation: 2.0,
      },
    }, qiToken);

    assertStatus(res, 400, 'Expected HTTP 400 for NaN string');
  });

  await test('Upper physical limit boundary: BHN = 3000.0 is valid, BHN = 3000.01 rejected (HTTP 400)', async () => {
    // BHN = 3000.01 should be rejected
    const req1 = await createTestRequest();
    const res1 = await api('/api/reports', {
      method: 'POST',
      body: {
        requestId: req1.id,
        heatBatchNumber: 'BATCH-BHN-MAX-EXCEED',
        furnace: 'Furnace-1',
        autoReport: 'AR-MAX-EXCEED',
        sampleBatchDate: '2026-10-27',
        bhn: 3000.01,
        ys: 240,
        uts: 300,
        elongation: 2.0,
      },
    }, qiToken);
    assertStatus(res1, 400, 'BHN 3000.01 rejected');

    // BHN = 3000.0 should be accepted
    const req2 = await createTestRequest();
    const res2 = await api('/api/reports', {
      method: 'POST',
      body: {
        requestId: req2.id,
        heatBatchNumber: 'BATCH-BHN-MAX-OK',
        furnace: 'Furnace-1',
        autoReport: 'AR-MAX-OK',
        sampleBatchDate: '2026-10-27',
        bhn: 3000.0,
        ys: 240,
        uts: 300,
        elongation: 2.0,
      },
    }, qiToken);
    assertStatus(res2, 201, 'BHN 3000.0 accepted');
  });

  await test('Upper physical limit boundary: Elongation = 100.01 rejected (HTTP 400)', async () => {
    const req = await createTestRequest();
    const res = await api('/api/reports', {
      method: 'POST',
      body: {
        requestId: req.id,
        heatBatchNumber: 'BATCH-E-EXCEED',
        furnace: 'Furnace-1',
        autoReport: 'AR-E-EXCEED',
        sampleBatchDate: '2026-10-27',
        bhn: 85,
        ys: 240,
        uts: 300,
        elongation: 100.01,
      },
    }, qiToken);
    assertStatus(res, 400, 'Elongation 100.01 rejected');
  });

  await test('Repeated concurrency stress: 3 successive bursts of 10 requests', async () => {
    for (let burst = 1; burst <= 3; burst++) {
      const promises = Array.from({ length: 10 }, (_, i) =>
        api('/api/requests', {
          method: 'POST',
          body: {
            partName: 'Axle Shaft',
            partNumber: 'AX-1001',
            assignedInspectorId: 'usr-qi-1',
            remarks: `Burst ${burst} item ${i}`,
          },
        }, peToken)
      );
      const responses = await Promise.all(promises);
      const count201 = responses.filter((r) => r.status === 201).length;
      assertEqual(count201, 10, `Burst ${burst} expected 10 successes, got ${count201}`);
    }
  });

  console.log(`\n======================================================================`);
  console.log(`CHALLENGER DEEP STRESS RESULTS: ${testsPassed} Passed, ${testsFailed} Failed`);
  console.log(`======================================================================`);

  if (testsFailed > 0) {
    process.exit(1);
  }
}

runChallengerDeepStress().catch((err) => {
  console.error('Fatal probe error:', err);
  process.exit(1);
});
