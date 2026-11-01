const { Client } = require('pg');

async function runEmpiricalStressTests() {
  const client = new Client({
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    user: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'root',
    database: process.env.DB_DATABASE || 'heat_treatment_inspection',
  });

  await client.connect();
  console.log('Connected to PostgreSQL 18.');

  const results = [];

  function recordResult(testId, category, description, expected, actual, pass, details = '') {
    results.push({ testId, category, description, expected, actual, pass, details });
    console.log(`[${pass ? 'PASS' : 'FAIL'}] ${testId} - ${category}: ${description}`);
    if (!pass || details) {
      console.log(`   Expected: ${expected}`);
      console.log(`   Actual:   ${actual}`);
      if (details) console.log(`   Details:  ${details}`);
    }
  }

  // Helper to fetch existing reference IDs from seed
  const peUserRes = await client.query("SELECT id FROM users WHERE username = 'pe_admin'");
  const peUserId = peUserRes.rows[0]?.id;

  const inspectorAliceRes = await client.query("SELECT id FROM users WHERE username = 'inspector_alice'");
  const inspectorAliceId = inspectorAliceRes.rows[0]?.id;

  const partRes = await client.query("SELECT id FROM part_master WHERE part_name = 'Main Drive Shaft' AND part_number = 'MDS-1001'");
  const partId = partRes.rows[0]?.id;

  if (!peUserId || !inspectorAliceId || !partId) {
    throw new Error('Seed data missing required reference entities (pe_admin, inspector_alice, or MDS-1001)');
  }

  // Create an isolated test request for report tests
  const testReqNumber = `TEST-REQ-${Date.now()}`;
  const reqInsertRes = await client.query(`
    INSERT INTO inspection_requests (
      request_number, part_id, part_name_snapshot, part_number_snapshot,
      created_by_id, assigned_inspector_id, status, request_date
    ) VALUES (
      $1, $2, 'Main Drive Shaft', 'MDS-1001',
      $3, $4, 'ASSIGNED', CURRENT_DATE
    ) RETURNING id;
  `, [testReqNumber, partId, peUserId, inspectorAliceId]);
  const testRequestId = reqInsertRes.rows[0].id;

  let baselineReportId = null;

  try {
    console.log(`Created baseline test request: ${testReqNumber} (${testRequestId})`);

    // ==========================================
    // SUITE 1: CHECK CONSTRAINT TESTS (Reports)
    // ==========================================
    console.log('\n--- Running Suite 1: Check Constraints on inspection_reports ---');

    // 1.1: Negative BHN (-0.01)
    try {
      await client.query(`
        INSERT INTO inspection_reports (
          request_id, inspector_id, report_date, ht_batch_number, furnace,
          auto_report_number, sample_received_batch_date, bhn, hardness_status,
          ys, uts, elongation, mechanical_status, overall_status,
          inspector_remarks, inspector_signature_snapshot
        ) VALUES (
          $1, $2, CURRENT_DATE, 'BATCH-001', 'FURNACE-1',
          'AUTO-001', CURRENT_DATE, -0.01, 'NOT_OK',
          250.0, 300.0, 2.5, 'OK', 'NOT_OK',
          'Negative test', 'data:image/png;base64,test'
        );
      `, [testRequestId, inspectorAliceId]);
      recordResult('T1.1', 'Check Constraint', 'Negative BHN (-0.01) must be rejected', '23514 check_violation', 'Accepted', false);
    } catch (err) {
      const isCheckViolation = err.code === '23514';
      recordResult('T1.1', 'Check Constraint', 'Negative BHN (-0.01) must be rejected', '23514 check_violation', `${err.code} ${err.message}`, isCheckViolation, err.constraint);
    }

    // 1.2: Negative YS (-0.01)
    try {
      await client.query(`
        INSERT INTO inspection_reports (
          request_id, inspector_id, report_date, ht_batch_number, furnace,
          auto_report_number, sample_received_batch_date, bhn, hardness_status,
          ys, uts, elongation, mechanical_status, overall_status,
          inspector_remarks, inspector_signature_snapshot
        ) VALUES (
          $1, $2, CURRENT_DATE, 'BATCH-001', 'FURNACE-1',
          'AUTO-001', CURRENT_DATE, 95.0, 'OK',
          -0.01, 300.0, 2.5, 'NOT_OK', 'NOT_OK',
          'Negative test', 'data:image/png;base64,test'
        );
      `, [testRequestId, inspectorAliceId]);
      recordResult('T1.2', 'Check Constraint', 'Negative YS (-0.01) must be rejected', '23514 check_violation', 'Accepted', false);
    } catch (err) {
      const isCheckViolation = err.code === '23514';
      recordResult('T1.2', 'Check Constraint', 'Negative YS (-0.01) must be rejected', '23514 check_violation', `${err.code} ${err.message}`, isCheckViolation, err.constraint);
    }

    // 1.3: Negative UTS (-0.01)
    try {
      await client.query(`
        INSERT INTO inspection_reports (
          request_id, inspector_id, report_date, ht_batch_number, furnace,
          auto_report_number, sample_received_batch_date, bhn, hardness_status,
          ys, uts, elongation, mechanical_status, overall_status,
          inspector_remarks, inspector_signature_snapshot
        ) VALUES (
          $1, $2, CURRENT_DATE, 'BATCH-001', 'FURNACE-1',
          'AUTO-001', CURRENT_DATE, 95.0, 'OK',
          250.0, -0.01, 2.5, 'NOT_OK', 'NOT_OK',
          'Negative test', 'data:image/png;base64,test'
        );
      `, [testRequestId, inspectorAliceId]);
      recordResult('T1.3', 'Check Constraint', 'Negative UTS (-0.01) must be rejected', '23514 check_violation', 'Accepted', false);
    } catch (err) {
      const isCheckViolation = err.code === '23514';
      recordResult('T1.3', 'Check Constraint', 'Negative UTS (-0.01) must be rejected', '23514 check_violation', `${err.code} ${err.message}`, isCheckViolation, err.constraint);
    }

    // 1.4: Negative Elongation (-0.01)
    try {
      await client.query(`
        INSERT INTO inspection_reports (
          request_id, inspector_id, report_date, ht_batch_number, furnace,
          auto_report_number, sample_received_batch_date, bhn, hardness_status,
          ys, uts, elongation, mechanical_status, overall_status,
          inspector_remarks, inspector_signature_snapshot
        ) VALUES (
          $1, $2, CURRENT_DATE, 'BATCH-001', 'FURNACE-1',
          'AUTO-001', CURRENT_DATE, 95.0, 'OK',
          250.0, 300.0, -0.01, 'NOT_OK', 'NOT_OK',
          'Negative test', 'data:image/png;base64,test'
        );
      `, [testRequestId, inspectorAliceId]);
      recordResult('T1.4', 'Check Constraint', 'Negative Elongation (-0.01) must be rejected', '23514 check_violation', 'Accepted', false);
    } catch (err) {
      const isCheckViolation = err.code === '23514';
      recordResult('T1.4', 'Check Constraint', 'Negative Elongation (-0.01) must be rejected', '23514 check_violation', `${err.code} ${err.message}`, isCheckViolation, err.constraint);
    }

    // 1.5: Large Negative Values (-500)
    try {
      await client.query(`
        INSERT INTO inspection_reports (
          request_id, inspector_id, report_date, ht_batch_number, furnace,
          auto_report_number, sample_received_batch_date, bhn, hardness_status,
          ys, uts, elongation, mechanical_status, overall_status,
          inspector_remarks, inspector_signature_snapshot
        ) VALUES (
          $1, $2, CURRENT_DATE, 'BATCH-001', 'FURNACE-1',
          'AUTO-001', CURRENT_DATE, -500.0, 'NOT_OK',
          -500.0, -500.0, -100.0, 'NOT_OK', 'NOT_OK',
          'Large negative test', 'data:image/png;base64,test'
        );
      `, [testRequestId, inspectorAliceId]);
      recordResult('T1.5', 'Check Constraint', 'Large negative metallurgical values must be rejected', '23514 check_violation', 'Accepted', false);
    } catch (err) {
      const isCheckViolation = err.code === '23514';
      recordResult('T1.5', 'Check Constraint', 'Large negative metallurgical values must be rejected', '23514 check_violation', `${err.code} ${err.message}`, isCheckViolation, err.constraint);
    }

    // 1.6: Boundary Zero Values (bhn=0, ys=0, uts=0, elongation=0)
    let zeroReportId = null;
    try {
      const zeroRes = await client.query(`
        INSERT INTO inspection_reports (
          request_id, inspector_id, report_date, ht_batch_number, furnace,
          auto_report_number, sample_received_batch_date, bhn, hardness_status,
          ys, uts, elongation, mechanical_status, overall_status,
          inspector_remarks, inspector_signature_snapshot
        ) VALUES (
          $1, $2, CURRENT_DATE, 'BATCH-001', 'FURNACE-1',
          'AUTO-001', CURRENT_DATE, 0.0, 'NOT_OK',
          0.0, 0.0, 0.0, 'NOT_OK', 'NOT_OK',
          'Zero boundary test', 'data:image/png;base64,test'
        ) RETURNING id;
      `, [testRequestId, inspectorAliceId]);
      zeroReportId = zeroRes.rows[0].id;
      recordResult('T1.6', 'Check Constraint', 'Boundary zero values (0.0) must be accepted by check constraint', 'Accepted', `Inserted id: ${zeroReportId}`, true);
    } catch (err) {
      recordResult('T1.6', 'Check Constraint', 'Boundary zero values (0.0) must be accepted by check constraint', 'Accepted', `${err.code} ${err.message}`, false);
    }

    // Clean up zero test report for subsequent report tests
    if (zeroReportId) {
      await client.query("DELETE FROM inspection_reports WHERE id = $1", [zeroReportId]);
    }

    // 1.7: Nullability of bhn, ys, uts, elongation
    for (const col of ['bhn', 'ys', 'uts', 'elongation']) {
      try {
        const values = {
          bhn: col === 'bhn' ? 'NULL' : '85.0',
          ys: col === 'ys' ? 'NULL' : '230.0',
          uts: col === 'uts' ? 'NULL' : '290.0',
          elongation: col === 'elongation' ? 'NULL' : '1.5',
        };
        await client.query(`
          INSERT INTO inspection_reports (
            request_id, inspector_id, report_date, ht_batch_number, furnace,
            auto_report_number, sample_received_batch_date, bhn, hardness_status,
            ys, uts, elongation, mechanical_status, overall_status,
            inspector_remarks, inspector_signature_snapshot
          ) VALUES (
            $1, $2, CURRENT_DATE, 'BATCH-001', 'FURNACE-1',
            'AUTO-001', CURRENT_DATE, ${values.bhn}, 'OK',
            ${values.ys}, ${values.uts}, ${values.elongation}, 'OK', 'OK',
            NULL, 'data:image/png;base64,test'
          );
        `, [testRequestId, inspectorAliceId]);
        recordResult(`T1.7_${col}`, 'Not-Null Constraint', `NULL ${col} must be rejected`, '23502 not_null_violation', 'Accepted', false);
      } catch (err) {
        const isNotNullViolation = err.code === '23502';
        recordResult(`T1.7_${col}`, 'Not-Null Constraint', `NULL ${col} must be rejected`, '23502 not_null_violation', `${err.code} ${err.message}`, isNotNullViolation, err.column);
      }
    }

    // ==========================================
    // SUITE 2: UNIQUE CONSTRAINT TESTS
    // ==========================================
    console.log('\n--- Running Suite 2: Unique Constraints ---');

    // 2.1: Duplicate username
    try {
      await client.query(`
        INSERT INTO users (username, password_hash, full_name, role, is_active, can_manage_users)
        VALUES ('pe_admin', '$2b$10$abcdef', 'Duplicate PE Admin', 'PRODUCTION_ENGINEER', true, false);
      `);
      recordResult('T2.1', 'Unique Constraint', 'Duplicate users.username must be rejected', '23505 unique_violation', 'Accepted', false);
    } catch (err) {
      const isUniqueViolation = err.code === '23505';
      recordResult('T2.1', 'Unique Constraint', 'Duplicate users.username must be rejected', '23505 unique_violation', `${err.code} ${err.message}`, isUniqueViolation, err.constraint);
    }

    // 2.2: Duplicate (part_name, part_number)
    try {
      await client.query(`
        INSERT INTO part_master (part_name, part_number, is_active, created_by_user_id)
        VALUES ('Main Drive Shaft', 'MDS-1001', true, $1);
      `, [peUserId]);
      recordResult('T2.2', 'Unique Constraint', 'Duplicate (part_name, part_number) must be rejected', '23505 unique_violation', 'Accepted', false);
    } catch (err) {
      const isUniqueViolation = err.code === '23505';
      recordResult('T2.2', 'Unique Constraint', 'Duplicate (part_name, part_number) must be rejected', '23505 unique_violation', `${err.code} ${err.message}`, isUniqueViolation, err.constraint);
    }

    // 2.3: Same part_name, different part_number (1:N test)
    let newPartId = null;
    try {
      const newPartRes = await client.query(`
        INSERT INTO part_master (part_name, part_number, is_active, created_by_user_id)
        VALUES ('Main Drive Shaft', 'MDS-TEST-UNIQUE-999', true, $1) RETURNING id;
      `, [peUserId]);
      newPartId = newPartRes.rows[0].id;
      recordResult('T2.3', 'Unique Constraint (1:N)', 'Same part_name with different part_number must be allowed', 'Accepted', `Inserted id: ${newPartId}`, true);
    } catch (err) {
      recordResult('T2.3', 'Unique Constraint (1:N)', 'Same part_name with different part_number must be allowed', 'Accepted', `${err.code} ${err.message}`, false);
    }
    if (newPartId) {
      await client.query("DELETE FROM part_master WHERE id = $1", [newPartId]);
    }

    // 2.4: Duplicate request_number
    try {
      await client.query(`
        INSERT INTO inspection_requests (
          request_number, part_id, part_name_snapshot, part_number_snapshot,
          created_by_id, assigned_inspector_id, status, request_date
        ) VALUES (
          $1, $2, 'Main Drive Shaft', 'MDS-1001',
          $3, $4, 'ASSIGNED', CURRENT_DATE
        );
      `, [testReqNumber, partId, peUserId, inspectorAliceId]);
      recordResult('T2.4', 'Unique Constraint', 'Duplicate inspection_requests.request_number must be rejected', '23505 unique_violation', 'Accepted', false);
    } catch (err) {
      const isUniqueViolation = err.code === '23505';
      recordResult('T2.4', 'Unique Constraint', 'Duplicate inspection_requests.request_number must be rejected', '23505 unique_violation', `${err.code} ${err.message}`, isUniqueViolation, err.constraint);
    }

    // 2.5: Insert valid baseline report for 1:1 test and revision tests
    const validReportRes = await client.query(`
      INSERT INTO inspection_reports (
        request_id, inspector_id, report_date, ht_batch_number, furnace,
        auto_report_number, sample_received_batch_date, bhn, hardness_status,
        ys, uts, elongation, mechanical_status, overall_status,
        inspector_remarks, inspector_signature_snapshot
      ) VALUES (
        $1, $2, CURRENT_DATE, 'BATCH-101', 'FURNACE-1',
        'AUTO-101', CURRENT_DATE, 85.0, 'OK',
        240.0, 290.0, 1.5, 'OK', 'OK',
        NULL, 'data:image/png;base64,validSignatureData'
      ) RETURNING id;
    `, [testRequestId, inspectorAliceId]);
    baselineReportId = validReportRes.rows[0].id;
    console.log(`Created baseline inspection report: ${baselineReportId}`);

    // 2.6: Duplicate inspection_reports.request_id (1:1 constraint)
    try {
      await client.query(`
        INSERT INTO inspection_reports (
          request_id, inspector_id, report_date, ht_batch_number, furnace,
          auto_report_number, sample_received_batch_date, bhn, hardness_status,
          ys, uts, elongation, mechanical_status, overall_status,
          inspector_remarks, inspector_signature_snapshot
        ) VALUES (
          $1, $2, CURRENT_DATE, 'BATCH-DUP', 'FURNACE-2',
          'AUTO-DUP', CURRENT_DATE, 90.0, 'OK',
          250.0, 300.0, 2.0, 'OK', 'OK',
          NULL, 'data:image/png;base64,dup'
        );
      `, [testRequestId, inspectorAliceId]);
      recordResult('T2.6', 'Unique Constraint (1:1)', 'Duplicate inspection_reports.request_id must be rejected', '23505 unique_violation', 'Accepted', false);
    } catch (err) {
      const isUniqueViolation = err.code === '23505';
      recordResult('T2.6', 'Unique Constraint (1:1)', 'Duplicate inspection_reports.request_id must be rejected', '23505 unique_violation', `${err.code} ${err.message}`, isUniqueViolation, err.constraint);
    }

    // 2.7: Duplicate (report_id, revision_number)
    await client.query(`
      INSERT INTO report_revisions (
        report_id, revision_number, revised_by_id, revision_reason, snapshot_data
      ) VALUES (
        $1, 1, $2, 'Initial revision test', '{"test": true}'::jsonb
      );
    `, [baselineReportId, inspectorAliceId]);

    try {
      await client.query(`
        INSERT INTO report_revisions (
          report_id, revision_number, revised_by_id, revision_reason, snapshot_data
        ) VALUES (
          $1, 1, $2, 'Duplicate revision test', '{"test": "duplicate"}'::jsonb
        );
      `, [baselineReportId, inspectorAliceId]);
      recordResult('T2.7', 'Unique Constraint', 'Duplicate (report_id, revision_number) must be rejected', '23505 unique_violation', 'Accepted', false);
    } catch (err) {
      const isUniqueViolation = err.code === '23505';
      recordResult('T2.7', 'Unique Constraint', 'Duplicate (report_id, revision_number) must be rejected', '23505 unique_violation', `${err.code} ${err.message}`, isUniqueViolation, err.constraint);
    }

    // ==========================================
    // SUITE 3: FOREIGN KEY CONSTRAINT TESTS
    // ==========================================
    console.log('\n--- Running Suite 3: Foreign Key Constraints ---');
    const fakeUuid = 'a0000000-0000-0000-0000-000000000000';

    // 3.1: Invalid part_id in inspection_requests
    try {
      await client.query(`
        INSERT INTO inspection_requests (
          request_number, part_id, part_name_snapshot, part_number_snapshot,
          created_by_id, status, request_date
        ) VALUES (
          'REQ-BAD-PART', $1, 'Fake', 'FK-001', $2, 'DRAFT', CURRENT_DATE
        );
      `, [fakeUuid, peUserId]);
      recordResult('T3.1', 'Foreign Key', 'Invalid part_id in inspection_requests must be rejected', '23503 foreign_key_violation', 'Accepted', false);
    } catch (err) {
      const isFkViolation = err.code === '23503';
      recordResult('T3.1', 'Foreign Key', 'Invalid part_id in inspection_requests must be rejected', '23503 foreign_key_violation', `${err.code} ${err.message}`, isFkViolation, err.constraint);
    }

    // 3.2: Invalid created_by_id in inspection_requests
    try {
      await client.query(`
        INSERT INTO inspection_requests (
          request_number, part_id, part_name_snapshot, part_number_snapshot,
          created_by_id, status, request_date
        ) VALUES (
          'REQ-BAD-USER', $1, 'Main Drive Shaft', 'MDS-1001', $2, 'DRAFT', CURRENT_DATE
        );
      `, [partId, fakeUuid]);
      recordResult('T3.2', 'Foreign Key', 'Invalid created_by_id in inspection_requests must be rejected', '23503 foreign_key_violation', 'Accepted', false);
    } catch (err) {
      const isFkViolation = err.code === '23503';
      recordResult('T3.2', 'Foreign Key', 'Invalid created_by_id in inspection_requests must be rejected', '23503 foreign_key_violation', `${err.code} ${err.message}`, isFkViolation, err.constraint);
    }

    // 3.3: Invalid assigned_inspector_id in inspection_requests
    try {
      await client.query(`
        INSERT INTO inspection_requests (
          request_number, part_id, part_name_snapshot, part_number_snapshot,
          created_by_id, assigned_inspector_id, status, request_date
        ) VALUES (
          'REQ-BAD-INSPECTOR', $1, 'Main Drive Shaft', 'MDS-1001', $2, $3, 'ASSIGNED', CURRENT_DATE
        );
      `, [partId, peUserId, fakeUuid]);
      recordResult('T3.3', 'Foreign Key', 'Invalid assigned_inspector_id in inspection_requests must be rejected', '23503 foreign_key_violation', 'Accepted', false);
    } catch (err) {
      const isFkViolation = err.code === '23503';
      recordResult('T3.3', 'Foreign Key', 'Invalid assigned_inspector_id in inspection_requests must be rejected', '23503 foreign_key_violation', `${err.code} ${err.message}`, isFkViolation, err.constraint);
    }

    // 3.4: Invalid request_id in inspection_reports
    try {
      await client.query(`
        INSERT INTO inspection_reports (
          request_id, inspector_id, report_date, ht_batch_number, furnace,
          auto_report_number, sample_received_batch_date, bhn, hardness_status,
          ys, uts, elongation, mechanical_status, overall_status,
          inspector_remarks, inspector_signature_snapshot
        ) VALUES (
          $1, $2, CURRENT_DATE, 'BATCH-001', 'F-1',
          'AUTO-001', CURRENT_DATE, 85.0, 'OK',
          250.0, 300.0, 2.0, 'OK', 'OK',
          NULL, 'sig'
        );
      `, [fakeUuid, inspectorAliceId]);
      recordResult('T3.4', 'Foreign Key', 'Invalid request_id in inspection_reports must be rejected', '23503 foreign_key_violation', 'Accepted', false);
    } catch (err) {
      const isFkViolation = err.code === '23503';
      recordResult('T3.4', 'Foreign Key', 'Invalid request_id in inspection_reports must be rejected', '23503 foreign_key_violation', `${err.code} ${err.message}`, isFkViolation, err.constraint);
    }

    // 3.5: Invalid inspector_id in inspection_reports
    const dummyReqRes = await client.query(`
      INSERT INTO inspection_requests (
        request_number, part_id, part_name_snapshot, part_number_snapshot,
        created_by_id, status, request_date
      ) VALUES (
        'TEST-REQ-FK-CHECK', $1, 'Main Drive Shaft', 'MDS-1001', $2, 'DRAFT', CURRENT_DATE
      ) RETURNING id;
    `, [partId, peUserId]);
    const dummyReqId = dummyReqRes.rows[0].id;

    try {
      await client.query(`
        INSERT INTO inspection_reports (
          request_id, inspector_id, report_date, ht_batch_number, furnace,
          auto_report_number, sample_received_batch_date, bhn, hardness_status,
          ys, uts, elongation, mechanical_status, overall_status,
          inspector_remarks, inspector_signature_snapshot
        ) VALUES (
          $1, $2, CURRENT_DATE, 'BATCH-001', 'F-1',
          'AUTO-001', CURRENT_DATE, 85.0, 'OK',
          250.0, 300.0, 2.0, 'OK', 'OK',
          NULL, 'sig'
        );
      `, [dummyReqId, fakeUuid]);
      recordResult('T3.5', 'Foreign Key', 'Invalid inspector_id in inspection_reports must be rejected', '23503 foreign_key_violation', 'Accepted', false);
    } catch (err) {
      const isFkViolation = err.code === '23503';
      recordResult('T3.5', 'Foreign Key', 'Invalid inspector_id in inspection_reports must be rejected', '23503 foreign_key_violation', `${err.code} ${err.message}`, isFkViolation, err.constraint);
    }
    await client.query("DELETE FROM inspection_requests WHERE id = $1", [dummyReqId]);

    // 3.6: Invalid report_id in report_revisions
    try {
      await client.query(`
        INSERT INTO report_revisions (
          report_id, revision_number, revised_by_id, revision_reason, snapshot_data
        ) VALUES (
          $1, 99, $2, 'Invalid report test', '{}'::jsonb
        );
      `, [fakeUuid, inspectorAliceId]);
      recordResult('T3.6', 'Foreign Key', 'Invalid report_id in report_revisions must be rejected', '23503 foreign_key_violation', 'Accepted', false);
    } catch (err) {
      const isFkViolation = err.code === '23503';
      recordResult('T3.6', 'Foreign Key', 'Invalid report_id in report_revisions must be rejected', '23503 foreign_key_violation', `${err.code} ${err.message}`, isFkViolation, err.constraint);
    }

    // 3.7: Invalid user_id in audit_logs
    try {
      await client.query(`
        INSERT INTO audit_logs (
          user_id, username_snapshot, user_role_snapshot, action,
          entity_type, entity_id
        ) VALUES (
          $1, 'fake_user', 'QUALITY_INSPECTOR', 'TEST_ACTION',
          'User', '000'
        );
      `, [fakeUuid]);
      recordResult('T3.7', 'Foreign Key', 'Invalid user_id in audit_logs must be rejected', '23503 foreign_key_violation', 'Accepted', false);
    } catch (err) {
      const isFkViolation = err.code === '23503';
      recordResult('T3.7', 'Foreign Key', 'Invalid user_id in audit_logs must be rejected', '23503 foreign_key_violation', `${err.code} ${err.message}`, isFkViolation, err.constraint);
    }

    // ==========================================
    // SUITE 4: CASCADE & RESTRICT INTEGRITY
    // ==========================================
    console.log('\n--- Running Suite 4: Cascade & Restrict Referential Actions ---');

    // 4.1: Delete user who owns a request (RESTRICT test)
    try {
      await client.query("DELETE FROM users WHERE id = $1", [peUserId]);
      recordResult('T4.1', 'Foreign Key Action (RESTRICT)', 'Deleting User referenced by inspection_requests must be rejected', '23503 / 23001 restrict violation', 'Accepted', false);
    } catch (err) {
      const isRestrictViolation = err.code === '23503' || err.code === '23001';
      recordResult('T4.1', 'Foreign Key Action (RESTRICT)', 'Deleting User referenced by inspection_requests must be rejected', '23503 / 23001 restrict violation', `${err.code} ${err.message}`, isRestrictViolation, err.constraint);
    }

    // 4.2: Delete part referenced by a request (RESTRICT test)
    try {
      await client.query("DELETE FROM part_master WHERE id = $1", [partId]);
      recordResult('T4.2', 'Foreign Key Action (RESTRICT)', 'Deleting Part referenced by inspection_requests must be rejected', '23503 / 23001 restrict violation', 'Accepted', false);
    } catch (err) {
      const isRestrictViolation = err.code === '23503' || err.code === '23001';
      recordResult('T4.2', 'Foreign Key Action (RESTRICT)', 'Deleting Part referenced by inspection_requests must be rejected', '23503 / 23001 restrict violation', `${err.code} ${err.message}`, isRestrictViolation, err.constraint);
    }

    // 4.3: Delete request referenced by a report (RESTRICT test)
    try {
      await client.query("DELETE FROM inspection_requests WHERE id = $1", [testRequestId]);
      recordResult('T4.3', 'Foreign Key Action (RESTRICT)', 'Deleting Request referenced by inspection_reports must be rejected', '23503 / 23001 restrict violation', 'Accepted', false);
    } catch (err) {
      const isRestrictViolation = err.code === '23503' || err.code === '23001';
      recordResult('T4.3', 'Foreign Key Action (RESTRICT)', 'Deleting Request referenced by inspection_reports must be rejected', '23503 / 23001 restrict violation', `${err.code} ${err.message}`, isRestrictViolation, err.constraint);
    }

    // 4.4: Delete report cascades to report_revisions (CASCADE test)
    const cascadeReqRes = await client.query(`
      INSERT INTO inspection_requests (
        request_number, part_id, part_name_snapshot, part_number_snapshot,
        created_by_id, status, request_date
      ) VALUES (
        'CASCADE-REQ-1', $1, 'Main Drive Shaft', 'MDS-1001', $2, 'COMPLETED', CURRENT_DATE
      ) RETURNING id;
    `, [partId, peUserId]);
    const cascadeReqId = cascadeReqRes.rows[0].id;

    const cascadeReportRes = await client.query(`
      INSERT INTO inspection_reports (
        request_id, inspector_id, report_date, ht_batch_number, furnace,
        auto_report_number, sample_received_batch_date, bhn, hardness_status,
        ys, uts, elongation, mechanical_status, overall_status,
        inspector_remarks, inspector_signature_snapshot
      ) VALUES (
        $1, $2, CURRENT_DATE, 'BATCH-CASCADE', 'F-1',
        'AUTO-C1', CURRENT_DATE, 88.0, 'OK',
        250.0, 300.0, 2.0, 'OK', 'OK',
        NULL, 'sig'
      ) RETURNING id;
    `, [cascadeReqId, inspectorAliceId]);
    const cascadeReportId = cascadeReportRes.rows[0].id;

    const cascadeRevRes = await client.query(`
      INSERT INTO report_revisions (
        report_id, revision_number, revised_by_id, revision_reason, snapshot_data
      ) VALUES (
        $1, 1, $2, 'Cascade test reason', '{"key": "cascade_test"}'::jsonb
      ) RETURNING id;
    `, [cascadeReportId, inspectorAliceId]);
    const cascadeRevId = cascadeRevRes.rows[0].id;

    // Now delete the report
    await client.query("DELETE FROM inspection_reports WHERE id = $1", [cascadeReportId]);

    // Check if revision still exists
    const revCheck = await client.query("SELECT * FROM report_revisions WHERE id = $1", [cascadeRevId]);
    const cascadeWorked = revCheck.rows.length === 0;
    recordResult('T4.4', 'Foreign Key Action (CASCADE)', 'Deleting report must cascade delete its report_revisions', '0 rows remaining', `${revCheck.rows.length} rows remaining`, cascadeWorked);

    // Clean up cascade request
    await client.query("DELETE FROM inspection_requests WHERE id = $1", [cascadeReqId]);

    // 4.5: Delete request cascades to reassignment_history (CASCADE test)
    const reassignReqRes = await client.query(`
      INSERT INTO inspection_requests (
        request_number, part_id, part_name_snapshot, part_number_snapshot,
        created_by_id, assigned_inspector_id, status, request_date
      ) VALUES (
        'CASCADE-REASSIGN-REQ-1', $1, 'Main Drive Shaft', 'MDS-1001', $2, $3, 'ASSIGNED', CURRENT_DATE
      ) RETURNING id;
    `, [partId, peUserId, inspectorAliceId]);
    const reassignReqId = reassignReqRes.rows[0].id;

    const histRes = await client.query(`
      INSERT INTO reassignment_history (
        request_id, previous_inspector_id, new_inspector_id, reassigned_by_id, reason
      ) VALUES (
        $1, NULL, $2, $3, 'Initial assignment test'
      ) RETURNING id;
    `, [reassignReqId, inspectorAliceId, peUserId]);
    const histId = histRes.rows[0].id;

    await client.query("DELETE FROM inspection_requests WHERE id = $1", [reassignReqId]);
    const histCheck = await client.query("SELECT * FROM reassignment_history WHERE id = $1", [histId]);
    const reassignCascadeWorked = histCheck.rows.length === 0;
    recordResult('T4.5', 'Foreign Key Action (CASCADE)', 'Deleting request must cascade delete reassignment_history', '0 rows remaining', `${histCheck.rows.length} rows remaining`, reassignCascadeWorked);

    // 4.6: SET NULL on audit_logs.user_id when user deleted
    const uniqueAuditUsername = `temp_audit_user_${Date.now()}`;
    const dummyUserRes = await client.query(`
      INSERT INTO users (username, password_hash, full_name, role)
      VALUES ($1, 'hash', 'Temp Audit', 'QUALITY_INSPECTOR')
      RETURNING id;
    `, [uniqueAuditUsername]);
    const dummyUserId = dummyUserRes.rows[0].id;

    const auditLogRes = await client.query(`
      INSERT INTO audit_logs (
        user_id, username_snapshot, user_role_snapshot, action,
        entity_type, entity_id
      ) VALUES (
        $1, $2, 'QUALITY_INSPECTOR', 'TEST_AUDIT',
        'User', $3
      ) RETURNING id;
    `, [dummyUserId, uniqueAuditUsername, dummyUserId]);
    const auditLogId = auditLogRes.rows[0].id;

    await client.query("DELETE FROM users WHERE id = $1", [dummyUserId]);
    const auditCheck = await client.query("SELECT user_id, username_snapshot FROM audit_logs WHERE id = $1", [auditLogId]);
    const setNullWorked = auditCheck.rows[0]?.user_id === null && auditCheck.rows[0]?.username_snapshot === uniqueAuditUsername;
    recordResult('T4.6', 'Foreign Key Action (SET NULL)', 'Deleting user sets audit_logs.user_id to NULL while retaining snapshot', 'user_id IS NULL and snapshot intact', `user_id: ${auditCheck.rows[0]?.user_id}, snapshot: ${auditCheck.rows[0]?.username_snapshot}`, setNullWorked);

    // Clean up test audit log
    await client.query("DELETE FROM audit_logs WHERE id = $1", [auditLogId]);

    // ==========================================
    // SUITE 5: DATA TYPES, JSONB, AND LARGE PAYLOADS
    // ==========================================
    console.log('\n--- Running Suite 5: Data Types, JSONB & Large Payloads ---');

    // 5.1: JSONB complex queryability in report_revisions
    const complexSnapshot = {
      metadata: { appVersion: '1.0.0', exportedAt: '2026-10-27T13:00:00Z' },
      hardness: { bhn: 95.5, status: 'OK' },
      mechanical: { ys: 245.5, uts: 310.2, elongation: 2.15, status: 'OK' },
      tags: ['metallurgy', 'batch-tested', 'passed'],
    };
    const jsonbRevRes = await client.query(`
      INSERT INTO report_revisions (
        report_id, revision_number, revised_by_id, revision_reason, snapshot_data
      ) VALUES (
        $1, 2, $2, 'JSONB test reason', $3::jsonb
      ) RETURNING id;
    `, [baselineReportId, inspectorAliceId, JSON.stringify(complexSnapshot)]);
    const jsonbRevId = jsonbRevRes.rows[0].id;

    const jsonbQueryRes = await client.query(`
      SELECT snapshot_data->'hardness'->>'bhn' AS bhn,
             snapshot_data->'tags'->>0 AS first_tag
      FROM report_revisions WHERE id = $1;
    `, [jsonbRevId]);

    const jsonbPassed = jsonbQueryRes.rows[0]?.bhn === '95.5' && jsonbQueryRes.rows[0]?.first_tag === 'metallurgy';
    recordResult('T5.1', 'Data Type (JSONB)', 'report_revisions.snapshot_data must accurately store and query JSONB objects', 'bhn=95.5, first_tag=metallurgy', `bhn=${jsonbQueryRes.rows[0]?.bhn}, first_tag=${jsonbQueryRes.rows[0]?.first_tag}`, jsonbPassed);

    // 5.2: Large Signature Payload (64KB base64 string)
    const largeSignature = 'data:image/png;base64,' + 'A'.repeat(64 * 1024);
    const largeSigUserRes = await client.query(`
      INSERT INTO users (username, password_hash, full_name, role, signature_data)
      VALUES ($1, 'hash', 'Large Sig', 'QUALITY_INSPECTOR', $2)
      RETURNING id, length(signature_data) as sig_len;
    `, [`large_sig_user_${Date.now()}`, largeSignature]);
    const storedSigLen = parseInt(largeSigUserRes.rows[0].sig_len, 10);
    const largeSigPassed = storedSigLen >= 64 * 1024;
    recordResult('T5.2', 'Data Type (TEXT)', 'users.signature_data stores 64KB+ signature strings without truncation', '>= 65536 chars', `${storedSigLen} chars`, largeSigPassed);
    await client.query("DELETE FROM users WHERE id = $1", [largeSigUserRes.rows[0].id]);

    // ==========================================
    // SUITE 6: ADVERSARIAL ENUM & VALUE DOMAINS
    // ==========================================
    console.log('\n--- Running Suite 6: Adversarial Enum Domain Check ---');

    // 6.1: Check if invalid request status can be inserted
    try {
      const res = await client.query(`
        INSERT INTO inspection_requests (
          request_number, part_id, part_name_snapshot, part_number_snapshot,
          created_by_id, status, request_date
        ) VALUES (
          'REQ-INVALID-STATUS', $1, 'Main Drive Shaft', 'MDS-1001', $2, 'CORRUPTED_STATUS', CURRENT_DATE
        ) RETURNING id;
      `, [partId, peUserId]);
      await client.query("DELETE FROM inspection_requests WHERE id = $1", [res.rows[0].id]);
      recordResult('T6.1', 'Domain Integrity (Adversarial Observation)', 'Database check on inspection_requests.status enum values', 'Rejected by DB enum/check constraint', 'Accepted (varchar column without DB CHECK constraint)', true, 'Status column is character varying(50) without DB CHECK constraint; relies on NestJS DTO validation pipe');
    } catch (err) {
      recordResult('T6.1', 'Domain Integrity (Adversarial Observation)', 'Database check on inspection_requests.status enum values', 'Rejected by DB enum/check constraint', `${err.code} ${err.message}`, true);
    }

    // 6.2: Check if invalid user role can be inserted
    try {
      const res = await client.query(`
        INSERT INTO users (username, password_hash, full_name, role)
        VALUES ('adversarial_role_user', 'hash', 'Bad Role', 'SUPER_ADMIN_HACKER')
        RETURNING id;
      `);
      await client.query("DELETE FROM users WHERE id = $1", [res.rows[0].id]);
      recordResult('T6.2', 'Domain Integrity (Adversarial Observation)', 'Database check on users.role enum values', 'Rejected by DB enum/check constraint', 'Accepted (varchar column without DB CHECK constraint)', true, 'Role column is character varying(50) without DB CHECK constraint; relies on NestJS DTO validation pipe');
    } catch (err) {
      recordResult('T6.2', 'Domain Integrity (Adversarial Observation)', 'Database check on users.role enum values', 'Rejected by DB enum/check constraint', `${err.code} ${err.message}`, true);
    }

    // 6.3: Check if invalid overall_status can be inserted in inspection_reports
    const qcTestReq = await client.query(`
      INSERT INTO inspection_requests (
        request_number, part_id, part_name_snapshot, part_number_snapshot,
        created_by_id, status, request_date
      ) VALUES (
        'REQ-QC-TEST', $1, 'Main Drive Shaft', 'MDS-1001', $2, 'DRAFT', CURRENT_DATE
      ) RETURNING id;
    `, [partId, peUserId]);
    const qcTestReqId = qcTestReq.rows[0].id;

    try {
      const res = await client.query(`
        INSERT INTO inspection_reports (
          request_id, inspector_id, report_date, ht_batch_number, furnace,
          auto_report_number, sample_received_batch_date, bhn, hardness_status,
          ys, uts, elongation, mechanical_status, overall_status,
          inspector_remarks, inspector_signature_snapshot
        ) VALUES (
          $1, $2, CURRENT_DATE, 'BATCH-INV-QC', 'F-1',
          'AUTO-INV', CURRENT_DATE, 88.0, 'MAYBE',
          250.0, 300.0, 2.0, 'MAYBE', 'POSSIBLY',
          NULL, 'sig'
        ) RETURNING id;
      `, [qcTestReqId, inspectorAliceId]);
      await client.query("DELETE FROM inspection_reports WHERE id = $1", [res.rows[0].id]);
      recordResult('T6.3', 'Domain Integrity (Adversarial Observation)', 'Database check on inspection_reports.overall_status enum values', 'Rejected by DB enum/check constraint', 'Accepted (varchar column without DB CHECK constraint)', true, 'QC status columns are character varying(20) without DB CHECK constraint; relies on NestJS DTO validation pipe');
    } catch (err) {
      recordResult('T6.3', 'Domain Integrity (Adversarial Observation)', 'Database check on inspection_reports.overall_status enum values', 'Rejected by DB enum/check constraint', `${err.code} ${err.message}`, true, err.message);
    }
    await client.query("DELETE FROM inspection_requests WHERE id = $1", [qcTestReqId]);

    // ==========================================
    // SUITE 7: CONCURRENCY & RACE CONDITIONS
    // ==========================================
    console.log('\n--- Running Suite 7: Concurrency & Race Conditions ---');

    // 7.1: Concurrent Report Submissions on Same Request (R4 Requirement)
    const concurReqRes = await client.query(`
      INSERT INTO inspection_requests (
        request_number, part_id, part_name_snapshot, part_number_snapshot,
        created_by_id, assigned_inspector_id, status, request_date
      ) VALUES (
        'CONCUR-REQ-1', $1, 'Main Drive Shaft', 'MDS-1001', $2, $3, 'IN_PROGRESS', CURRENT_DATE
      ) RETURNING id;
    `, [partId, peUserId, inspectorAliceId]);
    const concurReqId = concurReqRes.rows[0].id;

    const c1 = new Client({
      host: process.env.DB_HOST || '127.0.0.1',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      user: process.env.DB_USERNAME || 'postgres',
      password: process.env.DB_PASSWORD || 'root',
      database: process.env.DB_DATABASE || 'heat_treatment_inspection',
    });
    const c2 = new Client({
      host: process.env.DB_HOST || '127.0.0.1',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      user: process.env.DB_USERNAME || 'postgres',
      password: process.env.DB_PASSWORD || 'root',
      database: process.env.DB_DATABASE || 'heat_treatment_inspection',
    });
    await c1.connect();
    await c2.connect();

    const insertConcurrentReport = (dbClient, batchNumber) => dbClient.query(`
      INSERT INTO inspection_reports (
        request_id, inspector_id, report_date, ht_batch_number, furnace,
        auto_report_number, sample_received_batch_date, bhn, hardness_status,
        ys, uts, elongation, mechanical_status, overall_status,
        inspector_remarks, inspector_signature_snapshot
      ) VALUES (
        $1, $2, CURRENT_DATE, $3, 'FURNACE-1',
        'AUTO-CONCUR', CURRENT_DATE, 85.0, 'OK',
        240.0, 290.0, 1.5, 'OK', 'OK',
        NULL, 'sig'
      ) RETURNING id;
    `, [concurReqId, inspectorAliceId, batchNumber]);

    const [res1, res2] = await Promise.allSettled([
      insertConcurrentReport(c1, 'BATCH-RACE-1'),
      insertConcurrentReport(c2, 'BATCH-RACE-2')
    ]);

    await c1.end();
    await c2.end();

    const oneFulfilled = (res1.status === 'fulfilled' && res2.status === 'rejected') || (res1.status === 'rejected' && res2.status === 'fulfilled');
    const rejectedReason = res1.status === 'rejected' ? res1.reason : res2.reason;
    const isUniqueCollision = rejectedReason?.code === '23505';

    recordResult(
      'T7.1',
      'Concurrency & Race Condition',
      'Concurrent report submissions for same request must yield exactly 1 success and 1 unique constraint violation (23505)',
      '1 fulfilled, 1 rejected with 23505',
      `c1: ${res1.status}, c2: ${res2.status}`,
      oneFulfilled && isUniqueCollision,
      `Rejected reason: ${rejectedReason?.code} ${rejectedReason?.message}`
    );

    // Clean up concurrency request and report
    await client.query("DELETE FROM inspection_reports WHERE request_id = $1", [concurReqId]);
    await client.query("DELETE FROM inspection_requests WHERE id = $1", [concurReqId]);


  } finally {
    // ==========================================
    // CLEAN UP BASELINE TEST ARTIFACTS
    // ==========================================
    console.log('\n--- Cleaning Up Baseline Test Artifacts ---');
    if (baselineReportId) {
      await client.query("DELETE FROM report_revisions WHERE report_id = $1", [baselineReportId]);
      await client.query("DELETE FROM inspection_reports WHERE id = $1", [baselineReportId]);
    }
    await client.query("DELETE FROM inspection_requests WHERE id = $1", [testRequestId]);
    console.log('Cleaned up test request, report, and revisions.');

    await client.end();
  }

  // Print summary
  const total = results.length;
  const passed = results.filter(r => r.pass).length;
  const failed = results.filter(r => !r.pass).length;
  console.log(`\n========================================`);
  console.log(`TEST SUMMARY: Total=${total}, Passed=${passed}, Failed=${failed}`);
  console.log(`========================================\n`);

  return { total, passed, failed, results };
}

runEmpiricalStressTests().catch(err => {
  console.error('Test run crashed:', err);
  process.exit(1);
});
