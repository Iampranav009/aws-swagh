import fs from 'fs';
import path from 'path';

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

// Slices off leading @, trims and uppercases
function clean(s) {
  return (s || '').replace(/^@/, '').trim().toUpperCase();
}

// Word overlap check for names
function nameMatches(sheetName, awsName) {
  if (!awsName) return true;
  const cleanSheet = sheetName.toLowerCase().trim();
  const cleanAws = awsName.toLowerCase().trim();
  if (cleanSheet === cleanAws) return true;

  const sheetWords = cleanSheet.split(/\s+/).filter(w => w.length >= 3);
  const awsWords = cleanAws.split(/\s+/).filter(w => w.length >= 3);

  if (sheetWords.length === 0 || awsWords.length === 0) {
    return cleanSheet.includes(cleanAws) || cleanAws.includes(cleanSheet);
  }

  return sheetWords.some(sw => awsWords.some(aw => aw.includes(sw) || sw.includes(aw)));
}

async function drawFinalWinners() {
  try {
    console.log('Fetching live data for final draw...');
    const res = await fetch(url);
    const result = await res.json();
    const rows = result.values || [];
    if (rows.length === 0) {
      console.log('No rows found in sheet');
      return;
    }

    console.log(`Fetched ${rows.length - 1} rows from Google Sheet.`);

    // Extract headers (excluding timestamp column 0)
    const rawUsers = [];
    const map = {};

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const name = (row[1] || '').trim();
      const rawAlias = (row[3] || '').trim();
      const alias = clean(rawAlias);
      const contact = (row[4] || '').trim();
      const referralCode = clean(row[5] || '');
      const nameOnAws = (row[14] || '').trim();

      if (alias) {
        rawUsers.push({ name, alias, rawAlias, contact, referralCode, nameOnAws, index: i + 1 });
        if (!map[alias]) {
          map[alias] = { name, alias, rawAlias, contact, referralCode, nameOnAws, referrals: 0 };
        }
      }
    }

    // Identify leaderboard top 5
    const ObjectValues = Object.values(map);
    // Count referrals
    ObjectValues.forEach(entry => {
      let refCode = entry.referralCode;
      if (!refCode || refCode === entry.alias) return;
      let referrer = map[refCode];
      if (referrer) referrer.referrals += 1;
    });

    const sortedLeaderboard = ObjectValues.sort((a, b) => b.referrals - a.referrals);
    const top5Aliases = new Set(sortedLeaderboard.slice(0, 5).map(u => u.alias.toUpperCase()));

    console.log('Leaderboard Top 5 Excluded:', Array.from(top5Aliases));

    // Compute duplicate contact/alias counts over the entire sheet
    const contactCounts = {};
    const aliasCounts = {};
    rawUsers.forEach(u => {
      const contact = (u.contact || '').trim();
      if (contact && contact.length > 5) {
        contactCounts[contact] = (contactCounts[contact] || 0) + 1;
      }
      const alias = (u.alias || '').trim().toUpperCase();
      if (alias) {
        aliasCounts[alias] = (aliasCounts[alias] || 0) + 1;
      }
    });

    // Helper for validation
    const getShortlist = (sliceSize) => {
      const candidates = rawUsers.slice(0, sliceSize);
      const authenticPool = [];

      candidates.forEach((u) => {
        if (top5Aliases.has(u.alias.toUpperCase())) return;

        // Space in alias ID
        if (u.rawAlias && u.rawAlias.includes(' ')) return;

        // Invalid/dummy alias ID
        const cleanAlias = (u.alias || '').trim().toUpperCase();
        const invalidAliases = new Set(['-', 'NONE', 'NO', 'NA', 'N/A', 'NIL', 'NULL', 'UNDEFINED']);
        if (!cleanAlias || invalidAliases.has(cleanAlias) || cleanAlias.length < 3) return;

        // Double address
        const contact = (u.contact || '').trim();
        if (contact && contactCounts[contact] > 1) return;
        if (cleanAlias && aliasCounts[cleanAlias] > 1) return;

        // Name mismatch
        if (u.nameOnAws) {
          const isMatched = nameMatches(u.name, u.nameOnAws);
          if (!isMatched) return;
        }

        // Invalid/dummy name
        const cleanName = (u.name || '').trim().toLowerCase();
        if (cleanName.length < 3 || cleanName.includes('test') || cleanName.includes('admin') || cleanName.includes('anonymous')) return;

        // Invalid/dummy contact
        if (contact && ['1234567890', '0000000000', '123456789', '9876543210'].includes(contact)) return;

        authenticPool.push({
          name: u.name,
          alias: u.alias
        });
      });

      return authenticPool;
    };

    let size = 300;
    let authenticPool = getShortlist(size);
    if (authenticPool.length < 250) {
      size = 350;
      authenticPool = getShortlist(size);
    }

    console.log(`Pool Shortlisted successfully. Size of initial slice evaluated: ${size}. Authentic Pool size: ${authenticPool.length}`);

    // Randomly draw 150 winners from the authentic pool
    const winners = [];
    const poolCopy = [...authenticPool];
    
    // Draw 50 for Round 1
    console.log('Drawing 50 winners for Round 1...');
    for (let i = 0; i < 50; i++) {
      const randomIndex = Math.floor(Math.random() * poolCopy.length);
      const chosen = poolCopy.splice(randomIndex, 1)[0];
      winners.push({
        id: i + 1,
        name: chosen.name,
        alias: chosen.alias,
        round: 1
      });
    }

    // Draw 50 for Round 2
    console.log('Drawing 50 winners for Round 2...');
    for (let i = 0; i < 50; i++) {
      const randomIndex = Math.floor(Math.random() * poolCopy.length);
      const chosen = poolCopy.splice(randomIndex, 1)[0];
      winners.push({
        id: 50 + i + 1,
        name: chosen.name,
        alias: chosen.alias,
        round: 2
      });
    }

    // Draw 50 for Round 3
    console.log('Drawing 50 winners for Round 3...');
    for (let i = 0; i < 50; i++) {
      const randomIndex = Math.floor(Math.random() * poolCopy.length);
      const chosen = poolCopy.splice(randomIndex, 1)[0];
      winners.push({
        id: 100 + i + 1,
        name: chosen.name,
        alias: chosen.alias,
        round: 3
      });
    }

    // Create src/data directory if not exists
    const dataDir = './src/data';
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    const filepath = path.join(dataDir, 'giveaway_winners.json');
    fs.writeFileSync(filepath, JSON.stringify(winners, null, 2), 'utf8');
    console.log(`\nSUCCESS: Final 150 winners written to static file: ${filepath}`);

  } catch (err) {
    console.error(err);
  }
}

drawFinalWinners();
