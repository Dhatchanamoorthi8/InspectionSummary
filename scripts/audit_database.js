const { Client } = require('../backend/node_modules/pg');

async function auditDB() {
  const client = new Client({
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: 'root',
    database: 'heat_treatment_inspection',
  });

  try {
    await client.connect();
    console.log('--- DATABASE AUDIT ---');

    const totalReqs = await client.query('SELECT count(*) FROM inspection_requests');
    const totalReps = await client.query('SELECT count(*) FROM inspection_reports');
    console.log('Total Requests:', totalReqs.rows[0].count);
    console.log('Total Reports:', totalReps.rows[0].count);

    // Group requests by date
    const reqDates = await client.query(`
      SELECT date, count(*) as count 
      FROM inspection_requests 
      GROUP BY date 
      ORDER BY date ASC
    `);
    console.log('\n--- Requests by Date (inspection_requests.date) ---');
    console.table(reqDates.rows);

    // Group reports by report_date
    const repDates = await client.query(`
      SELECT report_date, count(*) as count 
      FROM inspection_reports 
      GROUP BY report_date 
      ORDER BY report_date ASC
    `);
    console.log('\n--- Reports by Report Date (inspection_reports.report_date) ---');
    console.table(repDates.rows);

    // AX-1001 breakdown
    const ax1001Rows = await client.query(`
      SELECT 
        r.id as request_id,
        r.request_number,
        r.date as request_date,
        r.part_number,
        r.part_name,
        r.status,
        rep.id as report_id,
        rep.report_date,
        rep.heat_batch_number,
        rep.bhn,
        rep.ys,
        rep.uts,
        rep.elongation,
        rep.overall_status,
        r.created_at
      FROM inspection_requests r
      LEFT JOIN inspection_reports rep ON rep.request_id = r.id
      WHERE r.part_number = 'AX-1001'
      ORDER BY r.created_at ASC
    `);
    console.log('\n--- AX-1001 Batches Breakdown (Total: ' + ax1001Rows.rows.length + ') ---');
    console.table(ax1001Rows.rows);

    // All distinct part numbers and their batch counts
    const partCounts = await client.query(`
      SELECT 
        r.part_number,
        r.part_name,
        count(r.id) as total_requests,
        count(rep.id) as completed_reports
      FROM inspection_requests r
      LEFT JOIN inspection_reports rep ON rep.request_id = r.id
      GROUP BY r.part_number, r.part_name
      ORDER BY r.part_name, r.part_number
    `);
    console.log('\n--- All Parts Request & Report Counts ---');
    console.table(partCounts.rows);

  } catch (err) {
    console.error('Audit DB error:', err);
  } finally {
    await client.end();
  }
}

auditDB();

