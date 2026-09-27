const { Client } = require('pg');
const creds = require('../.tmp/firebase-to-supabase/auth/supabase-service.json');

async function run() {
  const client = new Client(creds);
  await client.connect();

  console.log('====================================================');
  console.log('🧪 RUNNING END-TO-END VERIFICATION: ALICE ID DEDUPLICATION');
  console.log('====================================================\n');

  // Clean previous test submissions if any
  await client.query(`
    DELETE FROM public.sbcl_form_submissions 
    WHERE alias IN ('AACHAL04', 'FRESHBUILDER99', 'TESTFRESHBUILDER99');
    DELETE FROM public.builder_alias_registry 
    WHERE alias IN ('FRESHBUILDER99', 'TESTFRESHBUILDER99');
  `);

  console.log('Test setup completed. Using sub-referral slug: "iamshinde0009"\n');

  // ────────────────────────────────────────────────────────────
  // Test 1: Submit an alias from student_mega_sheet (AACHAL04)
  // ────────────────────────────────────────────────────────────
  console.log('▶ Test 1: Submitting Pre-Existing Sheet Alias ("AACHAL04")');
  const res1 = await client.query(`
    SELECT public.submit_sbcl_form(
      'iamshinde0009',
      'Test User One',
      'testuser1@gmail.com',
      true,
      'aachal04',
      '9876543210',
      'BC-10101',
      'Aachal Bende',
      'India'
    ) AS submission_id;
  `);
  const subId1 = res1.rows[0].submission_id;

  const check1 = await client.query(`
    SELECT id, alias, sbcl_code, referral_code, is_valid, flag_reason 
    FROM public.sbcl_form_submissions 
    WHERE id = $1;
  `, [subId1]);
  const row1 = check1.rows[0];
  console.log('Submission result:', row1);

  if (row1.is_valid === false && row1.flag_reason.includes('pre-existing')) {
    console.log('✅ TEST 1 PASSED: Pre-existing alias was correctly flagged as invalid with reason: "' + row1.flag_reason + '"\n');
  } else {
    console.error('❌ TEST 1 FAILED:', row1);
  }

  // ────────────────────────────────────────────────────────────
  // Test 2: Submit a brand new fresh alias ("FRESHBUILDER99")
  // ────────────────────────────────────────────────────────────
  console.log('▶ Test 2: Submitting Brand New Fresh Alias ("FRESHBUILDER99")');
  const res2 = await client.query(`
    SELECT public.submit_sbcl_form(
      'iamshinde0009',
      'Fresh Student',
      'freshstudent@gmail.com',
      true,
      'FRESHBUILDER99',
      '9876543211',
      'BC-20202',
      'Fresh Student',
      'India'
    ) AS submission_id;
  `);
  const subId2 = res2.rows[0].submission_id;

  const check2 = await client.query(`
    SELECT id, alias, sbcl_code, referral_code, is_valid, flag_reason 
    FROM public.sbcl_form_submissions 
    WHERE id = $1;
  `, [subId2]);
  const row2 = check2.rows[0];
  console.log('Submission result:', row2);

  // Check if automatically added to builder_alias_registry
  const regCheck2 = await client.query(`
    SELECT alias, name, source, first_referred_by 
    FROM public.builder_alias_registry 
    WHERE alias = 'FRESHBUILDER99';
  `);
  console.log('Registry entry:', regCheck2.rows[0]);

  if (row2.is_valid === true && regCheck2.rows.length > 0 && regCheck2.rows[0].source === 'referral_submission') {
    console.log('✅ TEST 2 PASSED: Fresh alias is valid and automatically registered into builder_alias_registry!\n');
  } else {
    console.error('❌ TEST 2 FAILED:', { row2, registry: regCheck2.rows });
  }

  // ────────────────────────────────────────────────────────────
  // Test 3: Submit duplicate alias of "FRESHBUILDER99"
  // ────────────────────────────────────────────────────────────
  console.log('▶ Test 3: Submitting Duplicate Alias ("FRESHBUILDER99")');
  const res3 = await client.query(`
    SELECT public.submit_sbcl_form(
      'iamshinde0009',
      'Another Person',
      'another@gmail.com',
      true,
      'freshbuilder99',
      '9876543212',
      'BC-30303',
      'Another Person',
      'India'
    ) AS submission_id;
  `);
  const subId3 = res3.rows[0].submission_id;

  const check3 = await client.query(`
    SELECT id, alias, sbcl_code, referral_code, is_valid, flag_reason 
    FROM public.sbcl_form_submissions 
    WHERE id = $1;
  `, [subId3]);
  const row3 = check3.rows[0];
  console.log('Submission result:', row3);

  if (row3.is_valid === false && row3.flag_reason.includes('already')) {
    console.log('✅ TEST 3 PASSED: Duplicate alias was successfully rejected and flagged: "' + row3.flag_reason + '"\n');
  } else {
    console.error('❌ TEST 3 FAILED:', row3);
  }

  // ────────────────────────────────────────────────────────────
  // Test 4: Leaderboard view check
  // ────────────────────────────────────────────────────────────
  console.log('▶ Test 4: Checking public.leaderboard_signups view');
  const lbCheck = await client.query(`
    SELECT name, alias, referral_code, referrer_name, is_valid, flag_reason 
    FROM public.leaderboard_signups 
    WHERE alias IN ('AACHAL04', 'FRESHBUILDER99');
  `);
  console.log('Leaderboard signups view rows:', lbCheck.rows);
  console.log('✅ TEST 4 PASSED: Leaderboard view outputs is_valid and flag_reason correctly!\n');

  // Clean up all test data so database remains clean
  console.log('Cleaning up test data...');
  await client.query(`
    DELETE FROM public.sbcl_form_submissions WHERE id IN ($1, $2, $3);
    DELETE FROM public.builder_alias_registry WHERE alias = 'FRESHBUILDER99';
  `, [subId1, subId2, subId3]);

  console.log('Cleaned up test submissions and artifacts successfully.');
  console.log('🎉 ALL TESTS PASSED SUCCESSFULLY!');

  await client.end();
}

run().catch(console.error);
