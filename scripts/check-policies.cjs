const { Client } = require('pg');
const creds = require('../.tmp/firebase-to-supabase/auth/supabase-service.json');

async function run() {
  const client = new Client(creds);
  await client.connect();
  const policies = await client.query("SELECT policyname, qual FROM pg_policies WHERE tablename = 'sub_referrals' AND cmd = 'DELETE'");
  console.log('sub_referrals DELETE policy qual:', policies.rows);

  const subCols = await client.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'sbcl_form_submissions'");
  console.log('sbcl_form_submissions cols:', subCols.rows);

  await client.end();
}

run().catch(console.error);
