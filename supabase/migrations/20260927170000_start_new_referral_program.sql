-- Preserve the first referral program and start a clean leaderboard without
-- deleting signup identities. Row 1314 was the last Google Sheet row present
-- at the 2026-09-27 cutover (1 header row + 1313 signup rows).

create table public.referral_programs (
  id bigint generated always as identity primary key,
  slug text not null unique,
  name text not null,
  starts_at timestamptz not null,
  ends_at timestamptz,
  cutoff_sheet_row integer not null check (cutoff_sheet_row > 1),
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  constraint referral_programs_dates_check check (ends_at is null or ends_at >= starts_at)
);

create unique index referral_programs_one_active_uidx
  on public.referral_programs (is_active)
  where is_active;

alter table public.referral_programs enable row level security;
revoke all on table public.referral_programs from public, anon, authenticated;
grant select on table public.referral_programs to authenticated;
create policy "admins can read referral programs"
on public.referral_programs for select to authenticated
using (exists (
  select 1 from public.admins
  where admins.user_id = (select auth.uid())
));

create table public.referral_program_signup_snapshots (
  program_id bigint not null references public.referral_programs (id) on delete restrict,
  sheet_id text not null,
  sheet_row integer not null,
  archived_at timestamptz not null default now(),
  primary key (program_id, sheet_id, sheet_row),
  foreign key (sheet_id, sheet_row)
    references public.signups (sheet_id, sheet_row)
    on update cascade on delete restrict
);

create index referral_program_signup_snapshots_signup_idx
  on public.referral_program_signup_snapshots (sheet_id, sheet_row);

alter table public.referral_program_signup_snapshots enable row level security;
revoke all on table public.referral_program_signup_snapshots from public, anon, authenticated;
grant select on table public.referral_program_signup_snapshots to authenticated;
create policy "admins can read referral program snapshots"
on public.referral_program_signup_snapshots for select to authenticated
using (exists (
  select 1 from public.admins
  where admins.user_id = (select auth.uid())
));

insert into public.referral_programs
  (slug, name, starts_at, ends_at, cutoff_sheet_row, is_active)
values
  ('original-referral-program', 'Original Referral Program', '-infinity', '2026-09-27 00:00:00+05:30', 1314, false),
  ('referral-program-2026-09-27', 'Referral Program - September 2026', '2026-09-27 00:00:00+05:30', null, 1314, true);

insert into public.referral_program_signup_snapshots (program_id, sheet_id, sheet_row)
select program.id, signup.sheet_id, signup.sheet_row
from public.referral_programs as program
cross join public.signups as signup
where program.slug = 'original-referral-program'
  and signup.sheet_row <= program.cutoff_sheet_row
on conflict do nothing;

-- Historical, public-safe rows used by the Winners page. The underlying
-- snapshot and signup tables remain private; only this explicit column list is exposed.
create view public.archived_leaderboard_signups
with (security_invoker = false, security_barrier = true)
as
select
  program.slug as program_slug,
  signup.sheet_row,
  signup.name,
  signup.alias,
  signup.raw_alias,
  signup.referral_code,
  signup.name_on_aws,
  signup.builder_central_id
from public.referral_program_signup_snapshots as snapshot
join public.referral_programs as program on program.id = snapshot.program_id
join public.signups as signup
  on signup.sheet_id = snapshot.sheet_id
 and signup.sheet_row = snapshot.sheet_row;

revoke all on table public.archived_leaderboard_signups from public, anon, authenticated;
grant select on table public.archived_leaderboard_signups to anon, authenticated;

-- Keep every registered alias available as a possible referrer, but blank the
-- old referral edges. Only rows appended after the cutover can add new points.
create or replace view public.leaderboard_signups
with (security_invoker = false, security_barrier = true)
as
select
  signup.sheet_row,
  signup.name,
  signup.alias,
  signup.raw_alias,
  case
    when signup.sheet_row > program.cutoff_sheet_row then signup.referral_code
    else ''
  end as referral_code,
  signup.name_on_aws,
  signup.builder_central_id
from public.signups as signup
cross join public.referral_programs as program
where program.is_active;

revoke all on table public.leaderboard_signups from public, anon, authenticated;
grant select on table public.leaderboard_signups to anon, authenticated;
