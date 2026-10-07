const { Client } = require('pg');
require('dotenv').config();

async function testConnection() {
  console.log('Testing connection to Supabase PostgreSQL...');
  console.log('URL:', process.env.DATABASE_URL.replace(/:[^:@]+@/, ':****@'));
  
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Connection successful!');
    const res = await client.query('SELECT version(), current_database(), current_user;');
    console.log('PostgreSQL Info:', res.rows[0]);
    await client.end();
  } catch (err) {
    console.error('Connection failed:', err.message);
    if (err.code) console.error('Error code:', err.code);
  }
}

testConnection();
