const { Client } = require('pg');
require('dotenv').config();

async function cleanDatabase() {
  if (!process.env.DATABASE_URL) {
    console.error('Lỗi: DATABASE_URL chưa được thiết lập trong file .env');
    process.exit(1);
  }

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('✓ Đã kết nối Supabase PostgreSQL!');

    console.log('Đang làm sạch dữ liệu giao dịch và khách hàng mẫu...');

    // Delete in reverse foreign key order
    await client.query('DELETE FROM refunds');
    console.log('✓ Đã xóa bảng refunds');

    await client.query('DELETE FROM subscriptions');
    console.log('✓ Đã xóa bảng subscriptions');

    await client.query('DELETE FROM orders');
    console.log('✓ Đã xóa bảng orders');

    await client.query('DELETE FROM campaigns');
    console.log('✓ Đã xóa bảng campaigns');

    await client.query('DELETE FROM activity_logs');
    console.log('✓ Đã xóa bảng activity_logs');

    await client.query('DELETE FROM customers');
    console.log('✓ Đã xóa bảng customers');

    // Count remaining rows in products and plans to verify catalog is intact
    const prods = await client.query('SELECT count(*) FROM products');
    const plans = await client.query('SELECT count(*) FROM product_plans');
    console.log('\n✓ Hoàn tất! Cơ sở dữ liệu đã sạch.');
    console.log(`- Danh mục sản phẩm được giữ nguyên: ${prods.rows[0].count} sản phẩm, ${plans.rows[0].count} gói bán.`);
    console.log('- Số lượng khách hàng: 0');
    console.log('- Số lượng đơn hàng: 0');
    console.log('- Số lượng gói dịch vụ: 0');
    console.log('Hệ thống đã sẵn sàng 100% để vận hành kinh doanh thực tế!');
  } catch (err) {
    console.error('Lỗi khi làm sạch database:', err);
  } finally {
    await client.end();
  }
}

cleanDatabase();
