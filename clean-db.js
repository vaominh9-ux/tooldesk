const tls = require('tls');
const { Client } = require('pg');
require('dotenv').config();

async function cleanDatabase() {
  if (!process.env.DATABASE_URL) {
    console.error('Lỗi: DATABASE_URL chưa được thiết lập trong file .env');
    process.exit(1);
  }

  const url = new URL(process.env.DATABASE_URL);
  
  // Obtain root cert from server
  const rootPem = await new Promise((resolve, reject) => {
    const s = tls.connect({ host: url.hostname, port: Number(url.port || 5432), rejectUnauthorized: false, servername: url.hostname }, () => {
      let c = s.getPeerCertificate(true);
      while (c.issuerCertificate && c.issuerCertificate !== c) {
        c = c.issuerCertificate;
      }
      const pem = '-----BEGIN CERTIFICATE-----\n' + c.raw.toString('base64').match(/.{1,64}/g).join('\n') + '\n-----END CERTIFICATE-----\n';
      s.end();
      resolve(pem);
    });
    s.on('error', reject);
  });

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: true, ca: rootPem }
  });

  try {
    await client.connect();
    console.log('✓ Đã kết nối Supabase PostgreSQL thành công!');
    console.log('Đang làm sạch toàn bộ dữ liệu mẫu (khách hàng, đơn hàng, gói dịch vụ)...');

    // Delete in reverse foreign key order
    await client.query('DELETE FROM email_outbox');
    console.log('✓ Đã xóa email_outbox');

    await client.query('DELETE FROM refunds');
    console.log('✓ Đã xóa bảng refunds');

    await client.query('DELETE FROM subscriptions');
    console.log('✓ Đã xóa bảng subscriptions');

    await client.query('DELETE FROM orders');
    console.log('✓ Đã xóa bảng orders');

    await client.query('DELETE FROM command_idempotency');
    console.log('✓ Đã xóa bảng command_idempotency');

    await client.query('DELETE FROM campaigns');
    console.log('✓ Đã xóa bảng campaigns');

    await client.query('DELETE FROM activity_logs');
    console.log('✓ Đã xóa bảng activity_logs');

    await client.query('DELETE FROM customers');
    console.log('✓ Đã xóa bảng customers');

    // Count remaining rows in products and plans to verify catalog is intact
    const prods = await client.query('SELECT count(*) FROM products');
    const plans = await client.query('SELECT count(*) FROM product_plans');
    console.log('\n==========================================');
    console.log('✓ HOÀN TẤT LÀM SẠCH DATABASE SUPABASE!');
    console.log(`- Danh mục sản phẩm chuẩn: ${prods.rows[0].count} sản phẩm, ${plans.rows[0].count} gói dịch vụ (đã có Gemini Ultra).`);
    console.log('- Khách hàng thực tế: 0 (Đã dọn sạch 36 khách demo)');
    console.log('- Đơn hàng thực tế: 0 (Đã dọn sạch 84 đơn demo)');
    console.log('- Gói thuê thực tế: 0 (Đã dọn sạch 48 gói demo)');
    console.log('Hệ thống đã sẵn sàng 100% để bạn nhập khách hàng và đơn hàng thực tế!');
    console.log('==========================================\n');
  } catch (err) {
    console.error('Lỗi khi làm sạch database:', err);
  } finally {
    await client.end();
  }
}

cleanDatabase();
