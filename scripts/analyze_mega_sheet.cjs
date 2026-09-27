const fs = require('fs');
const readline = require('readline');

async function analyzeCsv() {
  const filePath = './AWS club JDID name folder/student_mega_sheet.csv';
  const fileStream = fs.createReadStream(filePath);
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  let header = null;
  let count = 0;
  const aliasMap = new Map(); // cleanAlias -> { name, email, rawAlias }

  for await (const line of rl) {
    if (!line.trim()) continue;
    if (!header) {
      header = line.split(',');
      continue;
    }
    count++;
    
    // CSV parser handling quoted strings
    const cells = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        cells.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    cells.push(current.trim());

    const name = cells[0] || '';
    const email = cells[1] || '';
    const aliasCol1 = (cells[4] || '').replace(/^"|"$/g, '').trim();
    const aliasCol2 = (cells[12] || '').replace(/^"|"$/g, '').trim();
    const candidateAliases = [aliasCol1, aliasCol2].filter(Boolean);
    for (const a of candidateAliases) {
      const clean = a.toUpperCase().replace(/[^A-Z0-9]/g, '');
      if (clean && clean.length >= 2) {
        const existing = aliasMap.get(clean);
        if (!existing) {
          aliasMap.set(clean, {
            name: name || 'Participant',
            email: email || '',
            rawAlias: a,
            source: 'student_mega_sheet.csv'
          });
        } else {
          // If we find a better name/email later in the sheet, enrich it
          if ((!existing.name || existing.name === 'Participant') && name) {
            existing.name = name;
          }
          if (!existing.email && email) {
            existing.email = email;
          }
        }
      }
    }
  }

  console.log('Total CSV rows:', count);
  console.log('Unique ALICE IDs extracted:', aliasMap.size);
  console.log('Sample 10 items:');
  const samples = Array.from(aliasMap.entries()).slice(0, 10);
  for (const [code, info] of samples) {
    console.log(`  ${code} => ${info.name} (${info.rawAlias}, ${info.email || 'no email'})`);
  }
}

analyzeCsv().catch(console.error);
