import fs from 'fs';
import * as xlsx from 'xlsx';

// 1. Read environment variables
const envFile = fs.readFileSync('.env', 'utf8');
const lines = envFile.split('\n');
let apiKey = '';
let sheetId = '';
lines.forEach(l => {
  if (l.startsWith('VITE_GOOGLE_SHEETS_API_KEY=')) {
    apiKey = l.split('=')[1].trim();
  }
  if (l.startsWith('VITE_GOOGLE_SHEETS_ID=')) {
    sheetId = l.split('=')[1].trim();
  }
});

const SHEET_NAME = 'Form Responses 1';
const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(SHEET_NAME)}?key=${apiKey}`;

// 2. Helper functions
function normalizeAlias(s) {
  return (s || '').replace(/^@/, '').trim().toUpperCase();
}

function levenshtein(a, b) {
  const m = a.length;
  const n = b.length;
  const dp = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
  }
  return dp[m][n];
}

function fuzzyResolveAlias(code, knownAliases) {
  if (!code || knownAliases.length === 0) return null;

  const MAX_DISTANCE = 2;
  const MAX_RATIO = 0.30;

  let bestAlias = null;
  let bestDist = Infinity;

  for (const alias of knownAliases) {
    const dist = levenshtein(code, alias);
    if (dist > MAX_DISTANCE) continue;

    const ratio = dist / Math.max(code.length, alias.length);
    if (ratio > MAX_RATIO) continue;

    if (dist < bestDist || (dist === bestDist && alias.length < (bestAlias?.length ?? Infinity))) {
      bestDist = dist;
      bestAlias = alias;
    }
  }
  return bestAlias;
}

// 3. Core Analysis Function
async function runAnalysis() {
  try {
    console.log('Fetching data from Google Sheets...');
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Sheets API responded with ${res.status}: ${res.statusText}`);
    }
    const result = await res.json();
    const rows = result.values || [];
    if (rows.length === 0) {
      console.log('No data found in Google Sheet.');
      return;
    }

    console.log(`Fetched ${rows.length - 1} rows from Google Sheet.`);

    // Extract headers (excluding timestamp column 0)
    const headers = result.values[0];
    const nonTimestampHeaders = headers.slice(1);

    // Map of unique user aliases -> LeaderboardEntry
    const map = {};
    const rawUsers = [];

    // Columns: 1=Name, 3=Alias, 4=Contact, 5=ReferralCode
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const name = (row[1] || '').trim();
      const rawAlias = (row[3] || '').trim();
      const alias = normalizeAlias(rawAlias);
      const contact = (row[4] || '').trim();
      const referralCode = normalizeAlias(row[5] || '');

      if (alias) {
        rawUsers.push({ name, alias, rawAlias, contact, referralCode, fullRow: row });
        // Keep the first occurrence as the unique registered user
        if (!map[alias]) {
          map[alias] = {
            name,
            alias,
            rawAlias,
            contact,
            referralCode,
            referrals: 0,
            totalIdUsages: 0,
            fullRow: row
          };
        }
      }
    }

    const knownAliases = Object.keys(map);

    // ── Count Referral Usages & Valid Referrals ──
    for (const entry of Object.values(map)) {
      let refCode = entry.referralCode;
      if (!refCode) continue;
      if (refCode === entry.alias) continue; // Skip self-referrals

      let referrer = map[refCode];
      if (!referrer) {
        const fuzzy = fuzzyResolveAlias(refCode, knownAliases);
        if (fuzzy && fuzzy !== entry.alias) {
          referrer = map[fuzzy];
        }
      }

      if (referrer) {
        referrer.referrals += 1;
      }
    }

    // Special Yatharth29 rule
    const targetReferrer = map['YATHARTH29'];
    if (targetReferrer) {
      const alreadyCreditedAliases = new Set(
        Object.values(map)
          .filter(entry => {
            let refCode = entry.referralCode;
            if (refCode === 'YATHARTH29') return true;
            const fuzzy = fuzzyResolveAlias(refCode, knownAliases);
            return fuzzy === 'YATHARTH29';
          })
          .map(entry => entry.alias)
      );

      for (const rawUser of rawUsers) {
        const refCode = rawUser.referralCode;
        const userAlias = rawUser.alias;

        if (refCode === 'YATHARTH29' && (!userAlias || !alreadyCreditedAliases.has(userAlias))) {
          if (userAlias === 'YATHARTH29') continue;
          targetReferrer.referrals += 1;
          if (userAlias) {
            alreadyCreditedAliases.add(userAlias);
          }
        }
      }
    }

    // Calculate Total Times Referral ID was Used in raw sheet
    for (const rawUser of rawUsers) {
      const refCode = rawUser.referralCode;
      if (!refCode) continue;

      let referrer = map[refCode];
      if (!referrer) {
        const fuzzy = fuzzyResolveAlias(refCode, knownAliases);
        if (fuzzy) {
          referrer = map[fuzzy];
        }
      }

      if (referrer) {
        referrer.totalIdUsages += 1;
      }
    }

    // ── Sort Leaderboard ──
    const sortedLeaderboard = Object.values(map).sort((a, b) => {
      if (b.referrals !== a.referrals) return b.referrals - a.referrals;
      return a.name.localeCompare(b.name);
    });

    // ── Process Top 20 ──
    const top20 = sortedLeaderboard.slice(0, 20).map((u, index) => {
      const rank = index + 1;
      const conversionRate = u.totalIdUsages > 0 
        ? ((u.referrals / u.totalIdUsages) * 100).toFixed(1) + '%' 
        : '0%';
      return {
        'Rank': rank,
        'Name': u.name,
        'Alias ID': '@' + u.alias.toLowerCase(),
        'Persons Referred (Unique)': u.referrals,
        'Times Referral ID Used (Raw)': u.totalIdUsages,
        'Conversion/Success Rate': conversionRate
      };
    });

    // ── Process Top 5 Detailed Info (excluding Timestamp) ──
    const top5Detailed = sortedLeaderboard.slice(0, 5).map((u, index) => {
      const detail = {
        'Leaderboard Rank': index + 1,
      };
      // Add all details except Timestamp (index 0)
      nonTimestampHeaders.forEach((header, idx) => {
        // row index in sheets api corresponds to headers array index.
        // Since we sliced off the timestamp, header at nonTimestampHeaders[idx] has row value at row[idx+1]
        detail[header] = u.fullRow[idx + 1] || '';
      });
      return detail;
    });

    console.log('\n=== TOP 5 DETAILED DETAILS ===');
    console.log(JSON.stringify(top5Detailed, null, 2));

    // ── Generate Excel Sheet ──
    const wb = xlsx.utils.book_new();
    
    // Sheet 1: Top 5 Detailed Info
    const wsTop5 = xlsx.utils.json_to_sheet(top5Detailed);
    xlsx.utils.book_append_sheet(wb, wsTop5, "Top 5 Detailed Info");

    // Sheet 2: Top 20 Performers
    const wsTop20 = xlsx.utils.json_to_sheet(top20);
    xlsx.utils.book_append_sheet(wb, wsTop20, "Top 20 Performers");

    // Sheet 3: All Users Analysis
    const allUsersData = sortedLeaderboard.map((u, index) => {
      const conversionRate = u.totalIdUsages > 0 
        ? ((u.referrals / u.totalIdUsages) * 100).toFixed(1) + '%' 
        : '0%';
      return {
        'Rank': index + 1,
        'Name': u.name,
        'Alias ID': '@' + u.alias.toLowerCase(),
        'Persons Referred (Unique)': u.referrals,
        'Times Referral ID Used (Raw)': u.totalIdUsages,
        'Conversion/Success Rate': conversionRate
      };
    });
    const wsAll = xlsx.utils.json_to_sheet(allUsersData);
    xlsx.utils.book_append_sheet(wb, wsAll, "All Users Analysis");

    const filename = "Leaderboard_Top_Performers.xlsx";
    xlsx.writeFile(wb, filename);
    console.log(`\nSuccessfully generated Excel file: ${filename}`);

  } catch (error) {
    console.error('Error during leaderboard analysis:', error);
  }
}

runAnalysis();
