const { Client } = require('pg');
const creds = require('../.tmp/firebase-to-supabase/auth/supabase-service.json');

async function run() {
  const client = new Client(creds);
  await client.connect();

  await client.query(`
    CREATE OR REPLACE VIEW public.leaderboard_signups AS
    SELECT signup.sheet_row,
      signup.name,
      signup.alias,
      signup.raw_alias,
      CASE
        WHEN signup.sheet_row > program.cutoff_sheet_row THEN signup.referral_code
        ELSE ''::text
      END AS referral_code,
      signup.name_on_aws,
      signup.builder_central_id,
      ''::text AS referrer_name,
      CASE
        WHEN signup.referral_code IS NOT NULL AND length(TRIM(BOTH FROM signup.referral_code)) >= 3 THEN upper(SUBSTRING(TRIM(BOTH FROM signup.referral_code) FROM 1 FOR 3))
        ELSE NULL::text
      END AS sbcl_code,
      true AS is_valid,
      NULL::text AS flag_reason
    FROM signups signup
    CROSS JOIN referral_programs program
    WHERE program.is_active
    UNION ALL
    SELECT 1000000000 + submission.id::integer AS sheet_row,
      submission.name,
      submission.alias,
      submission.alias AS raw_alias,
      submission.referral_code,
      submission.name_on_aws,
      CASE
        WHEN submission.has_builder_id THEN COALESCE(submission.builder_central_id, submission.alias, 'YES'::text)
        ELSE 'NO'::text
      END AS builder_central_id,
      submission.referred_by_name AS referrer_name,
      upper(submission.sbcl_code) AS sbcl_code,
      COALESCE(submission.is_valid, true) AS is_valid,
      submission.flag_reason
    FROM sbcl_form_submissions submission;
  `);
  console.log('leaderboard_signups view updated successfully!');

  await client.end();
}

run().catch(console.error);
