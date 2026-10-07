const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function initDatabase() {
  console.log('🔄 Đang kết nối tới Supabase PostgreSQL...');
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('✅ Đã kết nối thành công tới database Supabase!');

    const schemaPath = path.join(__dirname, 'supabase', 'schema.sql');
    console.log(`📖 Đang đọc file schema từ: ${schemaPath}`);
    const sql = fs.readFileSync(schemaPath, 'utf8');

    console.log('🚀 Đang thực thi khởi tạo bảng và chính sách bảo mật (schema.sql)...');
    await client.query(sql);
    console.log('✅ Đã khởi tạo cấu trúc bảng thành công!');

    // Kiểm tra danh sách bảng đã tạo trong schema public
    const tablesRes = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);

    console.log('\n📊 Danh sách các bảng đã tạo thành công trong Supabase:');
    for (const row of tablesRes.rows) {
      const countRes = await client.query(`SELECT COUNT(*) FROM public."${row.table_name}";`);
      console.log(`  - 📋 public.${row.table_name.padEnd(20)} (${countRes.rows[0].count} dòng dữ liệu)`);
    }

    await client.end();
    console.log('\n🎉 Hoàn thành khởi tạo cơ sở dữ liệu Supabase!');
  } catch (err) {
    console.error('❌ Lỗi khi khởi tạo database:', err);
    try { await client.end(); } catch (_) {}
    process.exit(1);
  }
}

initDatabase();
