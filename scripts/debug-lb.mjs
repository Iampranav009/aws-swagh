import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = fs.readFileSync('.env', 'utf8');
const url = env.match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
const key = env.match(/VITE_SUPABASE_PUBLISHABLE_KEY=(.*)/)[1].trim();
const supabase = createClient(url, key);

async function test() {
  const { data, count, error } = await supabase
    .from('leaderboard_signups')
    .select('name,alias,raw_alias,referral_code,name_on_aws,builder_central_id,referrer_name', { count: 'exact' })
    .range(0, 5000);

  console.log('Total count in view:', count);
  console.log('Fetched rows with range(0, 5000):', data?.length);

  const native = data?.filter((r) => r.referral_code === 'IAMSHINDE0009');
  console.log('Rows referred by IAMSHINDE0009:', native);
}

test().catch(console.error);
