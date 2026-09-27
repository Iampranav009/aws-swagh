import { normalizeAlias, levenshtein } from './utils';
import { isSupabaseConfigured, supabase } from './supabase';
import archivedLeaderboardJson from '../data/archived_leaderboard.json';

export interface SheetUser {
  id?: string | number;
  sheetRow?: number;
  name: string;
  alias: string;
  rawAlias: string;
  email?: string;
  contact?: string;
  referralCode: string;
  nameOnAws?: string;
  builderCentralId?: string;
  submittedAt?: string;
  referrerName?: string;
  source?: 'google-sheet' | 'native-form';
  sbclCode?: string;
  isValid?: boolean;
  flagReason?: string;
}

export interface LeaderboardEntry extends SheetUser {
  points: number;
  referrals: number;
  resolvedReferrerAlias?: string | null;
}

const API_KEY  = import.meta.env.VITE_GOOGLE_SHEETS_API_KEY;
const SHEET_ID = import.meta.env.VITE_GOOGLE_SHEETS_ID || "1Di4lk_UcuF_3HBUj_p35N26h9fPJ4e0-lF9y2OI_WdM";
const SHEET_NAME = "Form Responses 1";
export const REFERRAL_PROGRAM_CUTOFF_SHEET_ROW = 1318;

// ── Re-export the single source of truth for alias normalisation ────────────
export { normalizeAlias };

// Internal shorthand
const clean = normalizeAlias;

// ── Fuzzy referral-code resolver ────────────────────────────────────────────
/**
 * Given a referral code that doesn't exactly match any registered alias,
 * try to find the "closest" alias using Levenshtein distance.
 *
 * Rules (conservative to avoid false positives):
 *   1. Distance must be ≤ 2 edits.
 *   2. Distance / max(len_a, len_b) must be ≤ 0.30  (≤30 % different).
 *   3. If multiple aliases tie on distance, pick the shortest one.
 *
 * Returns the best matching alias string, or null if no safe match found.
 */
function fuzzyResolveAlias(
  code: string,
  knownAliases: string[]
): string | null {
  if (!code || knownAliases.length === 0) return null;

  const MAX_DISTANCE = 2;
  const MAX_RATIO    = 0.30;

  let bestAlias: string | null = null;
  let bestDist = Infinity;

  for (const alias of knownAliases) {
    const dist = levenshtein(code, alias);
    if (dist > MAX_DISTANCE) continue;

    const ratio = dist / Math.max(code.length, alias.length);
    if (ratio > MAX_RATIO) continue;

    if (dist < bestDist || (dist === bestDist && alias.length < (bestAlias?.length ?? Infinity))) {
      bestDist  = dist;
      bestAlias = alias;
    }
  }

  if (bestAlias) {
    console.log(
      `[Sheets] Fuzzy match: "${code}" → "${bestAlias}" (distance=${bestDist})`
    );
  }
  return bestAlias;
}

