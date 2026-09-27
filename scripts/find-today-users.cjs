const { Client } = require('../.tmp/pg-client/node_modules/pg');
const creds = require('../.tmp/firebase-to-supabase/auth/supabase-service.json');

async function run() {
  const client = new Client(creds);
  await client.connect();

  const users = await client.query(`
    SELECT id, email, raw_user_meta_data, created_at 
    FROM auth.users 
    WHERE created_at >= '2026-09-27T00:00:00Z'
    ORDER BY created_at DESC;
  `);
  console.log('Today auth users:', users.rows);

  await client.end();
}

run().catch(console.error);
