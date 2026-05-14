import { normalizeAlias, levenshtein } from './utils';

export interface SheetUser {
  name: string;
  alias: string;
  contact?: string;
  referralCode: string;
}

export interface LeaderboardEntry extends SheetUser {
  points: number;
  referrals: number;
}

const API_KEY  = import.meta.env.VITE_GOOGLE_SHEETS_API_KEY;
const SHEET_ID = import.meta.env.VITE_GOOGLE_SHEETS_ID || "1Di4lk_UcuF_3HBUj_p35N26h9fPJ4e0-lF9y2OI_WdM";
const SHEET_NAME = "Form Responses 1";

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

export async function fetchUsers(): Promise<SheetUser[]> {
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

    // Row 0 = headers, skip it
    // Columns: 0=Timestamp, 1=Name, 2=Email, 3=Alias, 4=Phone, 5=ReferralCode
    const users: SheetUser[] = [];
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const name         = (row[1] || '').trim();
      const alias        = clean(row[3] || '');
      const contact      = (row[4] || '').trim();
      const referralCode = clean(row[5] || '');

      if (alias) {
        users.push({ name, alias, contact, referralCode });
      }
    }

    console.log(`[Sheets] Fetched ${users.length} raw users`);
    return users;

  } catch (error) {
    console.error("[Sheets] fetchUsers error:", error);
    return [];
  }
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
  // If the referral code doesn't exactly match a known alias, try fuzzy resolution.
  for (const entry of Object.values(map)) {
    let refCode = entry.referralCode;
    if (!refCode) continue;
    if (refCode === entry.alias) continue; // self-referral — skip

    // Exact match first
    let referrer = map[refCode];

    // Fuzzy fallback (minor typos)
    if (!referrer) {
      const fuzzy = fuzzyResolveAlias(refCode, knownAliases);
      if (fuzzy && fuzzy !== entry.alias) {
        referrer = map[fuzzy];
      }
    }

    if (!referrer) continue;

    referrer.referrals += 1;
    referrer.points    += 15;
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
        .filter(entry => {
          let refCode = entry.referralCode;
          if (refCode === 'YATHARTH29') return true;
          const fuzzy = fuzzyResolveAlias(refCode, Object.keys(map));
          return fuzzy === 'YATHARTH29';
        })
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
