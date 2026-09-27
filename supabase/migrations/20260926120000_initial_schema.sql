create table public.signups (
  sheet_id text not null,
  sheet_row integer not null check (sheet_row > 1),
  sheet_name text not null default 'Form Responses 1',
  name text not null default '',
  email text,
  alias text not null,
  raw_alias text not null default '',
  contact text,
  referral_code text not null default '',
  name_on_aws text,
  builder_central_id text,
  submitted_at timestamptz,
  synced_at timestamptz not null default now(),
  primary key (sheet_id, sheet_row)
);

create index signups_alias_idx on public.signups (alias);
create index signups_referral_code_idx on public.signups (referral_code);

alter table public.signups enable row level security;
revoke all on table public.signups from anon, authenticated;

create table public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  email text not null unique,
  created_at timestamptz not null default now()
);
alter table public.admins enable row level security;
revoke all on table public.admins from anon, authenticated;
grant select on table public.admins to authenticated;
create policy "admins can read their membership"
on public.admins for select to authenticated
using (user_id = (select auth.uid()));

create policy "admins can read signups"
on public.signups for select to authenticated
using (exists (
  select 1 from public.admins
  where admins.user_id = (select auth.uid())
));
grant select on table public.signups to authenticated;

create view public.leaderboard_signups
with (security_invoker = false, security_barrier = true)
as
select sheet_row, name, alias, raw_alias, referral_code, name_on_aws, builder_central_id
from public.signups;

revoke all on table public.leaderboard_signups from public, anon, authenticated;
grant select on table public.leaderboard_signups to anon, authenticated;

create table public.sbcl_invites (
  email text primary key,
  sbcl_code text not null check (sbcl_code ~ '^[A-Za-z0-9]{3}$'),
  status text not null default 'pending' check (status in ('pending', 'verified', 'revoked')),
  invited_by uuid references auth.users (id),
  verified_user_id uuid references auth.users (id),
  created_at timestamptz not null default now(),
  verified_at timestamptz
);
create index sbcl_invites_code_idx on public.sbcl_invites (sbcl_code);
alter table public.sbcl_invites enable row level security;

create table public.sbcl_profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  email text not null unique,
  name text not null default '',
  sbcl_code text not null check (sbcl_code ~ '^[A-Za-z0-9]{3}$'),
  role text not null default 'sbcl' check (role = 'sbcl'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index sbcl_profiles_code_idx on public.sbcl_profiles (sbcl_code);
alter table public.sbcl_profiles enable row level security;

create table public.sub_referrals (
  code text primary key,
  name text not null,
  sbcl_code text not null check (sbcl_code ~ '^[A-Za-z0-9]{3}$'),
  link text not null,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now()
);
create index sub_referrals_sbcl_code_idx on public.sub_referrals (sbcl_code);
alter table public.sub_referrals enable row level security;

revoke all on table public.sbcl_invites, public.sbcl_profiles, public.sub_referrals from anon, authenticated;
grant select, insert, update, delete on table public.sbcl_invites, public.sbcl_profiles, public.sub_referrals to authenticated;

create policy "admins manage invites" on public.sbcl_invites
for all to authenticated
using (exists (select 1 from public.admins where user_id = (select auth.uid())))
with check (exists (select 1 from public.admins where user_id = (select auth.uid())));

create policy "profiles read self or admin" on public.sbcl_profiles
for select to authenticated
using (user_id = (select auth.uid()) or exists (
  select 1 from public.admins where user_id = (select auth.uid())
));
create policy "admins manage profiles" on public.sbcl_profiles
for all to authenticated
using (exists (select 1 from public.admins where user_id = (select auth.uid())))
with check (exists (select 1 from public.admins where user_id = (select auth.uid())));

create policy "sub referrals read by owner or admin" on public.sub_referrals
for select to authenticated
using (created_by = (select auth.uid()) or exists (
  select 1 from public.admins where user_id = (select auth.uid())
));
create policy "sub referrals insert by owner" on public.sub_referrals
for insert to authenticated
with check (created_by = (select auth.uid()));
create policy "sub referrals delete by owner or admin" on public.sub_referrals
for delete to authenticated
using (created_by = (select auth.uid()) or exists (
  select 1 from public.admins where user_id = (select auth.uid())
));
