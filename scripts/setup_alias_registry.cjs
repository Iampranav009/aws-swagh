const fs = require('fs');
const readline = require('readline');
const { Client } = require('pg');
const creds = require('../.tmp/firebase-to-supabase/auth/supabase-service.json');

async function setupAndImport() {
  const client = new Client(creds);
  await client.connect();

  console.log('1. Creating builder_alias_registry table...');
  await client.query(`
    CREATE TABLE IF NOT EXISTS public.builder_alias_registry (
      alias text PRIMARY KEY,
      name text,
      email text,
      raw_alias text,
      source text DEFAULT 'student_mega_sheet',
      first_referred_by text,
      created_at timestamptz DEFAULT now()
    );

    ALTER TABLE public.builder_alias_registry ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Allow public read on builder_alias_registry" ON public.builder_alias_registry;
    CREATE POLICY "Allow public read on builder_alias_registry"
      ON public.builder_alias_registry
      FOR SELECT
      USING (true);

    DROP POLICY IF EXISTS "Allow insert on builder_alias_registry" ON public.builder_alias_registry;
    CREATE POLICY "Allow insert on builder_alias_registry"
      ON public.builder_alias_registry
      FOR INSERT
      WITH CHECK (true);

    ALTER TABLE public.sbcl_form_submissions
      ADD COLUMN IF NOT EXISTS is_valid boolean DEFAULT true,
      ADD COLUMN IF NOT EXISTS flag_reason text;
  `);

  console.log('2. Parsing student_mega_sheet.csv...');
  const filePath = './AWS club JDID name folder/student_mega_sheet.csv';
  const fileStream = fs.createReadStream(filePath);
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  let header = null;
  const aliasMap = new Map();

  for await (const line of rl) {
    if (!line.trim()) continue;
    if (!header) {
      header = line.split(',');
      continue;
    }

    const cells = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        cells.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    cells.push(current.trim());

    const name = cells[0] || '';
    const email = cells[1] || '';
    const aliasCol1 = (cells[4] || '').replace(/^"|"$/g, '').trim();
    const aliasCol2 = (cells[12] || '').replace(/^"|"$/g, '').trim();
    const candidateAliases = [aliasCol1, aliasCol2].filter(Boolean);

    for (const a of candidateAliases) {
      const clean = a.toUpperCase().replace(/[^A-Z0-9]/g, '');
      if (clean && clean.length >= 2) {
        const existing = aliasMap.get(clean);
        if (!existing) {
          aliasMap.set(clean, {
            alias: clean,
            name: name || 'Participant',
            email: email || '',
            raw_alias: a,
            source: 'student_mega_sheet',
          });
        } else {
          if ((!existing.name || existing.name === 'Participant') && name) {
            existing.name = name;
          }
          if (!existing.email && email) {
            existing.email = email;
          }
        }
      }
    }
  }

  console.log(`Found ${aliasMap.size} unique ALICE IDs in student_mega_sheet.csv`);

  console.log('3. Inserting unique ALICE IDs into builder_alias_registry in batches...');
  const entries = Array.from(aliasMap.values());
  const BATCH_SIZE = 200;

  for (let i = 0; i < entries.length; i += BATCH_SIZE) {
    const batch = entries.slice(i, i + BATCH_SIZE);
    const valueClauses = [];
    const params = [];

    batch.forEach((item, idx) => {
      const offset = idx * 5;
      valueClauses.push(`($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5})`);
      params.push(item.alias, item.name, item.email || null, item.raw_alias, item.source);
    });

    const query = `
      INSERT INTO public.builder_alias_registry (alias, name, email, raw_alias, source)
      VALUES ${valueClauses.join(', ')}
      ON CONFLICT (alias) DO UPDATE
      SET name = EXCLUDED.name,
          email = COALESCE(EXCLUDED.email, builder_alias_registry.email),
          raw_alias = EXCLUDED.raw_alias;
    `;
    await client.query(query, params);
  }

  const countRes = await client.query('SELECT count(*) FROM public.builder_alias_registry');
  console.log(`Total records in builder_alias_registry: ${countRes.rows[0].count}`);

  console.log('4. Updating submit_sbcl_form function with alias verification and auto-registration...');
  await client.query(`
    CREATE OR REPLACE FUNCTION public.submit_sbcl_form(
      p_slug text,
      p_name text,
      p_email text,
      p_has_builder_id boolean,
      p_alias text,
      p_contact text,
      p_builder_central_id text DEFAULT NULL::text,
      p_name_on_aws text DEFAULT NULL::text,
      p_country text DEFAULT NULL::text
    )
    RETURNS bigint
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path TO ''
    AS $function$
    declare
      resolved record;
      clean_alias text := upper(regexp_replace(coalesce(p_alias, ''), '[^A-Za-z0-9]', '', 'g'));
      clean_name text := trim(coalesce(p_name, ''));
      builder_id_record text;
      inserted_id bigint;
      is_valid_submission boolean := true;
      submission_flag_reason text := null;
      existing_in_registry boolean := false;
      existing_in_submissions boolean := false;
    begin
      select * into resolved from public.get_public_sbcl_form(p_slug);
      if resolved.sbcl_code is null then raise exception 'This signup form is not active.'; end if;
      if char_length(clean_name) < 2 then raise exception 'Enter your full name.'; end if;
      if lower(trim(coalesce(p_email, ''))) !~ '^[^@[:space:]]+@[^@[:space:]]+[.][^@[:space:]]+$' then raise exception 'Enter a valid email address.'; end if;
      if char_length(clean_alias) < 2 then raise exception 'Enter a valid AWS Alias ID.'; end if;
      if char_length(regexp_replace(coalesce(p_contact, ''), '[^0-9+]', '', 'g')) < 7 then raise exception 'Enter a valid contact number.'; end if;

      if coalesce(p_has_builder_id, false) then
        builder_id_record := coalesce(nullif(trim(coalesce(p_builder_central_id, '')), ''), clean_alias, 'YES');
      else
        builder_id_record := nullif(trim(coalesce(p_builder_central_id, '')), '');
      end if;

      -- Check 1: Does this ALICE ID already exist in the historical student_mega_sheet database?
      SELECT EXISTS(
        SELECT 1 FROM public.builder_alias_registry
        WHERE UPPER(alias) = clean_alias AND source = 'student_mega_sheet'
      ) INTO existing_in_registry;

      -- Check 2: Has this ALICE ID already been submitted in the current campaign?
      SELECT EXISTS(
        SELECT 1 FROM public.sbcl_form_submissions
        WHERE UPPER(alias) = clean_alias
      ) INTO existing_in_submissions;

      IF existing_in_registry THEN
        is_valid_submission := false;
        submission_flag_reason := 'Already signed up / pre-existing account in records';
      ELSIF existing_in_submissions THEN
        is_valid_submission := false;
        submission_flag_reason := 'Already signed up / account already claimed';
      ELSE
        is_valid_submission := true;
        submission_flag_reason := null;

        -- Auto-register the fresh and valid ALICE ID into the builder alias database
        INSERT INTO public.builder_alias_registry
          (alias, name, email, raw_alias, source, first_referred_by)
        VALUES
          (clean_alias, clean_name, lower(trim(p_email)), coalesce(p_alias, clean_alias), 'referral_submission', resolved.referral_code)
        ON CONFLICT (alias) DO NOTHING;
      END IF;

      INSERT INTO public.sbcl_form_submissions
        (sbcl_code, referral_code, referred_by_name, name, email, has_builder_id, alias, contact,
         builder_central_id, name_on_aws, country, is_valid, flag_reason)
      VALUES
        (resolved.sbcl_code, resolved.referral_code, resolved.source_name, clean_name, lower(trim(p_email)),
         coalesce(p_has_builder_id, false), clean_alias,
         regexp_replace(p_contact, '[^0-9+ -]', '', 'g'),
         builder_id_record,
         coalesce(nullif(trim(coalesce(p_name_on_aws, '')), ''), clean_name),
         coalesce(nullif(trim(coalesce(p_country, '')), ''), 'India'),
         is_valid_submission,
         submission_flag_reason)
      RETURNING id INTO inserted_id;

      RETURN inserted_id;
    end;
    $function$;
  `);

  console.log('Setup and import completed successfully!');
  await client.end();
}

setupAndImport().catch(console.error);
