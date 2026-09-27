-- Update get_public_sbcl_form to resolve by alias_id, form_slug, sbcl_code, or sub_referrals
create or replace function public.get_public_sbcl_form(p_slug text)
returns table (form_slug text, sbcl_code text, display_name text, referral_code text, source_name text)
language sql
security definer
set search_path = ''
as $$
  select coalesce(lower(profile.alias_id), lower(profile.form_slug), lower(profile.sbcl_code)) as form_slug,
         profile.sbcl_code,
         profile.name as display_name,
         coalesce(profile.alias_id, profile.referral_code, profile.sbcl_code) as referral_code,
         profile.name as source_name
  from public.sbcl_profiles as profile
  where lower(regexp_replace(coalesce(profile.form_slug, ''), '[^A-Za-z0-9]', '', 'g')) = lower(regexp_replace(coalesce(p_slug, ''), '[^A-Za-z0-9]', '', 'g'))
     or lower(regexp_replace(coalesce(profile.alias_id, ''), '[^A-Za-z0-9]', '', 'g')) = lower(regexp_replace(coalesce(p_slug, ''), '[^A-Za-z0-9]', '', 'g'))
     or lower(regexp_replace(coalesce(profile.sbcl_code, ''), '[^A-Za-z0-9]', '', 'g')) = lower(regexp_replace(coalesce(p_slug, ''), '[^A-Za-z0-9]', '', 'g'))
  union all
  select lower(sub.code) as form_slug,
         sub.sbcl_code,
         profile.name as display_name,
         sub.code as referral_code,
         sub.name as source_name
  from public.sub_referrals as sub
  join public.sbcl_profiles as profile on profile.sbcl_code = sub.sbcl_code
  where lower(regexp_replace(coalesce(sub.code, ''), '[^A-Za-z0-9]', '', 'g')) = lower(regexp_replace(coalesce(p_slug, ''), '[^A-Za-z0-9]', '', 'g'))
  limit 1;
$$;

-- Update submit_sbcl_form to record builder ID on checkbox and default AWS name to full name
create or replace function public.submit_sbcl_form(
  p_slug text,
  p_name text,
  p_email text,
  p_has_builder_id boolean,
  p_alias text,
  p_contact text,
  p_builder_central_id text default null,
  p_name_on_aws text default null,
  p_country text default null
)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  resolved record;
  clean_alias text := upper(regexp_replace(coalesce(p_alias, ''), '[^A-Za-z0-9]', '', 'g'));
  clean_name text := trim(coalesce(p_name, ''));
  builder_id_record text;
  inserted_id bigint;
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

  insert into public.sbcl_form_submissions
    (sbcl_code, referral_code, referred_by_name, name, email, has_builder_id, alias, contact,
     builder_central_id, name_on_aws, country)
  values
    (resolved.sbcl_code, resolved.referral_code, resolved.source_name, clean_name, lower(trim(p_email)),
     coalesce(p_has_builder_id, false), clean_alias,
     regexp_replace(p_contact, '[^0-9+ -]', '', 'g'),
     builder_id_record,
     coalesce(nullif(trim(coalesce(p_name_on_aws, '')), ''), clean_name),
     coalesce(nullif(trim(coalesce(p_country, '')), ''), 'India'))
  returning id into inserted_id;

  return inserted_id;
end;
$$;

-- Update update_my_sbcl_profile to sync form_slug to lowercase alias
create or replace function public.update_my_sbcl_profile(p_name text, p_alias_id text)
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
begin
  if caller_id is null then raise exception 'Sign in to update your profile.'; end if;
  if char_length(trim(coalesce(p_name, ''))) < 2 then raise exception 'Enter your full name.'; end if;
  if char_length(clean_alias) < 2 or char_length(clean_alias) > 32 then raise exception 'Enter a valid AWS Alias ID.'; end if;

  select * into profile from public.sbcl_profiles where user_id = caller_id for update;
  if profile.user_id is null then raise exception 'No SBCL profile exists for this account.'; end if;
  if exists (select 1 from public.sbcl_profiles where upper(alias_id) = clean_alias and user_id <> caller_id) then raise exception 'This AWS Alias ID is already assigned.'; end if;

  update public.sbcl_profiles
  set name = trim(p_name), alias_id = clean_alias, form_slug = new_slug, referral_code = clean_alias, updated_at = now()
  where user_id = caller_id;

  return jsonb_build_object('name', trim(p_name), 'alias_id', clean_alias,
    'referral_code', clean_alias, 'form_slug', new_slug, 'sbcl_code', profile.sbcl_code);
end;
$$;

-- Recreate leaderboard_signups view with referrer_name
drop view if exists public.leaderboard_signups cascade;

create view public.leaderboard_signups
with (security_invoker = false, security_barrier = true)
as
select signup.sheet_row, signup.name, signup.alias, signup.raw_alias,
  case when signup.sheet_row > program.cutoff_sheet_row then signup.referral_code else '' end as referral_code,
  signup.name_on_aws, signup.builder_central_id,
  ''::text as referrer_name
from public.signups as signup
cross join public.referral_programs as program
where program.is_active
union all
select (1000000000 + submission.id::integer) as sheet_row,
  submission.name, submission.alias,
  submission.alias as raw_alias, submission.referral_code, submission.name_on_aws,
  case when submission.has_builder_id then coalesce(submission.builder_central_id, submission.alias, 'YES') else 'NO' end as builder_central_id,
  submission.referred_by_name as referrer_name
from public.sbcl_form_submissions as submission;

revoke all on table public.leaderboard_signups from public, anon, authenticated;
grant select on table public.leaderboard_signups to anon, authenticated;
