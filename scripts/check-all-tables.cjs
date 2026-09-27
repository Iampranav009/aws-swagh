const { Client } = require('../.tmp/pg-client/node_modules/pg');
const creds = require('../.tmp/firebase-to-supabase/auth/supabase-service.json');

async function run() {
  const client = new Client(creds);
  await client.connect();

  console.log('--- ALL SUB_REFERRALS ---');
  const subs = await client.query('SELECT * FROM public.sub_referrals');
  console.log(subs.rows);

  console.log('--- ALL SBCL_FORM_SUBMISSIONS ---');
  const forms = await client.query('SELECT * FROM public.sbcl_form_submissions');
  console.log(forms.rows);

  console.log('--- ALL SIGNUPS (RECENT) ---');
  const signups = await client.query('SELECT * FROM public.signups ORDER BY created_at DESC LIMIT 10');
  console.log(signups.rows);

  await client.end();
}

run().catch(console.error);
