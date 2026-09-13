import fs from 'fs';

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

async function analyzeAnomalies() {
  try {
    const res = await fetch(url);
    const result = await res.json();
    const rows = result.values || [];
    console.log(`Total rows in sheet: ${rows.length}`);
    
    // Slice off headers, examine the first 350-400 rows
    const dataRows = rows.slice(1);
    
    console.log("\n--- Checking for spaces in Alias (row[3]) ---");
    let spaceCount = 0;
    dataRows.forEach((row, i) => {
      const alias = row[3] || '';
      if (alias.includes(' ')) {
        console.log(`Row ${i+2}: Name="${row[1]}", Alias="${row[3]}", Contact="${row[4]}"`);
        spaceCount++;
      }
    });
    console.log(`Total with spaces in alias: ${spaceCount}`);

    console.log("\n--- Checking for potential 'double address' or duplicate contact numbers (row[4]) ---");
    const contacts = {};
    dataRows.forEach((row, i) => {
      const contact = (row[4] || '').trim();
      if (contact && contact.length > 5) {
        if (!contacts[contact]) contacts[contact] = [];
        contacts[contact].push({ index: i+2, name: row[1], alias: row[3] });
      }
    });
    let doubleContactCount = 0;
    for (const [contact, entries] of Object.entries(contacts)) {
      if (entries.length > 1) {
        console.log(`Contact ${contact} appeared ${entries.length} times:`);
        entries.forEach(e => console.log(`  Row ${e.index}: Name="${e.name}", Alias="${e.alias}"`));
        doubleContactCount++;
      }
    }
    console.log(`Total contacts with double/multiple submissions: ${doubleContactCount}`);

    console.log("\n--- Checking for potential 'double' alias submissions (row[3]) ---");
    const aliases = {};
    dataRows.forEach((row, i) => {
      const alias = (row[3] || '').trim().toLowerCase().replace(/^@/, '');
      if (alias) {
        if (!aliases[alias]) aliases[alias] = [];
        aliases[alias].push({ index: i+2, name: row[1], contact: row[4] });
      }
    });
    let doubleAliasCount = 0;
    for (const [alias, entries] of Object.entries(aliases)) {
      if (entries.length > 1) {
        console.log(`Alias ${alias} appeared ${entries.length} times:`);
        entries.forEach(e => console.log(`  Row ${e.index}: Name="${e.name}", Contact="${e.contact}"`));
        doubleAliasCount++;
      }
    }
    console.log(`Total aliases with double/multiple submissions: ${doubleAliasCount}`);

    console.log("\n--- Checking if Name on AWS (row[14]) doesn't match Name (row[1]) ---");
    let mismatchCount = 0;
    dataRows.slice(0, 350).forEach((row, i) => {
      const name = (row[1] || '').trim().toLowerCase();
      const nameOnAws = (row[14] || '').trim().toLowerCase();
      const alias = (row[3] || '').trim().toLowerCase().replace(/^@/, '');
      
      // If we have both names and they are totally different
      if (name && nameOnAws && name !== nameOnAws) {
        // Let's see if one contains the other or if they are totally mismatched
        const nameParts = name.split(/\s+/);
        const awsParts = nameOnAws.split(/\s+/);
        const matchesAnyPart = nameParts.some(p => nameOnAws.includes(p)) || awsParts.some(p => name.includes(p));
        
        if (!matchesAnyPart) {
          console.log(`Row ${i+2}: Name in sheet: "${row[1]}", Name on AWS: "${row[14]}", Alias="${row[3]}"`);
          mismatchCount++;
        }
      }
    });
    console.log(`Total completely mismatched names: ${mismatchCount}`);

  } catch (err) {
    console.error(err);
  }
}

analyzeAnomalies();
