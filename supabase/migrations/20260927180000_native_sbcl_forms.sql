alter table public.sbcl_profiles
  add column if not exists form_slug text;

update public.sbcl_profiles
set form_slug = lower(sbcl_code)
where form_slug is null;

alter table public.sbcl_profiles
  alter column form_slug set not null;

create unique index if not exists sbcl_profiles_form_slug_uidx
  on public.sbcl_profiles (lower(form_slug));

create table public.sbcl_form_submissions (
  id bigint generated always as identity primary key,
  sbcl_code text not null check (sbcl_code ~ '^[A-Z0-9]{3}$'),
  referral_code text not null check (referral_code ~ '^[A-Z0-9]{3,35}$'),
  name text not null check (char_length(name) between 2 and 120),
  email text not null check (char_length(email) between 5 and 254),
  has_builder_id boolean not null default true,
  alias text not null check (alias ~ '^[A-Z0-9]{2,64}$'),
  contact text not null check (char_length(contact) between 7 and 24),
  builder_central_id text,
  name_on_aws text,
  country text,
  created_at timestamptz not null default now()
);

create index sbcl_form_submissions_sbcl_created_idx
  on public.sbcl_form_submissions (sbcl_code, created_at desc);
create index sbcl_form_submissions_referral_idx
  on public.sbcl_form_submissions (referral_code);
create index sbcl_form_submissions_alias_idx
  on public.sbcl_form_submissions (alias);

alter table public.sbcl_form_submissions enable row level security;
revoke all on table public.sbcl_form_submissions from public, anon, authenticated;
grant select on table public.sbcl_form_submissions to authenticated;

create policy "sbcl reads own native form submissions"
on public.sbcl_form_submissions for select to authenticated
using (exists (
  select 1 from public.sbcl_profiles
  where sbcl_profiles.user_id = (select auth.uid())
    and sbcl_profiles.sbcl_code = sbcl_form_submissions.sbcl_code
));

create policy "admins read all native form submissions"
on public.sbcl_form_submissions for select to authenticated
using (exists (
  select 1 from public.admins
  where admins.user_id = (select auth.uid())
));

create or replace function public.get_public_sbcl_form(p_slug text)
returns table (form_slug text, sbcl_code text, display_name text, referral_code text, source_name text)
language sql
security definer
set search_path = ''
as $$
  select lower(profile.form_slug), profile.sbcl_code, profile.name,
         profile.referral_code, 'Direct'::text
  from public.sbcl_profiles as profile
  where lower(profile.form_slug) = lower(regexp_replace(coalesce(p_slug, ''), '[^A-Za-z0-9]', '', 'g'))
  union all
  select lower(sub.code), sub.sbcl_code, profile.name, sub.code, sub.name
  from public.sub_referrals as sub
  join public.sbcl_profiles as profile on profile.sbcl_code = sub.sbcl_code
  where lower(sub.code) = lower(regexp_replace(coalesce(p_slug, ''), '[^A-Za-z0-9]', '', 'g'))
  limit 1;
$$;

revoke all on function public.get_public_sbcl_form(text) from public;
grant execute on function public.get_public_sbcl_form(text) to anon, authenticated;

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
  inserted_id bigint;
begin
  select * into resolved from public.get_public_sbcl_form(p_slug);
  if resolved.sbcl_code is null then raise exception 'This signup form is not active.'; end if;
  if char_length(trim(coalesce(p_name, ''))) < 2 then raise exception 'Enter your full name.'; end if;
  if lower(trim(coalesce(p_email, ''))) !~ '^[^@[:space:]]+@[^@[:space:]]+[.][^@[:space:]]+$' then raise exception 'Enter a valid email address.'; end if;
  if char_length(clean_alias) < 2 then raise exception 'Enter a valid AWS Alias ID.'; end if;
  if char_length(regexp_replace(coalesce(p_contact, ''), '[^0-9+]', '', 'g')) < 7 then raise exception 'Enter a valid contact number.'; end if;

  insert into public.sbcl_form_submissions
    (sbcl_code, referral_code, name, email, has_builder_id, alias, contact,
     builder_central_id, name_on_aws, country)
  values
    (resolved.sbcl_code, resolved.referral_code, trim(p_name), lower(trim(p_email)),
     coalesce(p_has_builder_id, false), clean_alias,
     regexp_replace(p_contact, '[^0-9+ -]', '', 'g'),
     nullif(trim(coalesce(p_builder_central_id, '')), ''),
     nullif(trim(coalesce(p_name_on_aws, '')), ''),
     nullif(trim(coalesce(p_country, '')), ''))
  returning id into inserted_id;

  return inserted_id;
end;
$$;

revoke all on function public.submit_sbcl_form(text, text, text, boolean, text, text, text, text, text) from public;
grant execute on function public.submit_sbcl_form(text, text, text, boolean, text, text, text, text, text) to anon, authenticated;

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
  new_referral_code text;
begin
  if caller_id is null then raise exception 'Sign in to update your profile.'; end if;
  if char_length(trim(coalesce(p_name, ''))) < 2 then raise exception 'Enter your full name.'; end if;
  if char_length(clean_alias) < 2 or char_length(clean_alias) > 32 then raise exception 'Enter a valid AWS Alias ID.'; end if;

  select * into profile from public.sbcl_profiles where user_id = caller_id for update;
  if profile.user_id is null then raise exception 'No SBCL profile exists for this account.'; end if;
  new_referral_code := upper(profile.sbcl_code) || clean_alias;
  if exists (select 1 from public.sbcl_profiles where upper(alias_id) = clean_alias and user_id <> caller_id) then raise exception 'This AWS Alias ID is already assigned.'; end if;
  if exists (select 1 from public.sbcl_profiles where upper(referral_code) = new_referral_code and user_id <> caller_id) then raise exception 'This referral code is already assigned.'; end if;

  update public.sbcl_profiles
  set name = trim(p_name), alias_id = clean_alias, referral_code = new_referral_code, updated_at = now()
  where user_id = caller_id;
  return jsonb_build_object('name', trim(p_name), 'alias_id', clean_alias,
    'referral_code', new_referral_code, 'form_slug', profile.form_slug, 'sbcl_code', profile.sbcl_code);
end;
$$;

revoke all on function public.update_my_sbcl_profile(text, text) from public, anon;
grant execute on function public.update_my_sbcl_profile(text, text) to authenticated;

create or replace view public.leaderboard_signups
with (security_invoker = false, security_barrier = true)
as
select signup.sheet_row, signup.name, signup.alias, signup.raw_alias,
  case when signup.sheet_row > program.cutoff_sheet_row then signup.referral_code else '' end as referral_code,
  signup.name_on_aws, signup.builder_central_id
from public.signups as signup
cross join public.referral_programs as program
where program.is_active
union all
select (1000000000 + submission.id::integer), submission.name, submission.alias,
  submission.alias, submission.referral_code, submission.name_on_aws, submission.builder_central_id
from public.sbcl_form_submissions as submission;

revoke all on table public.leaderboard_signups from public, anon, authenticated;
grant select on table public.leaderboard_signups to anon, authenticated;
