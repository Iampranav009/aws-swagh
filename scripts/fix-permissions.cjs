const { Client } = require('pg');
const creds = require('../.tmp/firebase-to-supabase/auth/supabase-service.json');

async function run() {
  const client = new Client(creds);
  await client.connect();

  console.log('--- Checking permissions and RLS on sbcl_form_submissions ---');
  const rls = await client.query(`SELECT relname, relrowsecurity FROM pg_class WHERE relname IN ('sbcl_form_submissions', 'builder_alias_registry')`);
  console.log('RLS enabled:', rls.rows);

  const policies = await client.query(`SELECT tablename, policyname, roles, cmd, qual FROM pg_policies WHERE tablename IN ('sbcl_form_submissions', 'builder_alias_registry')`);
  console.log('Policies:', policies.rows);

  // Grant select on sbcl_form_submissions to anon, authenticated
  await client.query('GRANT SELECT ON public.sbcl_form_submissions TO anon, authenticated;');
  console.log('Granted SELECT on sbcl_form_submissions to anon, authenticated.');

  const hasSelectPolicy = policies.rows.some(p => p.tablename === 'sbcl_form_submissions' && (p.cmd === 'SELECT' || p.cmd === 'ALL'));
  if (!hasSelectPolicy) {
    await client.query(`CREATE POLICY "Allow read sbcl_form_submissions" ON public.sbcl_form_submissions FOR SELECT USING (true);`);
    console.log('Created SELECT policy on sbcl_form_submissions.');
  }

  // Also clean up any test submissions
  await client.query(`DELETE FROM public.sbcl_form_submissions WHERE email LIKE '%test%' OR alias = 'AACHAL04'`);
  console.log('Cleaned up test submissions.');

  await client.end();
}
run().catch(console.error);
