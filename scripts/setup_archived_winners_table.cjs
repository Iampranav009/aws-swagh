const { Client } = require('pg');
const creds = require('../.tmp/firebase-to-supabase/auth/supabase-service.json');
const fs = require('fs');

async function run() {
  const client = new Client(creds);
  await client.connect();

  console.log('--- Setting up archived_leaderboard_signups table in Supabase ---');

  // Drop view if exists
  await client.query(`DROP VIEW IF EXISTS public.archived_leaderboard_signups CASCADE;`);

  // Create table
  await client.query(`
    CREATE TABLE IF NOT EXISTS public.archived_leaderboard_signups (
      id bigint generated always as identity primary key,
      program_slug text not null default 'original-referral-program',
      sheet_row integer,
      name text,
      alias text not null,
      raw_alias text,
      referral_code text,
      name_on_aws text,
      builder_central_id text,
      created_at timestamptz default now()
    );
  `);

  await client.query(`
    ALTER TABLE public.archived_leaderboard_signups ENABLE ROW LEVEL SECURITY;
    GRANT SELECT ON public.archived_leaderboard_signups TO anon, authenticated;
    DROP POLICY IF EXISTS "Allow public read on archived_leaderboard_signups" ON public.archived_leaderboard_signups;
    CREATE POLICY "Allow public read on archived_leaderboard_signups" 
      ON public.archived_leaderboard_signups FOR SELECT USING (true);
  `);

  // Read the 1145 rows
  const data = JSON.parse(fs.readFileSync('src/data/archived_leaderboard.json', 'utf8'));
  console.log(`Inserting ${data.length} rows into archived_leaderboard_signups...`);

  await client.query(`TRUNCATE TABLE public.archived_leaderboard_signups;`);

  const BATCH_SIZE = 100;
  for (let i = 0; i < data.length; i += BATCH_SIZE) {
    const batch = data.slice(i, i + BATCH_SIZE);
    const values = [];
    const placeholders = [];
    let p = 1;
    for (const row of batch) {
      placeholders.push(`($${p++}, $${p++}, $${p++}, $${p++}, $${p++}, $${p++}, $${p++}, $${p++})`);
      values.push(
        'original-referral-program',
        row.sheetRow || null,
        row.name || '',
        row.alias || '',
        row.rawAlias || '',
        row.referralCode || '',
        row.nameOnAws || '',
        row.builderCentralId || ''
      );
    }

    const query = `
      INSERT INTO public.archived_leaderboard_signups (
        program_slug, sheet_row, name, alias, raw_alias, referral_code, name_on_aws, builder_central_id
      ) VALUES ${placeholders.join(', ')};
    `;
    await client.query(query, values);
  }

  const count = await client.query(`SELECT count(*) FROM public.archived_leaderboard_signups;`);
  console.log(`Successfully inserted! Total rows in archived_leaderboard_signups: ${count.rows[0].count}`);

  await client.end();
}

run().catch(console.error);
