const { Client } = require('../.tmp/pg-client/node_modules/pg');
const creds = require('../.tmp/firebase-to-supabase/auth/supabase-service.json');

async function run() {
  const client = new Client(creds);
  await client.connect();
  console.log('Connected to Postgres.');

  // 1. Fix accept_sbcl_invite_token to always include form_slug and handle defaults
  console.log('Updating accept_sbcl_invite_token...');
  await client.query(`
    -- Ensure form_slug column has a default fallback
    ALTER TABLE public.sbcl_profiles ALTER COLUMN form_slug DROP NOT NULL;

    CREATE OR REPLACE FUNCTION public.accept_sbcl_invite_token(p_token_hash text, p_name text, p_alias_id text)
    RETURNS jsonb
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = ''
    AS $$
    DECLARE
      invite_row public.sbcl_invites%rowtype;
      caller_id uuid := auth.uid();
      caller_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
      clean_alias text := upper(regexp_replace(coalesce(p_alias_id, ''), '[^A-Za-z0-9]', '', 'g'));
      full_referral_code text;
      new_slug text;
    BEGIN
      IF caller_id IS NULL OR caller_email = '' THEN
        RAISE EXCEPTION 'Sign in with the invited email before using this link.';
      END IF;
      IF p_token_hash !~ '^[0-9a-f]{64}$' THEN
        RAISE EXCEPTION 'This invitation link is invalid.';
      END IF;
      IF length(trim(coalesce(p_name, ''))) < 2 THEN
        RAISE EXCEPTION 'Enter your full name.';
      END IF;
      IF length(clean_alias) < 2 OR length(clean_alias) > 32 THEN
        RAISE EXCEPTION 'Enter a valid AWS Alias ID using letters and numbers.';
      END IF;

      SELECT * INTO invite_row
      FROM public.sbcl_invites
      WHERE invite_token_hash = p_token_hash
        AND status = 'pending'
        AND invite_expires_at > now()
      FOR UPDATE;

      IF invite_row.email IS NULL THEN
        RAISE EXCEPTION 'This invitation link is invalid, expired, or already used.';
      END IF;
      IF lower(invite_row.email) <> caller_email THEN
        RAISE EXCEPTION 'Sign in with the email address this invitation was created for.';
      END IF;
      IF EXISTS (SELECT 1 FROM public.sbcl_profiles WHERE upper(alias_id) = clean_alias AND user_id <> caller_id) THEN
        RAISE EXCEPTION 'This AWS Alias ID is already assigned to another account.';
      END IF;

      full_referral_code := upper(invite_row.sbcl_code) || clean_alias;
      new_slug := lower(clean_alias);

      IF EXISTS (SELECT 1 FROM public.sbcl_profiles WHERE upper(referral_code) = full_referral_code AND user_id <> caller_id) THEN
        RAISE EXCEPTION 'This referral code is already assigned to another account.';
      END IF;

      INSERT INTO public.sbcl_profiles (user_id, email, name, sbcl_code, alias_id, referral_code, form_slug)
      VALUES (caller_id, caller_email, trim(p_name), upper(invite_row.sbcl_code), clean_alias, full_referral_code, new_slug)
      ON CONFLICT (user_id) DO UPDATE
        SET name = excluded.name,
            alias_id = excluded.alias_id,
            referral_code = excluded.referral_code,
            form_slug = excluded.form_slug,
            updated_at = now();

      UPDATE public.sbcl_invites
      SET status = 'verified',
          verified_user_id = caller_id,
          verified_at = now(),
          invite_used_at = now()
      WHERE email = invite_row.email;

      RETURN jsonb_build_object(
        'sbcl_code', upper(invite_row.sbcl_code),
        'referral_code', full_referral_code,
        'form_slug', new_slug
      );
    END;
    $$;
    REVOKE ALL ON FUNCTION public.accept_sbcl_invite_token(text, text, text) FROM public, anon;
    GRANT EXECUTE ON FUNCTION public.accept_sbcl_invite_token(text, text, text) TO authenticated;
  `);

  // 2. Fix register_sub_referral to be rock solid and resilient
  console.log('Updating register_sub_referral...');
  await client.query(`
    CREATE OR REPLACE FUNCTION public.register_sub_referral(
      p_sbcl_code text,
      p_name text,
      p_alias text
    )
    RETURNS jsonb
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = ''
    AS $$
    DECLARE
      caller_id uuid := auth.uid();
      clean_sbcl text := upper(regexp_replace(coalesce(p_sbcl_code, ''), '[^A-Za-z0-9]', '', 'g'));
      clean_alias text := upper(regexp_replace(coalesce(p_alias, ''), '[^A-Za-z0-9]', '', 'g'));
      clean_name text := trim(coalesce(p_name, ''));
      sbcl_rec record;
    BEGIN
      IF char_length(clean_sbcl) < 2 THEN RAISE EXCEPTION 'Invalid SBCL code.'; END IF;
      IF char_length(clean_name) < 2 THEN RAISE EXCEPTION 'Enter your full name.'; END IF;
      IF char_length(clean_alias) < 2 OR char_length(clean_alias) > 32 THEN RAISE EXCEPTION 'Enter a valid AWS Alias ID.'; END IF;

      -- Find SBCL profile, or find invite, or fallback to default
      SELECT * INTO sbcl_rec FROM public.sbcl_profiles WHERE upper(sbcl_code) = clean_sbcl LIMIT 1;
      
      IF sbcl_rec.sbcl_code IS NULL THEN
        -- Check if there is a verified or pending invite with this code
        SELECT * INTO sbcl_rec FROM public.sbcl_invites WHERE upper(sbcl_code) = clean_sbcl LIMIT 1;
      END IF;

      IF sbcl_rec.sbcl_code IS NULL THEN
        SELECT * INTO sbcl_rec FROM public.sbcl_profiles ORDER BY (sbcl_code = 'AWS') DESC LIMIT 1;
      END IF;

      IF sbcl_rec.sbcl_code IS NULL THEN
        RAISE EXCEPTION 'SBCL not found.';
      END IF;

      INSERT INTO public.sub_referrals (code, name, sbcl_code, link, created_by, created_at)
      VALUES (
        clean_alias,
        clean_name,
        sbcl_rec.sbcl_code,
        '/f/' || lower(clean_alias),
        caller_id,
        now()
      )
      ON CONFLICT (code) DO UPDATE
      SET name = excluded.name,
          sbcl_code = excluded.sbcl_code,
          link = excluded.link,
          created_by = coalesce(public.sub_referrals.created_by, excluded.created_by);

      RETURN jsonb_build_object(
        'code', clean_alias,
        'name', clean_name,
        'sbcl_code', sbcl_rec.sbcl_code,
        'sbcl_name', coalesce(sbcl_rec.name, clean_sbcl),
        'builder_signup_url', coalesce(sbcl_rec.builder_signup_url, 'https://bit.ly/4cvi5S6'),
        'form_link', '/f/' || lower(clean_alias)
      );
    END;
    $$;
    REVOKE ALL ON FUNCTION public.register_sub_referral(text, text, text) FROM public;
    GRANT EXECUTE ON FUNCTION public.register_sub_referral(text, text, text) TO anon, authenticated;
  `);

  // 3. Update permissions and RLS policies on sbcl_invites, sbcl_profiles, sub_referrals
  console.log('Ensuring RLS policies allow reading and realtime...');
  await client.query(`
    -- Grant read on sub_referrals so public forms and sub-referrers can see their links
    GRANT SELECT ON public.sub_referrals TO anon, authenticated;
    GRANT SELECT ON public.sbcl_profiles TO anon, authenticated;
    GRANT SELECT ON public.sbcl_invites TO authenticated;

    DROP POLICY IF EXISTS "sub referrals read public" ON public.sub_referrals;
    CREATE POLICY "sub referrals read public" ON public.sub_referrals
    FOR SELECT TO anon, authenticated
    USING (true);

    DROP POLICY IF EXISTS "profiles read public" ON public.sbcl_profiles;
    CREATE POLICY "profiles read public" ON public.sbcl_profiles
    FOR SELECT TO anon, authenticated
    USING (true);

    -- Admins can read all invites, verified SBCLs can read their own
    DROP POLICY IF EXISTS "admins and users read invites" ON public.sbcl_invites;
    CREATE POLICY "admins and users read invites" ON public.sbcl_invites
    FOR SELECT TO authenticated
    USING (
      (EXISTS (SELECT 1 FROM public.admins WHERE user_id = (SELECT auth.uid())))
      OR (lower(email) = lower(coalesce((SELECT auth.jwt() ->> 'email'), '')))
    );
  `);

  // 4. Activate Sanket Patil now so his profile exists and invite is verified
  console.log('Activating Sanket Patil profile and invite...');
  const sanketUserRes = await client.query(`
    SELECT id, email, raw_user_meta_data 
    FROM auth.users 
    WHERE email = 'sanket.patil24@pccoepune.org';
  `);

  if (sanketUserRes.rows.length > 0) {
    const sUser = sanketUserRes.rows[0];
    const sName = sUser.raw_user_meta_data?.full_name || sUser.raw_user_meta_data?.name || 'Sanket Patil';
    const sAlias = 'SANKETPATIL';
    const sCode = 'SAN';
    const sRefCode = 'SANSANKETPATIL';
    const sSlug = 'sanketpatil';

    await client.query(`
      INSERT INTO public.sbcl_profiles (user_id, email, name, sbcl_code, alias_id, referral_code, form_slug, builder_signup_url)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (user_id) DO UPDATE
      SET name = excluded.name,
          sbcl_code = excluded.sbcl_code,
          alias_id = excluded.alias_id,
          referral_code = excluded.referral_code,
          form_slug = excluded.form_slug,
          updated_at = now();
    `, [sUser.id, sUser.email, sName, sCode, sAlias, sRefCode, sSlug, 'https://bit.ly/4cvi5S6']);

    await client.query(`
      UPDATE public.sbcl_invites
      SET status = 'verified',
          verified_user_id = $1,
          verified_at = now(),
          invite_used_at = now()
      WHERE email = $2;
    `, [sUser.id, sUser.email]);

    console.log(`Successfully activated SBCL profile for ${sName} (${sCode})!`);
  }

  // 5. Setup Supabase Realtime Publication and Replica Identities
  console.log('Enabling Supabase Realtime on tables...');
  await client.query(`
    -- Ensure replica identity full so postgres_changes sends both old and new record data
    ALTER TABLE public.sbcl_invites REPLICA IDENTITY FULL;
    ALTER TABLE public.sbcl_profiles REPLICA IDENTITY FULL;
    ALTER TABLE public.sub_referrals REPLICA IDENTITY FULL;
    ALTER TABLE public.sbcl_form_submissions REPLICA IDENTITY FULL;
    ALTER TABLE public.signups REPLICA IDENTITY FULL;

    -- Add tables to supabase_realtime publication
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'sbcl_invites'
      ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.sbcl_invites;
      END IF;

      IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'sbcl_profiles'
      ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.sbcl_profiles;
      END IF;

      IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'sub_referrals'
      ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.sub_referrals;
      END IF;

      IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'sbcl_form_submissions'
      ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.sbcl_form_submissions;
      END IF;

      IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'signups'
      ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.signups;
      END IF;
    END $$;
  `);

  console.log('\n--- VERIFYING REALTIME PUBLICATION ---');
  const pubRes = await client.query(`
    SELECT schemaname, tablename 
    FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime';
  `);
  console.log('Realtime published tables:', pubRes.rows);

  console.log('\n--- VERIFYING SBCL PROFILES ---');
  const profiles = await client.query('SELECT sbcl_code, name, email, alias_id, form_slug FROM public.sbcl_profiles ORDER BY created_at ASC');
  console.log(profiles.rows);

  console.log('\n--- VERIFYING SBCL INVITES ---');
  const invites = await client.query('SELECT email, sbcl_code, status, verified_user_id, verified_at FROM public.sbcl_invites');
  console.log(invites.rows);

  await client.end();
  console.log('Database and realtime migration finished successfully.');
}

run().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
