const { Pool } = require('pg');
const pool = new Pool({
  connectionString:
    'postgresql://postgres.nayjlelunlexurkcwrst:CvxVPKAZTugOlahtf86mNnL7@aws-0-ap-southeast-2.pooler.supabase.com:6543/postgres?sslmode=require',
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 5000,
  idleTimeoutMillis: 30000
});
pool
  .connect()
  .then((c) => c.query('SELECT 1'))
  .then((r) => {
    console.log('DB OK:', JSON.stringify(r.rows[0]));
    return pool.end();
  })
  .catch((e) => {
    console.log('DB FAIL:', e.code, e.message.split('\n')[0]);
    process.exit(1);
  });
