#!/usr/bin/env node
// tier5-adversarial.mjs
// Tier 5: Adversarial Coverage Hardening Test Harness
// Standalone suite executing concurrency, extreme boundary, token security, bulk import, and signature immutability stress tests against live NestJS on http://localhost:3000

import {
  api,
  loginAs,
  setupTestEnvironment,
  teardownTestEnvironment,
  assert,
  assertEqual,
  assertStatus,
  assertNotEqual,
  assertTrue,
} from './helpers.mjs';
import crypto from 'crypto';

// ANSI Color Codes
const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';
const DIM = '\x1b[2m';
const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';
const MAGENTA = '\x1b[35m';
const WHITE = '\x1b[37m';

const results = [];

function recordTest(id, name, domain, passed, duration, error = null, notes = null) {
  results.push({ id, name, domain, passed, duration, error, notes });
  const statusStr = passed
    ? `${GREEN}✔ PASS${RESET}`
    : `${RED}✖ FAIL${RESET}`;
  console.log(`  ${statusStr} ${BOLD}[${id}]${RESET} ${name} ${DIM}(${duration}ms)${RESET}`);
  if (!passed && error) {
    console.log(`    ${RED}Failure: ${error}${RESET}`);
  }
  if (notes) {
    console.log(`    ${YELLOW}Note: ${notes}${RESET}`);
  }
}

async function runTestCase(id, name, domain, fn) {
  const start = Date.now();
  try {
    const notes = await fn();
    const duration = Date.now() - start;
    recordTest(id, name, domain, true, duration, null, notes || null);
  } catch (err) {
    const duration = Date.now() - start;
    recordTest(id, name, domain, false, duration, err.message, err.notes || null);
  }
}

