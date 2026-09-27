alter table public.sbcl_form_submissions
  add column if not exists referred_by_name text;

update public.sbcl_form_submissions as submission
set referred_by_name = coalesce(
  (
    select sub.name
    from public.sub_referrals as sub
    where upper(sub.code) = upper(submission.referral_code)
    limit 1
  ),
  (
    select profile.name
    from public.sbcl_profiles as profile
    where profile.sbcl_code = submission.sbcl_code
    limit 1
  ),
  'SBCL'
)
where referred_by_name is null;

alter table public.sbcl_form_submissions
  alter column referred_by_name set not null;

create or replace function public.get_public_sbcl_form(p_slug text)
returns table (form_slug text, sbcl_code text, display_name text, referral_code text, source_name text)
language sql
security definer
set search_path = ''
as $$
  select lower(profile.form_slug), profile.sbcl_code, profile.name,
         profile.referral_code, profile.name
  from public.sbcl_profiles as profile
  where lower(profile.form_slug) = lower(regexp_replace(coalesce(p_slug, ''), '[^A-Za-z0-9]', '', 'g'))
  union all
  select lower(sub.code), sub.sbcl_code, profile.name, sub.code, sub.name
  from public.sub_referrals as sub
  join public.sbcl_profiles as profile on profile.sbcl_code = sub.sbcl_code
  where lower(sub.code) = lower(regexp_replace(coalesce(p_slug, ''), '[^A-Za-z0-9]', '', 'g'))
  limit 1;
$$;

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
    (sbcl_code, referral_code, referred_by_name, name, email, has_builder_id, alias, contact,
     builder_central_id, name_on_aws, country)
  values
    (resolved.sbcl_code, resolved.referral_code, resolved.source_name, trim(p_name), lower(trim(p_email)),
     coalesce(p_has_builder_id, false), clean_alias,
     regexp_replace(p_contact, '[^0-9+ -]', '', 'g'),
     nullif(trim(coalesce(p_builder_central_id, '')), ''),
     nullif(trim(coalesce(p_name_on_aws, '')), ''),
     nullif(trim(coalesce(p_country, '')), ''))
  returning id into inserted_id;

  return inserted_id;
end;
$$;

revoke all on function public.get_public_sbcl_form(text) from public;
grant execute on function public.get_public_sbcl_form(text) to anon, authenticated;
revoke all on function public.submit_sbcl_form(text, text, text, boolean, text, text, text, text, text) from public;
grant execute on function public.submit_sbcl_form(text, text, text, boolean, text, text, text, text, text) to anon, authenticated;
