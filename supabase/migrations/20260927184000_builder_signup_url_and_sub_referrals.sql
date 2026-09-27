-- Add builder_signup_url to sbcl_profiles if not exists
alter table public.sbcl_profiles
  add column if not exists builder_signup_url text;

-- Update get_public_sbcl_form to return builder_signup_url and auto-resolve any sub-referrer alias
drop function if exists public.get_public_sbcl_form(text);

create or replace function public.get_public_sbcl_form(p_slug text)
returns table (
  form_slug text,
  sbcl_code text,
  display_name text,
  referral_code text,
  source_name text,
  builder_signup_url text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  clean_slug text := lower(regexp_replace(coalesce(p_slug, ''), '[^A-Za-z0-9]', '', 'g'));
  v_default_sbcl record;
  v_user_name text;
begin
  if clean_slug = '' then return; end if;

  -- 1. Check SBCL profiles directly
  return query
  select coalesce(lower(profile.alias_id), lower(profile.form_slug), lower(profile.sbcl_code)) as form_slug,
         profile.sbcl_code,
         profile.name as display_name,
         coalesce(profile.alias_id, profile.referral_code, profile.sbcl_code) as referral_code,
         profile.name as source_name,
         profile.builder_signup_url
  from public.sbcl_profiles as profile
  where lower(regexp_replace(coalesce(profile.form_slug, ''), '[^A-Za-z0-9]', '', 'g')) = clean_slug
     or lower(regexp_replace(coalesce(profile.alias_id, ''), '[^A-Za-z0-9]', '', 'g')) = clean_slug
     or lower(regexp_replace(coalesce(profile.sbcl_code, ''), '[^A-Za-z0-9]', '', 'g')) = clean_slug
  limit 1;

  if found then return; end if;

  -- 2. Check registered sub_referrals
  return query
  select lower(sub.code) as form_slug,
         sub.sbcl_code,
         profile.name as display_name,
         sub.code as referral_code,
         sub.name as source_name,
         profile.builder_signup_url
  from public.sub_referrals as sub
  join public.sbcl_profiles as profile on profile.sbcl_code = sub.sbcl_code
  where lower(regexp_replace(coalesce(sub.code, ''), '[^A-Za-z0-9]', '', 'g')) = clean_slug
     or lower(regexp_replace(coalesce(sub.code, ''), '^' || lower(sub.sbcl_code), '')) = clean_slug
  limit 1;

  if found then return; end if;

  -- 3. If not in sub_referrals yet, find the active default SBCL (e.g. AWS)
  select p.sbcl_code, p.name, p.builder_signup_url into v_default_sbcl
  from public.sbcl_profiles as p
  order by (p.sbcl_code = 'AWS') desc, p.created_at asc
  limit 1;

  if v_default_sbcl.sbcl_code is null then return; end if;

  -- Try to find the person's name from auth.users or signups
  select coalesce(
    (select coalesce(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name') from auth.users u where lower(regexp_replace(coalesce(u.email, ''), '[^A-Za-z0-9]', '', 'g')) like '%' || clean_slug || '%' limit 1),
    (select s.name from public.signups s where lower(s.alias) = clean_slug limit 1),
    upper(clean_slug)
  ) into v_user_name;

  -- Auto-register this alias in sub_referrals under the default SBCL so future lookups are instant
  insert into public.sub_referrals (code, name, sbcl_code, link, created_at)
  values (
    upper(clean_slug),
    coalesce(v_user_name, upper(clean_slug)),
    v_default_sbcl.sbcl_code,
    '/f/' || clean_slug,
    now()
  )
  on conflict (code) do update
  set name = coalesce(excluded.name, public.sub_referrals.name);

  -- Return the form details for this sub-referrer
  return query
  select clean_slug as form_slug,
         v_default_sbcl.sbcl_code,
         v_default_sbcl.name as display_name,
         upper(clean_slug) as referral_code,
         coalesce(v_user_name, upper(clean_slug)) as source_name,
         v_default_sbcl.builder_signup_url;

  return;
end;
$$;

revoke all on function public.get_public_sbcl_form(text) from public;
grant execute on function public.get_public_sbcl_form(text) to anon, authenticated;

-- Update update_my_sbcl_profile to handle builder_signup_url
create or replace function public.update_my_sbcl_profile(
  p_name text,
  p_alias_id text,
  p_builder_signup_url text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := auth.uid();
  profile public.sbcl_profiles%rowtype;
  clean_alias text := upper(regexp_replace(coalesce(p_alias_id, ''), '[^A-Za-z0-9]', '', 'g'));
  new_slug text := lower(clean_alias);
  clean_url text := nullif(trim(coalesce(p_builder_signup_url, '')), '');
begin
  if caller_id is null then raise exception 'Sign in to update your profile.'; end if;
  if char_length(trim(coalesce(p_name, ''))) < 2 then raise exception 'Enter your full name.'; end if;
  if char_length(clean_alias) < 2 or char_length(clean_alias) > 32 then raise exception 'Enter a valid AWS Alias ID.'; end if;

  select * into profile from public.sbcl_profiles where user_id = caller_id for update;
  if profile.user_id is null then raise exception 'No SBCL profile exists for this account.'; end if;
  if exists (select 1 from public.sbcl_profiles where upper(alias_id) = clean_alias and user_id <> caller_id) then raise exception 'This AWS Alias ID is already assigned.'; end if;

  update public.sbcl_profiles
  set name = trim(p_name),
      alias_id = clean_alias,
      form_slug = new_slug,
      referral_code = clean_alias,
      builder_signup_url = clean_url,
      updated_at = now()
  where user_id = caller_id;

  return jsonb_build_object(
    'name', trim(p_name),
    'alias_id', clean_alias,
    'referral_code', clean_alias,
    'form_slug', new_slug,
    'sbcl_code', profile.sbcl_code,
    'builder_signup_url', clean_url
  );
end;
$$;

revoke all on function public.update_my_sbcl_profile(text, text, text) from public, anon;
grant execute on function public.update_my_sbcl_profile(text, text, text) to authenticated;

-- Function for a sub-referrer to register under an SBCL
create or replace function public.register_sub_referral(
  p_sbcl_code text,
  p_name text,
  p_alias text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := auth.uid();
  clean_sbcl text := upper(regexp_replace(coalesce(p_sbcl_code, ''), '[^A-Za-z0-9]', '', 'g'));
  clean_alias text := upper(regexp_replace(coalesce(p_alias, ''), '[^A-Za-z0-9]', '', 'g'));
  clean_name text := trim(coalesce(p_name, ''));
  sbcl_rec record;
begin
  if caller_id is null then raise exception 'Authentication required.'; end if;
  if char_length(clean_sbcl) < 2 then raise exception 'Invalid SBCL code.'; end if;
  if char_length(clean_name) < 2 then raise exception 'Enter your full name.'; end if;
  if char_length(clean_alias) < 2 or char_length(clean_alias) > 32 then raise exception 'Enter a valid AWS Alias ID.'; end if;

  select * into sbcl_rec from public.sbcl_profiles where upper(sbcl_code) = clean_sbcl limit 1;
  if sbcl_rec.sbcl_code is null then raise exception 'SBCL not found.'; end if;

  insert into public.sub_referrals (code, name, sbcl_code, link, created_by, created_at)
  values (
    clean_alias,
    clean_name,
    sbcl_rec.sbcl_code,
    '/f/' || lower(clean_alias),
    caller_id,
    now()
  )
  on conflict (code) do update
  set name = excluded.name,
      sbcl_code = excluded.sbcl_code,
      link = excluded.link,
      created_by = coalesce(public.sub_referrals.created_by, excluded.created_by);

  return jsonb_build_object(
    'code', clean_alias,
    'name', clean_name,
    'sbcl_code', sbcl_rec.sbcl_code,
    'sbcl_name', sbcl_rec.name,
    'builder_signup_url', sbcl_rec.builder_signup_url,
    'form_link', '/f/' || lower(clean_alias)
  );
end;
$$;

revoke all on function public.register_sub_referral(text, text, text) from public;
grant execute on function public.register_sub_referral(text, text, text) to authenticated;

-- Ensure RLS on sub_referrals allows SBCL lead to read all sub_referrals under their SBCL
drop policy if exists "sub referrals read by owner or sbcl or admin" on public.sub_referrals;
drop policy if exists "sub referrals read by owner or admin" on public.sub_referrals;

create policy "sub referrals read by owner or sbcl or admin" on public.sub_referrals
for select to authenticated
using (
  created_by = (select auth.uid())
  or exists (
    select 1 from public.sbcl_profiles
    where sbcl_profiles.user_id = (select auth.uid())
      and sbcl_profiles.sbcl_code = sub_referrals.sbcl_code
  )
  or exists (
    select 1 from public.admins
    where admins.user_id = (select auth.uid())
  )
);
