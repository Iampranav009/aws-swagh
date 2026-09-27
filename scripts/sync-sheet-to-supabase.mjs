import { createClient } from '@supabase/supabase-js';

const dryRun = process.argv.includes('--dry-run');
const sheetId = process.env.VITE_GOOGLE_SHEETS_ID;
const sheetsKey = process.env.VITE_GOOGLE_SHEETS_API_KEY;
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const sheetName = 'Form Responses 1';

if (!sheetId || !sheetsKey) throw new Error('Google Sheets environment variables are missing.');
if (!dryRun && (!supabaseUrl || !serviceRoleKey)) {
  throw new Error('VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required for a live sync.');
}

const clean = (value = '') => value.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(sheetName)}?key=${sheetsKey}`);
if (!response.ok) throw new Error(`Sheets API error: ${response.status} ${response.statusText}`);
const { values = [] } = await response.json();
const headers = (values[0] || []).map((value) => String(value).toLowerCase().replace(/[^a-z0-9]/g, ''));
const column = (names, fallback) => {
  const index = headers.findIndex((header) => names.some((name) => header.includes(name)));
  return index >= 0 ? index : fallback;
};
const indexes = {
  name: column(['name'], 1), email: column(['email'], 2), alias: column(['aliasid', 'awsalias', 'aliid'], 3),
  contact: column(['phone', 'contact', 'mobile'], 4), referral: column(['referralcode', 'referralid', 'referredby'], 5),
  builder: column(['buildercentralid', 'buildercenterid', 'builderid'], 6), awsName: column(['nameonaws', 'awsprofilename'], 14),
};
const rows = values.slice(1).map((row, offset) => ({
  sheet_id: sheetId, sheet_row: offset + 2, sheet_name: sheetName,
  name: String(row[indexes.name] || '').trim(), email: String(row[indexes.email] || '').trim() || null,
  alias: clean(String(row[indexes.alias] || '')), raw_alias: String(row[indexes.alias] || '').trim(),
  contact: String(row[indexes.contact] || '').trim() || null, referral_code: clean(String(row[indexes.referral] || '')),
  builder_central_id: String(row[indexes.builder] || '').trim() || null, name_on_aws: String(row[indexes.awsName] || '').trim() || null,
  synced_at: new Date().toISOString(),
})).filter((row) => row.alias);

console.log(`${dryRun ? 'Validated' : 'Syncing'} ${rows.length} signup rows.`);
if (dryRun) process.exit(0);

const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
for (let start = 0; start < rows.length; start += 500) {
  const { error } = await supabase.from('signups').upsert(rows.slice(start, start + 500), { onConflict: 'sheet_id,sheet_row' });
  if (error) throw error;
}
console.log(`Synced ${rows.length} signup rows to Supabase.`);
