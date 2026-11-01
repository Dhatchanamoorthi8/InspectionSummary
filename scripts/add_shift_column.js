const { Client } = require('../backend/node_modules/pg');

async function migrate() {
  const client = new Client({
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: 'root',
    database: 'heat_treatment_inspection',
  });

  try {
    await client.connect();
    console.log('Connected to PostgreSQL.');

    // 1. Add shift column to inspection_requests
    await client.query(`
      ALTER TABLE inspection_requests 
      ADD COLUMN IF NOT EXISTS shift VARCHAR(50) DEFAULT 'Shift 1';
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_requests_shift ON inspection_requests(shift);
    `);
    console.log('✔ Added shift column and index to inspection_requests.');

    // 2. Distribute existing batches across Shift 1, Shift 2, Shift 3 for rich demo data
    const reqs = await client.query('SELECT id, created_at FROM inspection_requests ORDER BY created_at ASC');
    const shifts = ['Shift 1', 'Shift 2', 'Shift 3'];
    for (let i = 0; i < reqs.rows.length; i++) {
      const s = shifts[i % shifts.length];
      await client.query('UPDATE inspection_requests SET shift = $1 WHERE id = $2', [s, reqs.rows[i].id]);
    }
    console.log(`✔ Assigned shifts across ${reqs.rows.length} existing requests.`);

    // 3. Verify column and shift counts
    const counts = await client.query('SELECT shift, count(*) as count FROM inspection_requests GROUP BY shift ORDER BY shift');
    console.table(counts.rows);

  } catch (err) {
    console.error('Migration error:', err);
  } finally {
    await client.end();
  }
}

migrate();

