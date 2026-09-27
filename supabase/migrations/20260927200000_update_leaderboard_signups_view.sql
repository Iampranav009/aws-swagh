-- Update leaderboard_signups view to include sbcl_code
drop view if exists public.leaderboard_signups;

create or replace view public.leaderboard_signups as
select 
  signup.sheet_row,
  signup.name,
  signup.alias,
  signup.raw_alias,
  case
    when signup.sheet_row > program.cutoff_sheet_row then signup.referral_code
    else ''::text
  end as referral_code,
  signup.name_on_aws,
  signup.builder_central_id,
  ''::text as referrer_name,
  case
    when signup.referral_code is not null and length(trim(signup.referral_code)) >= 3
    then upper(substring(trim(signup.referral_code) from 1 for 3))
    else null::text
  end as sbcl_code
from public.signups signup
cross join public.referral_programs program
where program.is_active

union all

select 
  1000000000 + submission.id::integer as sheet_row,
  submission.name,
  submission.alias,
  submission.alias as raw_alias,
  submission.referral_code,
  submission.name_on_aws,
  case
    when submission.has_builder_id then coalesce(submission.builder_central_id, submission.alias, 'YES'::text)
    else 'NO'::text
  end as builder_central_id,
  submission.referred_by_name as referrer_name,
  upper(submission.sbcl_code) as sbcl_code
from public.sbcl_form_submissions submission;

grant select on public.leaderboard_signups to anon, authenticated;
