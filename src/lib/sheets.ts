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

/** Normalise an alias/referral code — strip @, spaces, uppercase */
function clean(s: string): string {
  return (s || '').replace(/^@/, '').trim().toUpperCase();
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

  // ── Step 2: Credit referrers ──
  // Walk every UNIQUE user (from the map) and credit whoever they referred under
  for (const entry of Object.values(map)) {
    const refCode = entry.referralCode;

    // Skip: empty, self-referral, or referrer not registered
    if (!refCode)               continue;
    if (refCode === entry.alias) continue;
    if (!map[refCode])           continue;

    map[refCode].referrals += 1;
    map[refCode].points    += 15;
  }

  // ── Step 3: Sort descending by points, then alphabetically by name ──
  const sorted = Object.values(map).sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    return a.name.localeCompare(b.name);
  });

  console.log("[Sheets] Processed leaderboard:", sorted.slice(0, 5));
  return sorted;
}
