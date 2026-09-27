const { Client } = require('pg');
const creds = require('../.tmp/firebase-to-supabase/auth/supabase-service.json');

async function run() {
  const client = new Client(creds);
  await client.connect();

  await client.query(`DELETE FROM public.sbcl_form_submissions WHERE alias IN ('AACHAL04', 'FRESHBUILDER99');`);
  await client.query(`DELETE FROM public.builder_alias_registry WHERE alias = 'FRESHBUILDER99';`);

  const remaining = await client.query(`SELECT count(*) FROM public.sbcl_form_submissions;`);
  console.log('Remaining submissions in DB:', remaining.rows[0].count);

  const regCount = await client.query(`SELECT count(*) FROM public.builder_alias_registry;`);
  console.log('Total ALICE IDs in registry:', regCount.rows[0].count);

  await client.end();
}

run().catch(console.error);
