alter table public.sbcl_invites
  add column if not exists invite_token_hash text,
  add column if not exists invite_expires_at timestamptz,
  add column if not exists invite_used_at timestamptz;

create unique index if not exists sbcl_invites_token_hash_uidx
  on public.sbcl_invites (invite_token_hash)
  where invite_token_hash is not null;

alter table public.sbcl_invites
  drop constraint if exists sbcl_invites_token_hash_format;
alter table public.sbcl_invites
  add constraint sbcl_invites_token_hash_format
  check (invite_token_hash is null or invite_token_hash ~ '^[0-9a-f]{64}$');

drop policy if exists "invited users read own invite" on public.sbcl_invites;
drop policy if exists "invited users accept own invite" on public.sbcl_invites;
drop policy if exists "invited users create own profile" on public.sbcl_profiles;

drop function if exists public.accept_sbcl_invite(text);

create or replace function public.get_sbcl_invite(p_token_hash text)
returns table (email text, sbcl_code text, expires_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select i.email, i.sbcl_code, i.invite_expires_at
  from public.sbcl_invites as i
  where p_token_hash ~ '^[0-9a-f]{64}$'
    and i.invite_token_hash = p_token_hash
    and i.status = 'pending'
    and i.invite_expires_at > now()
  limit 1
$$;
revoke all on function public.get_sbcl_invite(text) from public;
grant execute on function public.get_sbcl_invite(text) to anon, authenticated;

create or replace function public.accept_sbcl_invite_token(p_token_hash text, p_name text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  invite_row public.sbcl_invites%rowtype;
  caller_id uuid := auth.uid();
  caller_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
begin
  if caller_id is null or caller_email = '' then
    raise exception 'Sign in with the invited email before using this link.';
  end if;
  if p_token_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'This invitation link is invalid.';
  end if;
  if length(trim(coalesce(p_name, ''))) < 2 then
    raise exception 'Enter your full name.';
  end if;

  select * into invite_row
  from public.sbcl_invites
  where invite_token_hash = p_token_hash
    and status = 'pending'
    and invite_expires_at > now()
  for update;

  if invite_row.email is null then
    raise exception 'This invitation link is invalid, expired, or already used.';
  end if;
  if lower(invite_row.email) <> caller_email then
    raise exception 'Sign in with the email address this invitation was created for.';
  end if;

  insert into public.sbcl_profiles (user_id, email, name, sbcl_code)
  values (caller_id, caller_email, trim(p_name), invite_row.sbcl_code)
  on conflict (user_id) do update
    set name = excluded.name, updated_at = now();

  update public.sbcl_invites
  set status = 'verified', verified_user_id = caller_id,
      verified_at = now(), invite_used_at = now()
  where email = invite_row.email;

  return invite_row.sbcl_code;
end;
$$;
revoke all on function public.accept_sbcl_invite_token(text, text) from public, anon;
grant execute on function public.accept_sbcl_invite_token(text, text) to authenticated;
