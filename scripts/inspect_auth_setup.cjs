const { Client } = require('pg');
const creds = require('../.tmp/firebase-to-supabase/auth/supabase-service.json');

async function run() {
  const client = new Client(creds);
  await client.connect();

  const grants = await client.query(`
    SELECT grantee, table_name, privilege_type 
    FROM information_schema.table_privileges 
    WHERE table_schema = 'public' 
      AND table_name IN ('admins', 'sbcl_profiles', 'sub_referrals', 'sbcl_form_submissions', 'archived_leaderboard_signups')
      AND grantee IN ('anon', 'authenticated');
  `);
  console.log('Grants on tables:\n', grants.rows);

  const policies = await client.query(`
    SELECT tablename, policyname, roles, cmd, qual 
    FROM pg_policies 
    WHERE tablename IN ('admins', 'sbcl_profiles', 'sub_referrals');
  `);
  console.log('Policies on tables:\n', policies.rows);

  const adminUsers = await client.query(`SELECT * FROM public.admins;`);
  console.log('Admins in DB:\n', adminUsers.rows);

  await client.end();
}
run().catch(console.error);
