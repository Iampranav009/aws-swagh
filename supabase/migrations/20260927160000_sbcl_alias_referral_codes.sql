alter table public.sbcl_profiles
  add column if not exists alias_id text,
  add column if not exists referral_code text;

create unique index if not exists sbcl_profiles_alias_id_uidx
  on public.sbcl_profiles (upper(alias_id))
  where alias_id is not null;
create unique index if not exists sbcl_profiles_referral_code_uidx
  on public.sbcl_profiles (upper(referral_code))
  where referral_code is not null;

drop function if exists public.accept_sbcl_invite_token(text, text);
create function public.accept_sbcl_invite_token(p_token_hash text, p_name text, p_alias_id text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  invite_row public.sbcl_invites%rowtype;
  caller_id uuid := auth.uid();
  caller_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
  clean_alias text := upper(regexp_replace(coalesce(p_alias_id, ''), '[^A-Za-z0-9]', '', 'g'));
  full_referral_code text;
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
  if length(clean_alias) < 2 or length(clean_alias) > 32 then
    raise exception 'Enter a valid AWS Alias ID using letters and numbers.';
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
  if exists (select 1 from public.sbcl_profiles where upper(alias_id) = clean_alias and user_id <> caller_id) then
    raise exception 'This AWS Alias ID is already assigned to another account.';
  end if;

  full_referral_code := upper(invite_row.sbcl_code) || clean_alias;
  if exists (select 1 from public.sbcl_profiles where upper(referral_code) = full_referral_code and user_id <> caller_id) then
    raise exception 'This referral code is already assigned to another account.';
  end if;

  insert into public.sbcl_profiles (user_id, email, name, sbcl_code, alias_id, referral_code)
  values (caller_id, caller_email, trim(p_name), upper(invite_row.sbcl_code), clean_alias, full_referral_code)
  on conflict (user_id) do update
    set name = excluded.name, alias_id = excluded.alias_id,
        referral_code = excluded.referral_code, updated_at = now();

  update public.sbcl_invites
  set status = 'verified', verified_user_id = caller_id,
      verified_at = now(), invite_used_at = now()
  where email = invite_row.email;

  return jsonb_build_object('sbcl_code', upper(invite_row.sbcl_code), 'referral_code', full_referral_code);
end;
$$;
revoke all on function public.accept_sbcl_invite_token(text, text, text) from public, anon;
grant execute on function public.accept_sbcl_invite_token(text, text, text) to authenticated;