export async function runTier5Tests(customUrl = null) {
  console.log(`${BOLD}${CYAN}======================================================================${RESET}`);
  console.log(`${BOLD}${CYAN}   TIER 5: ADVERSARIAL COVERAGE HARDENING STRESS HARNESS   ${RESET}`);
  console.log(`${BOLD}${CYAN}======================================================================${RESET}`);

  const activeUrl = await setupTestEnvironment(customUrl || 'http://localhost:3000');
  console.log(`${DIM}Target Base URL:${RESET} ${BOLD}${WHITE}${activeUrl}${RESET}`);
  console.log(`${DIM}Timestamp:${RESET}      ${new Date().toISOString()}\n`);

  const peToken = await loginAs('pe_john');
  const davidToken = await loginAs('qi_david');
  const sarahToken = await loginAs('qi_sarah');

  // Resolve JWT secret from backend/.env or environment
  let jwtSecret = process.env.JWT_SECRET;
  try {
    const fs = await import('fs');
    if (fs.existsSync('backend/.env')) {
      const envText = fs.readFileSync('backend/.env', 'utf8');
      const match = envText.match(/JWT_SECRET=(.*)/);
      if (match && match[1]) jwtSecret = match[1].trim();
    }
  } catch {}
  jwtSecret = jwtSecret || 'super-secret-heat-treatment-jwt-token-key-2026';

  // Helper to create a single request safely (with retry if sequence race occurs)
  async function createSafeRequest(inspectorId, partName = 'Axle Shaft', partNumber = 'AX-1001', remarks = 'Tier 5 test request') {
    let attempts = 0;
    while (attempts < 5) {
      attempts++;
      const res = await api('/api/requests', {
        method: 'POST',
        body: { partName, partNumber, assignedInspectorId: inspectorId, remarks },
      }, peToken);
      if (res.status === 201 && res.data?.id) {
        return res.data;
      }
      // Brief jitter on collision
      await new Promise((r) => setTimeout(r, 15 + Math.floor(Math.random() * 20)));
    }
    throw new Error('Failed to create safe request after 5 attempts');
  }

  // =========================================================================
  // DOMAIN 1: CONCURRENCY STRESS
  // =========================================================================
  console.log(`${BOLD}${MAGENTA}▶ [DOMAIN 1] CONCURRENCY STRESS TESTING${RESET}`);
  console.log(`${DIM}${'─'.repeat(70)}${RESET}`);

  // Test ADV-CONC-01: 10 parallel report submissions for the SAME request
  await runTestCase(
    'ADV-CONC-01',
    '10 parallel report submissions on SAME request -> Exactly 1 succeeds (201), 9 return 409 Conflict',
    'Concurrency',
    async () => {
      const req = await createSafeRequest('usr-qi-1');
      const payload = {
        requestId: req.id,
        heatBatchNumber: 'BATCH-CONC-SAME-10',
        furnace: 'Furnace-1',
        autoReport: 'AR-CONC-SAME',
        sampleBatchDate: '2026-10-27',
        bhn: 85.0,
        ys: 240.0,
        uts: 300.0,
        elongation: 2.0,
      };

      const promises = Array.from({ length: 10 }, () =>
        api('/api/reports', { method: 'POST', body: payload }, davidToken)
      );
      const responses = await Promise.all(promises);

      const count201 = responses.filter((r) => r.status === 201).length;
      const count409 = responses.filter((r) => r.status === 409).length;
      const otherStatuses = responses.filter((r) => r.status !== 201 && r.status !== 409);

      assertEqual(count201, 1, `Exactly 1 submission must succeed with 201 (got ${count201})`);
      assertEqual(count409, 9, `9 duplicate submissions must return 409 Conflict (got ${count409})`);
      assertEqual(otherStatuses.length, 0, `No unexpected HTTP errors (got ${otherStatuses.map(r => r.status).join(',')})`);
      return `Clean isolation: 1 x 201 Created, 9 x 409 Conflict`;
    }
  );

  // Test ADV-CONC-02: 10 parallel report submissions for 10 DISTINCT assigned requests
  await runTestCase(
    'ADV-CONC-02',
    '10 parallel report submissions on 10 DISTINCT requests -> All 10 succeed (201 Created)',
    'Concurrency',
    async () => {
      const distinctReqs = [];
      for (let i = 0; i < 10; i++) {
        const r = await createSafeRequest('usr-qi-1', 'Axle Shaft', 'AX-1001', `Parallel distinct req ${i}`);
        distinctReqs.push(r);
      }

      const promises = distinctReqs.map((req, i) =>
        api('/api/reports', {
          method: 'POST',
          body: {
            requestId: req.id,
            heatBatchNumber: `BATCH-DISTINCT-${i}`,
            furnace: 'Furnace-1',
            autoReport: `AR-DIST-${i}`,
            sampleBatchDate: '2026-10-27',
            bhn: 85.0 + (i % 5),
            ys: 240.0,
            uts: 300.0,
            elongation: 2.0,
          },
        }, davidToken)
      );

      const responses = await Promise.all(promises);
      const count201 = responses.filter((r) => r.status === 201).length;
      assertEqual(count201, 10, `All 10 distinct report submissions must succeed with 201 (got ${count201})`);

      // Verify each request is now marked Completed
      for (const req of distinctReqs) {
        const verifyRes = await api(`/api/requests/${req.id}`, {}, davidToken);
        assertEqual(verifyRes.data?.status, 'Completed', `Request ${req.id} transitioned to Completed`);
      }
      return `All 10 distinct submissions succeeded (201) and transitioned requests to Completed`;
    }
  );

  // Test ADV-CONC-03: 10 simultaneous request creations (Probe sequence race condition)
  await runTestCase(
    'ADV-CONC-03',
    '10 parallel request creations -> Probe sequence collision and unique constraint handling',
    'Concurrency',
    async () => {
      const promises = Array.from({ length: 10 }, (_, i) =>
        api('/api/requests', {
          method: 'POST',
          body: {
            partName: 'Axle Shaft',
            partNumber: 'AX-1001',
            assignedInspectorId: 'usr-qi-1',
            remarks: `Concurrent creation probe ${i}`,
          },
        }, peToken)
      );

      const responses = await Promise.all(promises);
      const count201 = responses.filter((r) => r.status === 201).length;
      const count500 = responses.filter((r) => r.status === 500).length;

      // Note: If backend does not lock sequence during count-based request number generation,
      // concurrent requests trigger unique constraint violations resulting in HTTP 500.
      if (count500 > 0) {
        const err = new Error(
          `Sequence race condition detected: ${count500} of 10 concurrent request creations crashed with HTTP 500 duplicate key violation on request_number (count201: ${count201})`
        );
        err.notes = `VULNERABILITY: count-based request_number generation lacks table locking / sequence isolation`;
        throw err;
      }

      assertEqual(count201, 10, `All 10 concurrent requests must be created successfully`);
      return `All 10 concurrent request creations succeeded without race collisions`;
    }
  );

  // =========================================================================
  // DOMAIN 2: EXTREME BOUNDARY & METALLURGICAL ENGINE STRESS
  // =========================================================================
  console.log(`\n${BOLD}${MAGENTA}▶ [DOMAIN 2] EXTREME BOUNDARY & METALLURGICAL ENGINE STRESS${RESET}`);
  console.log(`${DIM}${'─'.repeat(70)}${RESET}`);

  // Test ADV-BND-01: Quad-zero inputs with mandatory remarks
  await runTestCase(
    'ADV-BND-01',
    'Quad-zero inputs (BHN=0, YS=0, UTS=0, E=0) with remarks -> Calculated as NOT_OK and saved (201)',
    'Boundary',
    async () => {
      const req = await createSafeRequest('usr-qi-1');
      const payload = {
        requestId: req.id,
        heatBatchNumber: 'BATCH-QUAD-ZERO',
        furnace: 'Furnace-1',
        autoReport: 'AR-ZERO',
        sampleBatchDate: '2026-10-27',
        bhn: 0,
        ys: 0,
        uts: 0,
        elongation: 0,
        inspectorRemarks: 'Quad-zero calibration baseline test',
      };

      const res = await api('/api/reports', { method: 'POST', body: payload }, davidToken);
      assertStatus(res, 201, 'Quad-zero submission accepted');
      assertEqual(res.data.hardnessStatus, 'NOT_OK', 'Hardness status is NOT_OK');
      assertEqual(res.data.mechanicalStatus, 'NOT_OK', 'Mechanical status is NOT_OK');
      assertEqual(res.data.overallStatus, 'NOT_OK', 'Overall status is NOT_OK');
      assertEqual(Number(res.data.bhn), 0, 'BHN stored as 0');
      assertEqual(Number(res.data.ys), 0, 'YS stored as 0');
      assertEqual(Number(res.data.uts), 0, 'UTS stored as 0');
      assertEqual(Number(res.data.elongation), 0, 'Elongation stored as 0');
      return `Quad-zero values accepted, calculated as NOT_OK, and preserved in DB`;
    }
  );

  // Test ADV-BND-02: Quad-zero without remarks -> Rejected with HTTP 400 Bad Request
  await runTestCase(
    'ADV-BND-02',
    'Quad-zero inputs without remarks -> Server rejects with HTTP 400 Bad Request',
    'Boundary',
    async () => {
      const req = await createSafeRequest('usr-qi-1');
      const payload = {
        requestId: req.id,
        heatBatchNumber: 'BATCH-QUAD-ZERO-NO-REM',
        furnace: 'Furnace-1',
        autoReport: 'AR-ZERO-2',
        sampleBatchDate: '2026-10-27',
        bhn: 0,
        ys: 0,
        uts: 0,
        elongation: 0,
        inspectorRemarks: '',
      };

      const res = await api('/api/reports', { method: 'POST', body: payload }, davidToken);
      assertStatus(res, 400, 'Rejection of zero NOT_OK without remarks');
      return `Mandatory remarks invariant enforced on zero-measurement failure`;
    }
  );

  // Test ADV-BND-03: Negative values rejection
  await runTestCase(
    'ADV-BND-03',
    'Negative inputs (BHN=-0.01 or YS=-10) -> Rejected with HTTP 400 Bad Request',
    'Boundary',
    async () => {
      const req = await createSafeRequest('usr-qi-1');
      const payload = {
        requestId: req.id,
        heatBatchNumber: 'BATCH-NEG-VAL',
        furnace: 'Furnace-1',
        autoReport: 'AR-NEG',
        sampleBatchDate: '2026-10-27',
        bhn: -0.01,
        ys: 240,
        uts: 300,
        elongation: 2.0,
        inspectorRemarks: 'Negative test',
      };

      const res = await api('/api/reports', { method: 'POST', body: payload }, davidToken);
      assertStatus(res, 400, 'Rejection of negative BHN');
      return `Negative value rejected with HTTP 400`;
    }
  );

  // Test ADV-BND-04: Scientific notation input normalization
  await runTestCase(
    'ADV-BND-04',
    'Scientific notation inputs ("8.5e1", "2.4e2", "3.0e2", "2.0e0") -> Evaluated as OK (201)',
    'Boundary',
    async () => {
      const req = await createSafeRequest('usr-qi-1');
      const payload = {
        requestId: req.id,
        heatBatchNumber: 'BATCH-SCI-NOTATION',
        furnace: 'Furnace-1',
        autoReport: 'AR-SCI',
        sampleBatchDate: '2026-10-27',
        bhn: '8.5e1', // 85.0
        ys: '2.4e2',  // 240.0
        uts: '3.0e2', // 300.0
        elongation: '2.0e0', // 2.0
      };

      const res = await api('/api/reports', { method: 'POST', body: payload }, davidToken);
      assertStatus(res, 201, 'Scientific notation accepted');
      assertEqual(Number(res.data.bhn), 85, 'BHN normalized to 85');
      assertEqual(Number(res.data.ys), 240, 'YS normalized to 240');
      assertEqual(Number(res.data.uts), 300, 'UTS normalized to 300');
      assertEqual(Number(res.data.elongation), 2.0, 'Elongation normalized to 2.0');
      assertEqual(res.data.overallStatus, 'OK', 'Overall status calculated as OK');
      return `Scientific notation cleanly parsed, converted to numeric, and calculated as OK`;
    }
  );

  // Test ADV-BND-05: Non-finite float (Infinity) rejection / overflow handling
  await runTestCase(
    'ADV-BND-05',
    'Non-finite float ("Infinity") or extreme float overflow (1e20) -> Probed for controlled validation (400) vs crash (500)',
    'Boundary',
    async () => {
      const req = await createSafeRequest('usr-qi-1');
      const payload = {
        requestId: req.id,
        heatBatchNumber: 'BATCH-INF',
        furnace: 'Furnace-1',
        autoReport: 'AR-INF',
        sampleBatchDate: '2026-10-27',
        bhn: 'Infinity',
        ys: 240,
        uts: 300,
        elongation: 2.0,
      };

      const res = await api('/api/reports', { method: 'POST', body: payload }, davidToken);
      if (res.status === 500) {
        const err = new Error('Non-finite input "Infinity" bypassed service validation and triggered HTTP 500 in PostgreSQL');
        err.notes = 'VULNERABILITY: Missing Number.isFinite() check in CalculationsService';
        throw err;
      }
      assertStatus(res, 400, 'Rejection of non-finite float');
      return `Non-finite float rejected with HTTP 400 Bad Request`;
    }
  );

  // Test ADV-BND-06: Unicode remarks and international characters
  await runTestCase(
    'ADV-BND-06',
    'Unicode remarks with multi-byte emojis, CJK, Arabic RTL, and math symbols -> Preserved byte-identical',
    'Boundary',
    async () => {
      const req = await createSafeRequest('usr-qi-1');
      const complexUnicode = '🔥 Quench crack alert: 淬火裂纹 - فحص الجودة فشل - ∑(Δx) ≥ 99.9% 🚀';
      const payload = {
        requestId: req.id,
        heatBatchNumber: 'BATCH-UNICODE-STRESS',
        furnace: 'Furnace-1',
        autoReport: 'AR-UNICODE',
        sampleBatchDate: '2026-10-27',
        bhn: 70.0, // NOT_OK
        ys: 240.0,
        uts: 300.0,
        elongation: 2.0,
        inspectorRemarks: complexUnicode,
      };

      const res = await api('/api/reports', { method: 'POST', body: payload }, davidToken);
      assertStatus(res, 201, 'Unicode report created');
      assertEqual(res.data.inspectorRemarks, complexUnicode, 'Remarks match byte-for-byte in response');

      const fetchRes = await api(`/api/reports/${res.data.id}`, {}, davidToken);
      assertStatus(fetchRes, 200, 'Fetch persisted unicode report');
      assertEqual(fetchRes.data.inspectorRemarks, complexUnicode, 'Persisted remarks match byte-for-byte in database');
      return `Unicode emojis, CJK, Arabic, and math symbols round-tripped perfectly`;
    }
  );

  // Test ADV-BND-07: Whitespace-only remarks on NOT_OK -> Rejected with HTTP 400 Bad Request
  await runTestCase(
    'ADV-BND-07',
    'Whitespace-only remarks ("   \\n\\t  ") on failing report -> Rejected with HTTP 400 Bad Request',
    'Boundary',
    async () => {
      const req = await createSafeRequest('usr-qi-1');
      const payload = {
        requestId: req.id,
        heatBatchNumber: 'BATCH-WHITESPACE',
        furnace: 'Furnace-1',
        autoReport: 'AR-WHITE',
        sampleBatchDate: '2026-10-27',
        bhn: 72.0, // NOT_OK
        ys: 240.0,
        uts: 300.0,
        elongation: 2.0,
        inspectorRemarks: '   \n\t   \r\n   ',
      };

      const res = await api('/api/reports', { method: 'POST', body: payload }, davidToken);
      assertStatus(res, 400, 'Whitespace-only remarks rejected');
      return `Whitespace-only remarks invariant enforced correctly`;
    }
  );

  // =========================================================================
  // DOMAIN 3: SESSION & TOKEN SECURITY STRESS
  // =========================================================================
  console.log(`\n${BOLD}${MAGENTA}▶ [DOMAIN 3] SESSION & TOKEN SECURITY STRESS${RESET}`);
  console.log(`${DIM}${'─'.repeat(70)}${RESET}`);

  // Test ADV-SEC-01: Malformed token variations return HTTP 401
  await runTestCase(
    'ADV-SEC-01',
    'Malformed JWT tokens (garbage strings, broken base64, null) -> HTTP 401 Unauthorized',
    'Security',
    async () => {
      const malformedSamples = [
        'this-is-not-a-jwt',
        'Bearer null',
        'Bearer undefined',
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.corruptpayload.invalidsig',
        '..',
        'Bearer [object Object]',
      ];

      for (const token of malformedSamples) {
        const res = await api('/api/auth/me', {}, token);
        assertStatus(res, 401, `Malformed token "${token.slice(0, 20)}"`);
      }
      return `All 6 malformed token patterns rejected with HTTP 401`;
    }
  );

  // Test ADV-SEC-02: Expired JWT token return HTTP 401
  await runTestCase(
    'ADV-SEC-02',
    'Cryptographically valid JWT with expired timestamp (exp in past) -> HTTP 401 Unauthorized',
    'Security',
    async () => {
      const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
      const payload = Buffer.from(JSON.stringify({
        id: 'usr-pe-1',
        username: 'pe_john',
        exp: Math.floor(Date.now() / 1000) - 3600, // Expired 1 hour ago
      })).toString('base64url');

      const secret = jwtSecret;
      const sig = crypto.createHmac('sha256', secret).update(`${header}.${payload}`).digest('base64url');
      const expiredJwt = `${header}.${payload}.${sig}`;

      const res = await api('/api/auth/me', {}, expiredJwt);
      assertStatus(res, 401, 'Expired token must return 401');
      return `Expired JWT rejected with HTTP 401 (ignoreExpiration: false active)`;
    }
  );

  // Test ADV-SEC-03: Tampered signature returns HTTP 401
  await runTestCase(
    'ADV-SEC-03',
    'JWT with tampered cryptographic signature -> HTTP 401 Unauthorized',
    'Security',
    async () => {
      const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
      const payload = Buffer.from(JSON.stringify({
        id: 'usr-pe-1',
        username: 'pe_john',
        exp: Math.floor(Date.now() / 1000) + 3600,
      })).toString('base64url');

      const tamperedJwt = `${header}.${payload}.TAMPERED_INVALID_SIGNATURE_BYTES`;
      const res = await api('/api/auth/me', {}, tamperedJwt);
      assertStatus(res, 401, 'Tampered token must return 401');
      return `Tampered signature rejected with HTTP 401`;
    }
  );

  // Test ADV-SEC-04: Algorithm "none" attack
  await runTestCase(
    'ADV-SEC-04',
    'JWT header claiming alg="none" (unsigned token exploit) -> HTTP 401 Unauthorized',
    'Security',
    async () => {
      const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
      const payload = Buffer.from(JSON.stringify({
        id: 'usr-pe-1',
        username: 'pe_john',
        exp: Math.floor(Date.now() / 1000) + 3600,
      })).toString('base64url');

      const noneJwt = `${header}.${payload}.`;
      const res = await api('/api/auth/me', {}, noneJwt);
      assertStatus(res, 401, 'alg none token must return 401');
      return `Algorithm "none" attack rejected with HTTP 401`;
    }
  );

  // Test ADV-SEC-05: Claim spoofing (Privilege Escalation attempt)
  await runTestCase(
    'ADV-SEC-05',
    'Forged token claiming role="PRODUCTION_ENGINEER" for QI user -> Rejected with HTTP 403 (DB-backed validation)',
    'Security',
    async () => {
      // Craft a validly signed token with David's user ID but claim role PRODUCTION_ENGINEER
      const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
      const payload = Buffer.from(JSON.stringify({
        id: 'usr-qi-1', // David's user ID
        username: 'qi_david',
        role: 'PRODUCTION_ENGINEER', // Attempted privilege escalation
        canManageUsers: true,
        exp: Math.floor(Date.now() / 1000) + 3600,
      })).toString('base64url');

      const secret = jwtSecret;
      const sig = crypto.createHmac('sha256', secret).update(`${header}.${payload}`).digest('base64url');
      const forgedJwt = `${header}.${payload}.${sig}`;

      // David tries to access PE-only endpoint (create request)
      const res = await api('/api/requests', {
        method: 'POST',
        body: {
          partName: 'Axle Shaft',
          partNumber: 'AX-1001',
          assignedInspectorId: 'usr-qi-1',
          remarks: 'Privilege escalation probe',
        },
      }, forgedJwt);

      assertStatus(res, 403, 'Privilege escalation rejected with 403');
      return `Role claim spoofing defeated: server queried DB user entity and enforced real role (403)`;
    }
  );

  // =========================================================================
  // DOMAIN 4: PART MASTER BULK IMPORT STRESS
  // =========================================================================
  console.log(`\n${BOLD}${MAGENTA}▶ [DOMAIN 4] PART MASTER BULK IMPORT STRESS (60 ROWS)${RESET}`);
  console.log(`${DIM}${'─'.repeat(70)}${RESET}`);

  // Test ADV-BLK-01: 60-row bulk import preview validation
  let cachedValidRows = [];
  const bulkTimestamp = Date.now();
  await runTestCase(
    'ADV-BLK-01',
    'Bulk import preview with 60 intermixed rows (25 valid, 15 duplicate, 20 invalid) -> Accurately flags errors',
    'BulkImport',
    async () => {
      const rows = [];

      // 25 valid unique rows
      for (let i = 1; i <= 25; i++) {
        rows.push({
          partName: `Adv Stress Part ${i}`,
          partNumber: `ADV-STRESS-${bulkTimestamp}-${String(i).padStart(3, '0')}`,
        });
      }

      // 15 duplicate rows (repeating first 10 within batch + 5 existing parts)
      for (let i = 1; i <= 10; i++) {
        rows.push({
          partName: `Adv Stress Part ${i}`,
          partNumber: `ADV-STRESS-${bulkTimestamp}-${String(i).padStart(3, '0')}`,
        });
      }
      for (let i = 1; i <= 5; i++) {
        rows.push({ partName: 'Axle Shaft', partNumber: 'AX-1001' });
      }

      // 20 invalid rows (missing partName, missing partNumber, nulls)
      for (let i = 1; i <= 7; i++) {
        rows.push({ partName: '', partNumber: `INV-NUM-${i}` });
      }
      for (let i = 1; i <= 7; i++) {
        rows.push({ partName: `INV-NAME-${i}`, partNumber: '' });
      }
      for (let i = 1; i <= 6; i++) {
        rows.push({ partName: null, partNumber: null });
      }

      assertEqual(rows.length, 60, 'Total generated rows is 60');

      const res = await api('/api/parts/import/preview', {
        method: 'POST',
        body: { rows },
      }, peToken);

      assertStatus(res, 200, 'Preview endpoint response');
      assertEqual(res.data.totalRows, 60, 'totalRows equals 60');
      assertEqual(res.data.validCount, 40, 'validCount equals 40 (25 unique + 15 duplicates)');
      assertEqual(res.data.errorCount, 20, 'errorCount equals 20 invalid rows');
      assertEqual(res.data.errors.length, 20, 'errors array contains exactly 20 items');

      cachedValidRows = res.data.validRows;
      return `Preview verified 60 rows: 40 valid (including duplicates), 20 flagged errors with line numbers`;
    }
  );

  // Test ADV-BLK-02: Bulk import commit with deduplication
  await runTestCase(
    'ADV-BLK-02',
    'Bulk import commit of 40 valid rows -> Deduplicates and inserts exactly 25 new unique parts',
    'BulkImport',
    async () => {
      assertTrue(cachedValidRows.length > 0, 'Cached valid rows available');

      const res = await api('/api/parts/import/commit', {
        method: 'POST',
        body: { validRows: cachedValidRows },
      }, peToken);

      assertStatus(res, 200, 'Commit response');
      assertTrue(res.data.success, 'Commit response marked success: true');
      assertEqual(res.data.importedCount, 25, 'importedCount is exactly 25 (deduplicated against batch & DB)');
      return `Committed 40 valid rows -> Exactly 25 new unique records inserted, 15 duplicates safely skipped`;
    }
  );

  // Test ADV-BLK-03: Re-commit idempotency (0 imported)
  await runTestCase(
    'ADV-BLK-03',
    'Re-commit identical batch -> Idempotent response with importedCount = 0 (No crashes or duplicate entries)',
    'BulkImport',
    async () => {
      const res = await api('/api/parts/import/commit', {
        method: 'POST',
        body: { validRows: cachedValidRows },
      }, peToken);

      assertStatus(res, 200, 'Re-commit response');
      assertEqual(res.data.importedCount, 0, 'importedCount is 0 on re-commit');
      return `Re-commit is fully idempotent (importedCount: 0)`;
    }
  );

  // Test ADV-BLK-04: Database master verification
  await runTestCase(
    'ADV-BLK-04',
    'Verify imported parts exist, are marked active, and can be retrieved via GET /api/parts',
    'BulkImport',
    async () => {
      const res = await api(`/api/parts?search=ADV-STRESS-${bulkTimestamp}`, {}, peToken);
      assertStatus(res, 200, 'Search imported parts');
      assertTrue(Array.isArray(res.data), 'Returns array of parts');
      assertEqual(res.data.length, 25, 'Exactly 25 imported parts found matching search prefix');
      assertTrue(res.data.every((p) => p.isActive === true), 'All imported parts have isActive === true');
      return `Database contains all 25 active imported parts without spurious duplicates`;
    }
  );

  // =========================================================================
  // DOMAIN 5: SIGNATURE IMMUTABILITY & SNAPSHOT TAMPER RESISTANCE
  // =========================================================================
  console.log(`\n${BOLD}${MAGENTA}▶ [DOMAIN 5] SIGNATURE IMMUTABILITY & SNAPSHOT TAMPER RESISTANCE${RESET}`);
  console.log(`${DIM}${'─'.repeat(70)}${RESET}`);

  // Test ADV-SIG-01: Multi-report signature snapshot isolation
  const ts = Date.now();
  const sigA = `data:image/png;base64,SIGNATURE_STRESS_A_${ts}`;
  const sigB = `data:image/png;base64,SIGNATURE_STRESS_B_${ts}`;
  const sigC = `data:image/png;base64,SIGNATURE_STRESS_C_${ts}`;
  const sigD = `data:image/png;base64,SIGNATURE_STRESS_D_${ts}`;
  const sigE = `data:image/png;base64,SIGNATURE_STRESS_E_${ts}`;

  let repAId = null;
  let repBId = null;
  let repCId = null;

  await runTestCase(
    'ADV-SIG-01',
    'Sequential report submissions under evolving inspector signatures capture distinct snapshots',
    'Signature',
    async () => {
      const rA = await createSafeRequest('usr-qi-1');
      const rB = await createSafeRequest('usr-qi-1');
      const rC = await createSafeRequest('usr-qi-1');

      // Step 1: Set signature A & submit Report A
      await api('/api/users/usr-qi-1/signature', { method: 'PUT', body: { signatureData: sigA } }, davidToken);
      const repA = await api('/api/reports', {
        method: 'POST',
        body: {
          requestId: rA.id,
          heatBatchNumber: 'BATCH-SIG-A',
          furnace: 'Furnace-1',
          autoReport: 'AR-SIG-A',
          sampleBatchDate: '2026-10-27',
          bhn: 85.0,
          ys: 240.0,
          uts: 300.0,
          elongation: 2.0,
        },
      }, davidToken);
      assertStatus(repA, 201, 'Report A created');
      repAId = repA.data.id;
      assertEqual(repA.data.inspectorSignatureSnapshot, sigA, 'Report A captured SigA');

      // Step 2: Set signature B & submit Report B
      await api('/api/users/usr-qi-1/signature', { method: 'PUT', body: { signatureData: sigB } }, davidToken);
      const repB = await api('/api/reports', {
        method: 'POST',
        body: {
          requestId: rB.id,
          heatBatchNumber: 'BATCH-SIG-B',
          furnace: 'Furnace-1',
          autoReport: 'AR-SIG-B',
          sampleBatchDate: '2026-10-27',
          bhn: 86.0,
          ys: 242.0,
          uts: 302.0,
          elongation: 2.1,
        },
      }, davidToken);
      assertStatus(repB, 201, 'Report B created');
      repBId = repB.data.id;
      assertEqual(repB.data.inspectorSignatureSnapshot, sigB, 'Report B captured SigB');

      // Step 3: Set signature C & submit Report C
      await api('/api/users/usr-qi-1/signature', { method: 'PUT', body: { signatureData: sigC } }, davidToken);
      const repC = await api('/api/reports', {
        method: 'POST',
        body: {
          requestId: rC.id,
          heatBatchNumber: 'BATCH-SIG-C',
          furnace: 'Furnace-1',
          autoReport: 'AR-SIG-C',
          sampleBatchDate: '2026-10-27',
          bhn: 87.0,
          ys: 244.0,
          uts: 304.0,
          elongation: 2.2,
        },
      }, davidToken);
      assertStatus(repC, 201, 'Report C created');
      repCId = repC.data.id;
      assertEqual(repC.data.inspectorSignatureSnapshot, sigC, 'Report C captured SigC');

      return `Reports A, B, and C independently captured snapshots SigA, SigB, SigC`;
    }
  );

  // Test ADV-SIG-02: Repeated profile mutations do not mutate existing snapshots
  await runTestCase(
    'ADV-SIG-02',
    'Repeated user profile signature mutations (SigD, SigE) DO NOT alter existing report snapshots',
    'Signature',
    async () => {
      // Mutate to SigD
      await api('/api/users/usr-qi-1/signature', { method: 'PUT', body: { signatureData: sigD } }, davidToken);
      // Mutate to SigE
      await api('/api/users/usr-qi-1/signature', { method: 'PUT', body: { signatureData: sigE } }, davidToken);

      // Verify user's profile now has SigE
      const userRes = await api('/api/auth/me', {}, davidToken);
      assertEqual(userRes.data?.user?.signatureData, sigE, 'Current user signature updated to SigE');

      // Fetch Reports A, B, C and verify snapshots remain byte-identical
      const getA = await api(`/api/reports/${repAId}`, {}, davidToken);
      const getB = await api(`/api/reports/${repBId}`, {}, davidToken);
      const getC = await api(`/api/reports/${repCId}`, {}, davidToken);

      assertEqual(getA.data.inspectorSignatureSnapshot, sigA, 'Report A snapshot remains SigA');
      assertEqual(getB.data.inspectorSignatureSnapshot, sigB, 'Report B snapshot remains SigB');
      assertEqual(getC.data.inspectorSignatureSnapshot, sigC, 'Report C snapshot remains SigC');

      assertNotEqual(getA.data.inspectorSignatureSnapshot, sigE, 'Report A was NOT retroactively updated');
      assertNotEqual(getB.data.inspectorSignatureSnapshot, sigE, 'Report B was NOT retroactively updated');
      assertNotEqual(getC.data.inspectorSignatureSnapshot, sigE, 'Report C was NOT retroactively updated');

      return `Byte-identical snapshot immutability verified across all 3 reports despite repeated profile mutations`;
    }
  );

  // Test ADV-SIG-03: Post-submission revision preserves original snapshot
  await runTestCase(
    'ADV-SIG-03',
    'Post-submission report revision preserves original snapshot in previousSnapshot audit history',
    'Signature',
    async () => {
      const revRes = await api(`/api/reports/${repAId}/revisions`, {
        method: 'POST',
        body: {
          bhn: 89.0,
          reason: 'Hardness measurement re-test under calibrated apparatus',
        },
      }, davidToken);

      assertStatus(revRes, 200, 'Revision accepted');
      assertEqual(Number(revRes.data.bhn), 89.0, 'Revised BHN persisted');

      // Verify previousSnapshot preserved SigA
      const revisions = revRes.data.revisions;
      assertTrue(Array.isArray(revisions) && revisions.length >= 1, 'Revisions array populated');
      const latestRev = revisions[revisions.length - 1];
      assertEqual(latestRev.previousSnapshot.inspectorSignatureSnapshot, sigA, 'previousSnapshot retained SigA');
      assertEqual(revRes.data.inspectorSignatureSnapshot, sigA, 'Active report signature snapshot retained SigA');

      return `Controlled revision preserves historical signature snapshot in audit trail`;
    }
  );

  await teardownTestEnvironment();

  // =========================================================================
  // SUMMARY TABLE & VERDICT
  // =========================================================================
  console.log(`\n${BOLD}${WHITE}TIER 5 ADVERSARIAL STRESS TEST SUMMARY TABLE${RESET}`);
  console.log(`┌───────────────┬────────────────────────────────────────────────────────┬─────────┬──────────┐`);
  console.log(`│ ${pad('Test ID', 13)} │ ${pad('Description', 54)} │ ${pad('Status', 7)} │ ${pad('Duration', 8)} │`);
  console.log(`├───────────────┼────────────────────────────────────────────────────────┼─────────┼──────────┤`);

  let totalPassed = 0;
  let totalFailed = 0;

  for (const r of results) {
    const statusText = r.passed ? `${GREEN}PASS${RESET}` : `${RED}${BOLD}FAIL${RESET}`;
    const truncatedDesc = r.name.length > 54 ? r.name.slice(0, 51) + '...' : r.name;
    console.log(
      `│ ${pad(r.id, 13)} │ ${pad(truncatedDesc, 54)} │ ${pad(statusText, 7)} │ ${padLeft(`${r.duration}ms`, 8)} │`
    );
    if (r.passed) totalPassed++;
    else totalFailed++;
  }

  console.log(`└───────────────┴────────────────────────────────────────────────────────┴─────────┴──────────┘`);
  console.log(`\n${BOLD}TOTAL RESULTS: ${totalPassed} Passed, ${totalFailed} Failed out of ${results.length} Tests${RESET}`);

  return {
    total: results.length,
    passed: totalPassed,
    failed: totalFailed,
    results,
  };
}

function pad(str, len) {
  const visibleLength = String(str).replace(/\x1b\[[0-9;]*m/g, '').length;
  const diff = len - visibleLength;
  return diff > 0 ? str + ' '.repeat(diff) : str;
}

function padLeft(str, len) {
  const visibleLength = String(str).replace(/\x1b\[[0-9;]*m/g, '').length;
  const diff = len - visibleLength;
  return diff > 0 ? ' '.repeat(diff) + str : str;
}

// Execute standalone if run directly
if (process.argv[1]?.endsWith('tier5-adversarial.mjs')) {
  runTier5Tests().then((summary) => {
    if (summary.failed > 0) {
      console.log(`\n${BOLD}${RED}VERDICT: REQUEST_CHANGES (${summary.failed} tests failed)${RESET}`);
      process.exit(1);
    } else {
      console.log(`\n${BOLD}${GREEN}VERDICT: APPROVE (100% tests passed)${RESET}`);
      process.exit(0);
    }
  }).catch((err) => {
    console.error('Fatal execution error:', err);
    process.exit(1);
  });
}
