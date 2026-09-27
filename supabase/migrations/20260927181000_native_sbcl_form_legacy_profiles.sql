create or replace function public.get_public_sbcl_form(p_slug text)
returns table (form_slug text, sbcl_code text, display_name text, referral_code text, source_name text)
language sql
security definer
set search_path = ''
as $$
  select lower(profile.form_slug), profile.sbcl_code, profile.name,
         coalesce(nullif(profile.referral_code, ''), profile.sbcl_code), 'Direct'::text
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

drop policy if exists "sbcl reads own native form submissions" on public.sbcl_form_submissions;
drop policy if exists "admins read all native form submissions" on public.sbcl_form_submissions;
create policy "sbcl or admin reads native form submissions"
on public.sbcl_form_submissions for select to authenticated
using (
  exists (
    select 1 from public.sbcl_profiles
    where sbcl_profiles.user_id = (select auth.uid())
      and sbcl_profiles.sbcl_code = sbcl_form_submissions.sbcl_code
  )
  or exists (
    select 1 from public.admins
    where admins.user_id = (select auth.uid())
  )
);
