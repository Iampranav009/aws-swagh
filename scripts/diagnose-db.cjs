const { Client } = require('../.tmp/pg-client/node_modules/pg');
const creds = require('../.tmp/firebase-to-supabase/auth/supabase-service.json');

async function run() {
  const client = new Client(creds);
  await client.connect();

  console.log('--- Checking function accept_sbcl_invite_token ---');
  const fnRes = await client.query(`
    SELECT routine_name, routine_definition 
    FROM information_schema.routines 
    WHERE routine_schema = 'public' AND routine_name = 'accept_sbcl_invite_token';
  `);
  console.log('Routines:', fnRes.rows);

  console.log('\n--- Checking columns on sbcl_profiles ---');
  const colsRes = await client.query(`
    SELECT column_name, data_type, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'sbcl_profiles';
  `);
  console.log('sbcl_profiles columns:', colsRes.rows);

  console.log('\n--- Checking columns on sub_referrals ---');
  const subCols = await client.query(`
    SELECT column_name, data_type, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'sub_referrals';
  `);
  console.log('sub_referrals columns:', subCols.rows);

  console.log('\n--- Checking RLS policies on sbcl_invites, sbcl_profiles, sub_referrals ---');
  const polRes = await client.query(`
    SELECT tablename, policyname, permissive, roles, cmd, qual, with_check
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename IN ('sbcl_invites', 'sbcl_profiles', 'sub_referrals', 'sbcl_form_submissions');
  `);
  console.log('Policies:', polRes.rows);

  console.log('\n--- Checking realtime publication tables ---');
  const pubRes = await client.query(`
    SELECT schemaname, tablename 
    FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime';
  `);
  console.log('Realtime tables:', pubRes.rows);

  await client.end();
}

run().catch(console.error);