export async function fetchPrivateUsersFromSheet(): Promise<SheetUser[]> {
  try {
    if (!API_KEY) {
      console.warn("Missing Google Sheets API Key (VITE_GOOGLE_SHEETS_API_KEY)");
      return [];
    }

    const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${encodeURIComponent(SHEET_NAME)}?key=${API_KEY}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Sheets API error: ${response.status} ${response.statusText}`);

    const result = await response.json();
    const rows: string[][] = result.values || [];
    if (rows.length === 0) {
      console.warn("Google Sheet returned no rows");
      return [];
    }

    const headers = rows[0].map((header) => (header || '').toLowerCase().replace(/[^a-z0-9]/g, ''));
    const findColumn = (names: string[], fallback: number) => {
      const index = headers.findIndex((header) => names.some((name) => header.includes(name)));
      return index >= 0 ? index : fallback;
    };
    const nameColumn = findColumn(['name'], 1);
    const emailColumn = findColumn(['email'], 2);
    const aliasColumn = findColumn(['aliasid', 'awsalias', 'aliid'], 3);
    const contactColumn = findColumn(['phone', 'contact', 'mobile'], 4);
    const referralColumn = findColumn(['referralcode', 'referralid', 'referredby'], 5);
    const builderIdColumn = findColumn(['buildercentralid', 'buildercenterid', 'builderid'], 6);
    const awsNameColumn = findColumn(['nameonaws', 'awsprofilename'], 14);

    // Row 0 contains headers; known legacy column positions remain as fallbacks.
    const users: SheetUser[] = [];
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const name         = (row[nameColumn] || '').trim();
      const email        = (row[emailColumn] || '').trim();
      const rawAlias     = (row[aliasColumn] || '').trim();
      const alias        = clean(row[aliasColumn] || '');
      const contact      = (row[contactColumn] || '').trim();
      const referralCode = clean(row[referralColumn] || '');
      const nameOnAws    = (row[awsNameColumn] || '').trim();
      const builderCentralId = (row[builderIdColumn] || '').trim();

      if (alias) {
        users.push({ sheetRow: i + 1, name, alias, rawAlias, email, contact, referralCode, nameOnAws, builderCentralId });
      }
    }

    console.log(`[Sheets] Fetched ${users.length} raw users`);
    return users;

  } catch (error) {
    console.error("[Sheets] fetchUsers error:", error);
    return [];
  }
}

export async function fetchPrivateUsersFromSupabase(): Promise<SheetUser[]> {
  if (!isSupabaseConfigured) throw new Error('Supabase environment variables are missing');

  const PAGE_SIZE = 1000;

  // Paginate signups
  const legacyData: any[] = [];
  let fromLegacy = 0;
  while (true) {
    const { data, error } = await supabase
      .from('signups')
      .select('name,email,alias,raw_alias,contact,referral_code,name_on_aws,builder_central_id,submitted_at')
      .order('sheet_row', { ascending: true })
      .range(fromLegacy, fromLegacy + PAGE_SIZE - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    legacyData.push(...data);
    if (data.length < PAGE_SIZE) break;
    fromLegacy += PAGE_SIZE;
  }

  // Paginate sbcl_form_submissions
  const nativeData: any[] = [];
  let fromNative = 0;
  while (true) {
    const { data, error } = await supabase
      .from('sbcl_form_submissions')
      .select('id,sbcl_code,name,email,alias,contact,referral_code,referred_by_name,name_on_aws,builder_central_id,created_at,is_valid,flag_reason')
      .order('created_at', { ascending: true })
      .range(fromNative, fromNative + PAGE_SIZE - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    nativeData.push(...data);
    if (data.length < PAGE_SIZE) break;
    fromNative += PAGE_SIZE;
  }

  const legacyRows = legacyData.map((row) => {
    const rawRef = clean(row.referral_code || '');
    const parsed = rawRef.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 3);
    return {
      sheetRow: row.sheet_row,
      name: row.name || '', email: row.email || '', alias: clean(row.alias), rawAlias: row.raw_alias || row.alias,
      contact: row.contact || '', referralCode: rawRef, nameOnAws: row.name_on_aws || '', builderCentralId: row.builder_central_id || '', submittedAt: row.submitted_at || '', source: 'google-sheet' as const,
      sbclCode: parsed,
      isValid: true,
      flagReason: '',
    };
  });
  const nativeRows = nativeData.map((row) => {
    const rawRef = clean(row.referral_code || '');
    const explicitSbcl = row.sbcl_code ? String(row.sbcl_code).toUpperCase().trim() : '';
    const fallbackSbcl = rawRef.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 3);
    return {
      id: row.id,
      name: row.name || '', email: row.email || '', alias: clean(row.alias), rawAlias: row.alias || '',
      contact: row.contact || '', referralCode: rawRef, referrerName: row.referred_by_name || '', nameOnAws: row.name_on_aws || '', builderCentralId: row.builder_central_id || '', submittedAt: row.created_at || '', source: 'native-form' as const,
      sbclCode: explicitSbcl || fallbackSbcl,
      isValid: row.is_valid !== false,
      flagReason: row.flag_reason || '',
    };
  });
  return [...legacyRows, ...nativeRows];
}

/**
 * Public application data comes from Supabase Postgres.
 * During the one-time infrastructure rollout, the sanitized Sheet response is
 * retained as a read-only availability fallback. Private fields are removed.
 */
export async function fetchUsers(): Promise<SheetUser[]> {
  try {
    if (!isSupabaseConfigured) throw new Error('Supabase environment variables are missing');

    const PAGE_SIZE = 1000;
    const allRows: SheetUser[] = [];
    let from = 0;

    while (true) {
      const { data, error } = await supabase
        .from('leaderboard_signups')
        .select('name,alias,raw_alias,referral_code,name_on_aws,builder_central_id,referrer_name,sbcl_code,is_valid,flag_reason')
        .order('sheet_row', { ascending: true })
        .range(from, from + PAGE_SIZE - 1);

      if (error) throw error;
      if (!data || data.length === 0) break;

      allRows.push(...data.map((row) => ({
        name: row.name || '',
        alias: clean(row.alias),
        rawAlias: row.raw_alias || row.alias,
        referralCode: clean(row.referral_code || ''),
        nameOnAws: row.name_on_aws || '',
        builderCentralId: row.builder_central_id || '',
        referrerName: row.referrer_name || '',
        sbclCode: row.sbcl_code || '',
        isValid: row.is_valid !== false,
        flagReason: row.flag_reason || '',
      })));

      if (data.length < PAGE_SIZE) break;
      from += PAGE_SIZE;
    }

    return allRows;
  } catch (error) {
    console.warn('[Supabase] Postgres unavailable; using sanitized Sheet fallback.', error);
    const rows = await fetchPrivateUsersFromSheet();
    return rows.map(({ email: _email, contact: _contact, ...publicRow }) => ({
      ...publicRow,
      referralCode: (publicRow.sheetRow || 0) > REFERRAL_PROGRAM_CUTOFF_SHEET_ROW
        ? publicRow.referralCode
        : '',
    }));
  }
}

export async function fetchArchivedLeaderboardUsers(): Promise<SheetUser[]> {
  if (isSupabaseConfigured) {
    try {
      const PAGE_SIZE = 1000;
      const allData: any[] = [];
      let from = 0;
      while (true) {
        const { data, error } = await supabase
          .from('archived_leaderboard_signups')
          .select('name,alias,raw_alias,referral_code,name_on_aws,builder_central_id')
          .order('id', { ascending: true })
          .range(from, from + PAGE_SIZE - 1);

        if (error) throw error;
        if (!data || data.length === 0) break;
        allData.push(...data);
        if (data.length < PAGE_SIZE) break;
        from += PAGE_SIZE;
      }

      if (allData.length > 0) {
        return allData.map((row) => ({
          name: row.name || '',
          alias: clean(row.alias),
          rawAlias: row.raw_alias || row.alias,
          referralCode: clean(row.referral_code || ''),
          nameOnAws: row.name_on_aws || '',
          builderCentralId: row.builder_central_id || '',
        }));
      }
    } catch (err) {
      console.warn('[Supabase] Error fetching archived signups; using static fallback.', err);
    }
  }

  return (archivedLeaderboardJson as any[]).map((row) => ({
    name: row.name || '',
    alias: clean(row.alias),
    rawAlias: row.rawAlias || row.alias,
    referralCode: clean(row.referralCode || ''),
    nameOnAws: row.nameOnAws || '',
    builderCentralId: row.builderCentralId || '',
  }));
}

export function processLeaderboard(users: SheetUser[]): LeaderboardEntry[] {
  // ── Step 1: Build a map of alias → entry, keeping FIRST occurrence only ──
  const map: Record<string, LeaderboardEntry> = {};

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

  const knownAliases = Object.keys(map);

  // ── Step 2: Credit referrers ──
  // Walk every UNIQUE user (from the map) and credit whoever they referred under.
  // If the referral code doesn't exactly match a known alias, try prefix matching, fuzzy resolution,
  // or dynamically create the referrer entry so sub-referrals and SBCLs appear immediately!
  for (const entry of Object.values(map)) {
    let refCode = entry.referralCode;
    if (!refCode) continue;
    if (refCode === entry.alias) continue; // self-referral — skip
    if (entry.isValid === false) continue; // flagged as existing record or duplicate — skip referral credit

    // 1. Exact match first
    let referrer = map[refCode];
    let resolvedReferrerAlias = referrer ? refCode : null;

    // 2. Sub-code / alias without 3-letter prefix (e.g. AWSAWS001 -> AWS001)
    if (!referrer && refCode.length > 3) {
      const subPart = refCode.slice(3);
      if (map[subPart] && subPart !== entry.alias) {
        referrer = map[subPart];
        resolvedReferrerAlias = subPart;
      }
    }

    // 3. Fuzzy fallback (minor typos)
    if (!referrer) {
      const fuzzy = fuzzyResolveAlias(refCode, knownAliases);
      if (fuzzy && fuzzy !== entry.alias) {
        referrer = map[fuzzy];
        resolvedReferrerAlias = fuzzy;
      }
    }

    // 4. If the referrer (sub-referral or SBCL) hasn't submitted a participant signup,
    // dynamically register them so they appear on the leaderboard immediately!
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
      resolvedReferrerAlias = refCode;
    } else if (clean(referrer.name) === clean(referrer.alias) && entry.referrerName && clean(entry.referrerName) !== clean(referrer.alias)) {
      // If referrer was previously recorded with their alias as the name, upgrade to the real name
      referrer.name = entry.referrerName.trim();
    }

    referrer.referrals += 1;
    referrer.points    += 15;
    entry.resolvedReferrerAlias = resolvedReferrerAlias;
  }

  // ── Step 2.5: Special Manual Approval for YATHARTH29 ──────────────────────
  // The user requested to "approve all his referrals" because of Google Form errors.
  // We'll walk the RAW users list and count ANY row that used "YATHARTH29" as the 
  // referral code but WASN'T already counted in the unique map above.
  const targetReferrer = map['YATHARTH29'];
  if (targetReferrer) {
    // Track which unique users were already credited to him
    const alreadyCreditedAliases = new Set(
      Object.values(map)
        .filter(entry => entry.resolvedReferrerAlias === 'YATHARTH29')
        .map(entry => entry.alias)
    );

    // Count all other rows that used his code
    for (const rawUser of users) {
      const refCode = clean(rawUser.referralCode);
      const userAlias = clean(rawUser.alias);
      
      // If it's his code, but NOT a unique user we already counted
      if (refCode === 'YATHARTH29' && (!userAlias || !alreadyCreditedAliases.has(userAlias))) {
        // Skip self-referral
        if (userAlias === 'YATHARTH29') continue;
        
        targetReferrer.referrals += 1;
        targetReferrer.points += 15;
        
        // If it had an alias, add it to credited so we don't double count if same duplicate appears twice in raw list
        if (userAlias) {
          alreadyCreditedAliases.add(userAlias);
        }
      }
    }
  }

  // ── Step 3: Sort descending by points, then alphabetically by name ──
  const sorted = Object.values(map).sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    return a.name.localeCompare(b.name);
  });

  console.log("[Sheets] Processed leaderboard:", sorted.slice(0, 5));
  return sorted;
}
