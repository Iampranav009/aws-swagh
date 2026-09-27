const fs = require('fs');

const content = fs.readFileSync('c:/myfile/swag-aws/AWS club JDID name folder/student_mega_sheet.csv', 'utf8');

function clean(str) {
  if (!str) return '';
  return str.replace(/^@+/, '').replace(/\s+/g, '').toUpperCase();
}

function parseCSVLine(text) {
  const result = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      inQuotes = !inQuotes;
    } else if (c === ',' && !inQuotes) {
      result.push(cur);
      cur = '';
    } else {
      cur += c;
    }
  }
  result.push(cur);
  return result;
}

const lines = content.split('\n');
const rows = [];
for (let i = 1; i < lines.length; i++) {
  const line = lines[i].trim();
  if (!line) continue;
  const parts = parseCSVLine(line);
  const name = parts[0]?.trim();
  const rawAlias = parts[4]?.trim();
  const alias = clean(rawAlias);
  const referralCode = clean(parts[11]?.trim());
  if (alias) {
    rows.push({ sheetRow: i + 1, name, alias, rawAlias, referralCode });
  }
}

console.log('Total valid rows extracted:', rows.length);

const map = {};
for (const u of rows) {
  if (!u.alias) continue;
  if (!map[u.alias]) {
    map[u.alias] = { ...u, points: 0, referrals: 0 };
  }
}

for (const entry of Object.values(map)) {
  const ref = entry.referralCode;
  if (!ref || ref === entry.alias) continue;
  if (!map[ref]) {
    map[ref] = { name: ref, alias: ref, rawAlias: ref, points: 0, referrals: 0 };
  }
  map[ref].referrals += 1;
  map[ref].points += 15;
}

const sorted = Object.values(map).sort((a, b) => b.points - a.points);
console.log('\n--- TOP 10 WINNERS FROM STUDENT MEGA SHEET ---');
sorted.slice(0, 10).forEach((u, i) => {
  console.log(`#${i + 1}: ${u.name} (@${u.alias}) — ${u.referrals} referrals (${u.points} pts)`);
});
