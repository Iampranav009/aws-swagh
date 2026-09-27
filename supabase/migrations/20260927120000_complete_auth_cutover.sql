create unique index if not exists sbcl_invites_active_code_uidx
on public.sbcl_invites (upper(sbcl_code))
where status <> 'revoked';

drop policy if exists "invited users read own invite" on public.sbcl_invites;
create policy "invited users read own invite" on public.sbcl_invites
for select to authenticated
using (lower(email) = lower(coalesce((select auth.jwt() ->> 'email'), '')));

drop policy if exists "invited users accept own invite" on public.sbcl_invites;
create policy "invited users accept own invite" on public.sbcl_invites
for update to authenticated
using (
  status = 'pending'
  and lower(email) = lower(coalesce((select auth.jwt() ->> 'email'), ''))
)
with check (
  status = 'verified'
  and verified_user_id = (select auth.uid())
  and lower(email) = lower(coalesce((select auth.jwt() ->> 'email'), ''))
);

drop policy if exists "invited users create own profile" on public.sbcl_profiles;
create policy "invited users create own profile" on public.sbcl_profiles
for insert to authenticated
with check (
  user_id = (select auth.uid())
  and lower(email) = lower(coalesce((select auth.jwt() ->> 'email'), ''))
  and exists (
    select 1 from public.sbcl_invites
    where lower(sbcl_invites.email) = lower(coalesce((select auth.jwt() ->> 'email'), ''))
      and upper(sbcl_invites.sbcl_code) = upper(sbcl_profiles.sbcl_code)
      and sbcl_invites.status = 'pending'
  )
);

drop policy if exists "sbcl users read attributed signups" on public.signups;
create policy "sbcl users read attributed signups" on public.signups
for select to authenticated
using (exists (
  select 1 from public.sbcl_profiles
  where sbcl_profiles.user_id = (select auth.uid())
    and upper(signups.referral_code) like upper(sbcl_profiles.sbcl_code) || '%'
));

create or replace function public.accept_sbcl_invite(p_name text)
returns text
language plpgsql
security invoker
set search_path = ''
as $$
declare
  invite_row public.sbcl_invites%rowtype;
  caller_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
begin
  select * into invite_row
  from public.sbcl_invites
  where lower(email) = caller_email and status = 'pending'
  for update;
  if invite_row.email is null then
    raise exception 'No pending SBCL invitation was found for this email address.';
  end if;
  insert into public.sbcl_profiles (user_id, email, name, sbcl_code)
  values (auth.uid(), caller_email, trim(p_name), invite_row.sbcl_code);
  update public.sbcl_invites
  set status = 'verified', verified_user_id = auth.uid(), verified_at = now()
  where email = invite_row.email;
  return invite_row.sbcl_code;
end;
$$;
revoke all on function public.accept_sbcl_invite(text) from public, anon;
grant execute on function public.accept_sbcl_invite(text) to authenticated;
