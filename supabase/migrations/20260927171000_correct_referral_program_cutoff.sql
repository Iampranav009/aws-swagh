-- The Sheet contains gaps, so the 1313 non-empty signups extend through row
-- 1318. Rows 1315-1318 are also historical (latest timestamp: 2026-09-22).
update public.referral_programs
set cutoff_sheet_row = 1318
where slug in ('original-referral-program', 'referral-program-2026-09-27');

insert into public.referral_program_signup_snapshots (program_id, sheet_id, sheet_row)
select program.id, signup.sheet_id, signup.sheet_row
from public.referral_programs as program
cross join public.signups as signup
where program.slug = 'original-referral-program'
  and signup.sheet_row <= program.cutoff_sheet_row
on conflict do nothing;
