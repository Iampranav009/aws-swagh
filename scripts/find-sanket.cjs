const { Client } = require('../.tmp/pg-client/node_modules/pg');
const creds = require('../.tmp/firebase-to-supabase/auth/supabase-service.json');

async function run() {
  const client = new Client(creds);
  await client.connect();

  console.log('--- Searching for Sanket across tables ---');
  const subs = await client.query("SELECT * FROM public.sub_referrals WHERE name ILIKE '%sanket%' OR code ILIKE '%san%'");
  console.log('Sub-referrals:', subs.rows);

  const reg = await client.query("SELECT * FROM public.builder_alias_registry WHERE name ILIKE '%sanket%' OR alias ILIKE '%san%'");
  console.log('Registry:', reg.rows);

  const forms = await client.query("SELECT * FROM public.sbcl_form_submissions WHERE name ILIKE '%sanket%' OR alias ILIKE '%san%'");
  console.log('Form submissions:', forms.rows);

  await client.end();
}

run().catch(console.error);
