const { Client } = require('../backend/node_modules/pg');

async function cleanDatabase() {
  const client = new Client({
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: 'root',
    database: 'heat_treatment_inspection',
  });

  try {
    await client.connect();
    console.log('Connected to PostgreSQL: heat_treatment_inspection');

    // 1. Truncate all transaction / mock / test data tables
    console.log('Truncating transaction tables...');
    await client.query('TRUNCATE TABLE report_revisions CASCADE');
    await client.query('TRUNCATE TABLE inspection_reports CASCADE');
    await client.query('TRUNCATE TABLE reassignment_history CASCADE');
    await client.query('TRUNCATE TABLE inspection_requests CASCADE');
    await client.query('TRUNCATE TABLE audit_logs CASCADE');
    console.log('✔ All transaction tables truncated (reports, requests, revisions, reassignment, audit logs).');

    // 2. Remove all stress / temporary test users (keep standard system accounts)
    console.log('Cleaning test users...');
    const delUsersRes = await client.query(`
      DELETE FROM users 
      WHERE username LIKE 'qi_test_%' 
         OR username LIKE 'qi_workflow_%'
         OR username LIKE 'test_%'
         OR username LIKE 'mock_%'
    `);
    console.log(`✔ Cleaned ${delUsersRes.rowCount} test/mock user accounts.`);

    // 3. Clean up part_master: remove stress/dummy generated parts and timestamped test parts
    console.log('Cleaning dummy / stress test parts from part_master...');
    const delPartsRes = await client.query(`
      DELETE FROM part_master
      WHERE part_name LIKE 'Adv Stress Part%'
         OR part_name LIKE 'AdvPart_%'
         OR part_name LIKE 'SigPart_%'
         OR part_name LIKE 'Stress Bulk%'
         OR part_name LIKE 'Bulk Test%'
         OR part_name LIKE 'Test Part%'
         OR part_name LIKE 'Imported%'
         OR part_number LIKE '%17931%'
         OR part_number LIKE '%17932%'
         OR part_number LIKE '%test%'
         OR part_name LIKE '%MultiShaft%'
         OR part_name LIKE '%Crankshaft V%'
    `);
    console.log(`✔ Cleaned ${delPartsRes.rowCount} dummy/stress/timestamped parts.`);

    // 4. Ensure the 6 user-specified plant parts from the Excel report are present and active (remove duplicates)
    console.log('Standardizing plant parts...');
    await client.query(`
      DELETE FROM part_master 
      WHERE part_number IN ('TM-BKT-101', 'PTU-COV-201', 'CP-POST-301', 'SA-LH-401', 'SF-FRM-501', 'SA-RH-601')
    `);

    const targetPlantParts = [
      { id: 'prt-tm-bkt-01', name: 'TM BKT', number: 'TM-BKT-001' },
      { id: 'prt-ptu-cov-01', name: 'PTU COVER', number: 'PTU-COV-001' },
      { id: 'prt-chg-pst-01', name: 'CHARGE POST', number: 'CHG-PST-001' },
      { id: 'prt-swg-lh-01', name: 'SWING ARM LH', number: 'SWG-LH-001' },
      { id: 'prt-sub-frm-01', name: 'SUBFRAME', number: 'SUB-FRM-001' },
      { id: 'prt-swg-rh-01', name: 'SWING ARM RH', number: 'SWG-RH-001' },
    ];

    for (const p of targetPlantParts) {
      const exists = await client.query(
        'SELECT id FROM part_master WHERE part_name = $1 AND part_number = $2',
        [p.name, p.number]
      );
      if (exists.rows.length === 0) {
        await client.query(
          'INSERT INTO part_master (id, part_name, part_number, is_active, created_at, updated_at) VALUES ($1, $2, $3, true, NOW(), NOW())',
          [p.id, p.name, p.number]
        );
        console.log(`+ Added plant part: ${p.name} (${p.number})`);
      } else {
        await client.query(
          'UPDATE part_master SET is_active = true WHERE id = $1',
          [exists.rows[0].id]
        );
        console.log(`* Verified active plant part: ${p.name} (${p.number})`);
      }
    }

    // 5. Check remaining row counts
    console.log('\n--- Final Database Status ---');
    const tables = [
      'inspection_requests',
      'inspection_reports',
      'report_revisions',
      'reassignment_history',
      'audit_logs',
      'part_master',
      'users',
      'permissions'
    ];

    for (const t of tables) {
      const cnt = await client.query(`SELECT count(*) FROM ${t}`);
      console.log(`• ${t}: ${cnt.rows[0].count} rows`);
    }

    const remainingUsers = await client.query('SELECT username, role, is_active FROM users ORDER BY username');
    console.log('\nRemaining Users:');
    for (const u of remainingUsers.rows) {
      console.log(`  - ${u.username} (${u.role}, active: ${u.is_active})`);
    }

    const remainingParts = await client.query('SELECT part_name, part_number FROM part_master WHERE is_active = true ORDER BY part_name');
    console.log('\nActive Parts in Part Master:');
    for (const p of remainingParts.rows) {
      console.log(`  - ${p.part_name} [${p.part_number}]`);
    }

    console.log('\n✅ Database successfully cleansed of all default/mock/stress data!');
  } catch (err) {
    console.error('Error cleaning database:', err);
  } finally {
    await client.end();
  }
}

cleanDatabase();
