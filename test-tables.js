const { Client } = require('pg');
require('dotenv').config();

async function check() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  await client.connect();
  console.log('Connected to Supabase PostgreSQL!');

  const tables = ['settings', 'products', 'product_plans', 'customers', 'subscriptions', 'orders', 'refunds', 'campaigns', 'activity_logs'];
  for (const t of tables) {
    try {
      const res = await client.query(`SELECT count(*) FROM "${t}"`);
      console.log(`Table ${t}: ${res.rows[0].count} rows`);
    } catch (e) {
      console.log(`Table ${t}: ERROR - ${e.message}`);
    }
  }

  await client.end();
}

check().catch(console.error);
