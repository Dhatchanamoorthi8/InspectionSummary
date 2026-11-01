const { Client } = require('../backend/node_modules/pg');

async function distributeDates() {
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

    // 1. Distribute AX-1001 requests and reports across September and October
    const ax1001Completed = await client.query(`
      SELECT req.id as req_id, rep.id as rep_id, rep.heat_batch_number 
      FROM inspection_requests req
      JOIN inspection_reports rep ON rep.request_id = req.id
      WHERE req.part_number = 'AX-1001'
      ORDER BY req.created_at ASC
    `);

    const ax1001Dates = [
      '2026-09-08',
      '2026-09-15',
      '2026-09-22',
      '2026-09-29',
      '2026-10-06',
      '2026-10-14',
      '2026-10-21',
      '2026-10-28',
    ];

    console.log(`Updating ${ax1001Completed.rows.length} AX-1001 completed batches...`);
    for (let i = 0; i < ax1001Completed.rows.length; i++) {
      const row = ax1001Completed.rows[i];
      const targetDate = ax1001Dates[i % ax1001Dates.length];
      const reqTimestamp = `${targetDate}T09:30:00.000Z`;
      const repTimestamp = `${targetDate}T11:15:00.000Z`;

      await client.query(
        'UPDATE inspection_requests SET date = $1, created_at = $2, updated_at = $2 WHERE id = $3',
        [targetDate, reqTimestamp, row.req_id]
      );
      await client.query(
        'UPDATE inspection_reports SET report_date = $1, created_at = $2, updated_at = $2 WHERE id = $3',
        [targetDate, repTimestamp, row.rep_id]
      );
      console.log(`✔ AX-1001 [${row.heat_batch_number}] -> ${targetDate}`);
    }

    // Pending AX-1001 requests
    const ax1001Pending = await client.query(`
      SELECT req.id as req_id
      FROM inspection_requests req
      LEFT JOIN inspection_reports rep ON rep.request_id = req.id
      WHERE req.part_number = 'AX-1001' AND rep.id IS NULL
      ORDER BY req.created_at ASC
    `);
    const pendingAxDates = ['2026-10-29', '2026-10-30', '2026-10-31', '2026-10-31'];
    for (let i = 0; i < ax1001Pending.rows.length; i++) {
      const pDate = pendingAxDates[i % pendingAxDates.length];
      const pTime = `${pDate}T14:00:00.000Z`;
      await client.query(
        'UPDATE inspection_requests SET date = $1, created_at = $2, updated_at = $2 WHERE id = $3',
        [pDate, pTime, ax1001Pending.rows[i].req_id]
      );
    }

    // 2. Distribute TB-2001 requests and reports across September and October
    const tb2001Completed = await client.query(`
      SELECT req.id as req_id, rep.id as rep_id, rep.heat_batch_number 
      FROM inspection_requests req
      JOIN inspection_reports rep ON rep.request_id = req.id
      WHERE req.part_number = 'TB-2001'
      ORDER BY req.created_at ASC
    `);

    // 26 completed reports spread evenly across 9 weeks (Sept 1 to Oct 31)
    const septTbDates = [
      '2026-09-02', '2026-09-04', '2026-09-07', '2026-09-09',
      '2026-09-11', '2026-09-14', '2026-09-16', '2026-09-18',
      '2026-09-21', '2026-09-23', '2026-09-25', '2026-09-28', '2026-09-30'
    ];
    const octTbDates = [
      '2026-10-02', '2026-10-05', '2026-10-07', '2026-10-09',
      '2026-10-12', '2026-10-14', '2026-10-16', '2026-10-19',
      '2026-10-21', '2026-10-23', '2026-10-26', '2026-10-28', '2026-10-30'
    ];
    const tbAllDates = [...septTbDates, ...octTbDates];

    console.log(`\nUpdating ${tb2001Completed.rows.length} TB-2001 completed batches...`);
    for (let i = 0; i < tb2001Completed.rows.length; i++) {
      const row = tb2001Completed.rows[i];
      const targetDate = tbAllDates[i % tbAllDates.length];
      const reqTimestamp = `${targetDate}T08:00:00.000Z`;
      const repTimestamp = `${targetDate}T10:30:00.000Z`;

      await client.query(
        'UPDATE inspection_requests SET date = $1, created_at = $2, updated_at = $2 WHERE id = $3',
        [targetDate, reqTimestamp, row.req_id]
      );
      await client.query(
        'UPDATE inspection_reports SET report_date = $1, created_at = $2, updated_at = $2 WHERE id = $3',
        [targetDate, repTimestamp, row.rep_id]
      );
    }

    // Pending TB-2001 requests
    const tb2001Pending = await client.query(`
      SELECT req.id as req_id
      FROM inspection_requests req
      LEFT JOIN inspection_reports rep ON rep.request_id = req.id
      WHERE req.part_number = 'TB-2001' AND rep.id IS NULL
      ORDER BY req.created_at ASC
    `);
    const pendingTbDates = ['2026-10-28', '2026-10-29', '2026-10-30', '2026-10-31'];
    for (let i = 0; i < tb2001Pending.rows.length; i++) {
      const pDate = pendingTbDates[i % pendingTbDates.length];
      const pTime = `${pDate}T15:00:00.000Z`;
      await client.query(
        'UPDATE inspection_requests SET date = $1, created_at = $2, updated_at = $2 WHERE id = $3',
        [pDate, pTime, tb2001Pending.rows[i].req_id]
      );
    }

    // 3. TB-2002 and AX-1002
    const tb2002Completed = await client.query(`
      SELECT req.id as req_id, rep.id as rep_id 
      FROM inspection_requests req
      JOIN inspection_reports rep ON rep.request_id = req.id
      WHERE req.part_number = 'TB-2002'
    `);
    if (tb2002Completed.rows.length > 0) {
      await client.query(
        'UPDATE inspection_requests SET date = $1, created_at = $2, updated_at = $2 WHERE id = $3',
        ['2026-09-17', '2026-09-17T09:00:00.000Z', tb2002Completed.rows[0].req_id]
      );
      await client.query(
        'UPDATE inspection_reports SET report_date = $1, created_at = $2, updated_at = $2 WHERE id = $3',
        ['2026-09-17', '2026-09-17T11:00:00.000Z', tb2002Completed.rows[0].rep_id]
      );
    }

    // Print summary verification
    console.log('\n--- VERIFICATION OF DATES ACROSS SEPTEMBER & OCTOBER ---');
    const reqsByMonth = await client.query(`
      SELECT 
        TO_CHAR(DATE(date), 'YYYY-MM') as month, 
        count(*) as request_count
      FROM inspection_requests
      GROUP BY month
      ORDER BY month ASC
    `);
    console.table(reqsByMonth.rows);

    const repsByMonth = await client.query(`
      SELECT 
        TO_CHAR(DATE(report_date), 'YYYY-MM') as month, 
        count(*) as report_count
      FROM inspection_reports
      GROUP BY month
      ORDER BY month ASC
    `);
    console.table(repsByMonth.rows);

    console.log('✔ Successfully distributed sample data across September and October.');
  } catch (err) {
    console.error('Error distributing dates:', err);
  } finally {
    await client.end();
  }
}

distributeDates();

