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
  const nameOnAws = parts[9]?.trim() || name;
  const builderCentralId = parts[7]?.trim() || '';
  if (alias) {
    rows.push({
      sheetRow: i + 1,
      name,
      alias,
      rawAlias: rawAlias || alias,
      referralCode,
      nameOnAws,
      builderCentralId,
    });
  }
}

console.log('Writing', rows.length, 'historical rows to src/data/archived_leaderboard.json');
fs.writeFileSync('src/data/archived_leaderboard.json', JSON.stringify(rows, null, 2), 'utf8');
console.log('Saved src/data/archived_leaderboard.json successfully.');
