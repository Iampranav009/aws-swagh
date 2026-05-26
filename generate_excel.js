import fs from 'fs';
import * as xlsx from 'xlsx';

// Utility functions
function clean(input) {
  if (!input) return '';
  return input.trim().toLowerCase().replace(/^@/, '');
}

function levenshtein(a, b) {
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const matrix = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          Math.min(matrix[i][j - 1] + 1, matrix[i - 1][j] + 1)
        );
      }
    }
  }
  return matrix[b.length][a.length];
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

const envFile = fs.readFileSync('.env', 'utf8');
const lines = envFile.split('\n');
let apiKey = '';
lines.forEach(l => {
  if (l.startsWith('VITE_GOOGLE_SHEETS_API_KEY=')) {
    apiKey = l.split('=')[1].trim();
  }
});

const SHEET_ID = '1Di4lk_UcuF_3HBUj_p35N26h9fPJ4e0-lF9y2OI_WdM';
const SHEET_NAME = 'Form Responses 1';
const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${encodeURIComponent(SHEET_NAME)}?key=${apiKey}`;

async function generateExcel() {
  try {
    const res = await fetch(url);
    const result = await res.json();
    if (!result.values) {
      console.log('No values found');
      return;
    }

    const rows = result.values;
    const users = [];

    // Columns: 1=Name, 3=Alias, 5=ReferralCode, 13=Status, 15=Profile_Status
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const name = (row[1] || '').trim();
      const rawAlias = row[3] || '';
      const alias = clean(rawAlias);
      const referralCode = clean(row[5] || '');
      const status = row[13] || '';
      const profileStatus = row[15] || '';

      if (alias) {
        users.push({ name, alias, rawAlias, referralCode, status, profileStatus, rawRow: row });
      }
    }

    // Map of alias -> user (keep first occurrence)
    const map = {};
    for (const user of users) {
      if (!map[user.alias]) {
        map[user.alias] = {
          ...user,
          validReferrals: 0,
          totalIdUsages: 0
        };
      }
    }

    const knownAliases = Object.keys(map);

    // Calculate referrals
    for (const user of users) {
      let refCode = user.referralCode;
      if (!refCode) continue;
      if (refCode === user.alias) continue; // skip self referral

      let referrerAlias = refCode;
      let referrer = map[refCode];

      if (!referrer) {
        const fuzzy = fuzzyResolveAlias(refCode, knownAliases);
        if (fuzzy && fuzzy !== user.alias) {
          referrer = map[fuzzy];
          referrerAlias = fuzzy;
        }
      }

      if (referrer) {
        referrer.totalIdUsages += 1;
        // Check if the referred user is "active" or "valid"
        const isActive = user.profileStatus.toUpperCase() === 'ACTIVE' && user.status.toLowerCase() === 'valid';
        if (isActive) {
          referrer.validReferrals += 1;
        }
      }
    }

    // YATHARTH29 logic from processLeaderboard
    const targetReferrer = map['yatharth29'];
    if (targetReferrer) {
      const alreadyCreditedAliases = new Set(
        users
          .filter(u => {
            let rc = u.referralCode;
            if (rc === 'yatharth29') return true;
            return fuzzyResolveAlias(rc, knownAliases) === 'yatharth29';
          })
          .map(u => u.alias)
      );

      for (const rawUser of users) {
        const rc = rawUser.referralCode;
        const ua = rawUser.alias;
        if (rc === 'yatharth29' && (!ua || !alreadyCreditedAliases.has(ua))) {
          if (ua === 'yatharth29') continue;
          
          targetReferrer.totalIdUsages += 1;
          const isActive = rawUser.profileStatus.toUpperCase() === 'ACTIVE' && rawUser.status.toLowerCase() === 'valid';
          if (isActive) {
            targetReferrer.validReferrals += 1;
          }

          if (ua) alreadyCreditedAliases.add(ua);
        }
      }
    }

    // Format for Excel
    const excelData = Object.values(map).map(u => ({
      'Name': u.name,
      'Alias': u.rawAlias,
      'Status (Valid/Invalid)': u.status,
      'Profile Status (Active/Inactive)': u.profileStatus,
      'Referral Code Used by this user': u.referralCode,
      'Total Times ID Used': u.totalIdUsages,
      'Valid Referrals (Active Users)': u.validReferrals
    }));

    // Generate Excel file
    const wb = xlsx.utils.book_new();
    const ws = xlsx.utils.json_to_sheet(excelData);
    xlsx.utils.book_append_sheet(wb, ws, "Users Data");
    xlsx.writeFile(wb, "Users_Referral_Data.xlsx");

    console.log('Successfully generated Users_Referral_Data.xlsx');

  } catch (error) {
    console.error('Error generating Excel:', error);
  }
}

generateExcel();
