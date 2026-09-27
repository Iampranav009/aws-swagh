import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = fs.readFileSync('.env', 'utf8');
const url = env.match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
const key = env.match(/VITE_SUPABASE_PUBLISHABLE_KEY=(.*)/)[1].trim();
const supabase = createClient(url, key);

async function test() {
  const PAGE_SIZE = 1000;
  let allData = [];
  let from = 0;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await supabase
      .from('leaderboard_signups')
      .select('name,alias,raw_alias,referral_code,name_on_aws,builder_central_id,referrer_name')
      .order('sheet_row', { ascending: true })
      .range(from, from + PAGE_SIZE - 1);

    if (error) throw error;
    if (!data || data.length === 0) break;
    allData = allData.concat(data);
    if (data.length < PAGE_SIZE) hasMore = false;
    else from += PAGE_SIZE;
  }

  console.log('Total fetched with pagination:', allData.length);

  const clean = (v = '') => v.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  const users = allData.map((row) => ({
    name: row.name || '',
    alias: clean(row.alias),
    rawAlias: row.raw_alias || row.alias,
    referralCode: clean(row.referral_code || ''),
    nameOnAws: row.name_on_aws || '',
    builderCentralId: row.builder_central_id || '',
    referrerName: row.referrer_name || '',
  }));

  const map = {};
  for (const user of users) {
    const alias = clean(user.alias);
    if (!alias) continue;
    if (!map[alias]) {
      map[alias] = {
        ...user,
        alias,
        referralCode: clean(user.referralCode),
        points: 0,
        referrals: 0,
      };
    }
  }

  for (const entry of Object.values(map)) {
    let refCode = entry.referralCode;
    if (!refCode || refCode === entry.alias) continue;

    let referrer = map[refCode];
    if (!referrer && refCode.length > 3) {
      const sub = refCode.slice(3);
      if (map[sub] && sub !== entry.alias) referrer = map[sub];
    }

    if (!referrer) {
      const displayName = (entry.referrerName || refCode).trim();
      referrer = {
        name: displayName,
        alias: refCode,
        rawAlias: refCode,
        referralCode: '',
        points: 0,
        referrals: 0,
      };
      map[refCode] = referrer;
    }

    referrer.referrals += 1;
    referrer.points += 15;
  }

  const shinde = map['IAMSHINDE0009'];
  console.log('Result for IAMSHINDE0009 in leaderboard:', shinde);

  const active = Object.values(map)
    .filter((u) => u.referrals > 0)
    .sort((a, b) => b.points - a.points);
  console.log('Total active referrers on leaderboard:', active.length);
  const shindeIndex = active.findIndex((u) => u.alias === 'IAMSHINDE0009');
  console.log('Shinde position on leaderboard: #' + (shindeIndex + 1));
}

test().catch(console.error);
