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

async function inspect() {
  try {
    const res = await fetch(url);
    const result = await res.json();
    if (!result.values) {
      console.log('No values found');
      return;
    }
    const headers = result.values[0];
    const row = result.values[1];
    headers.forEach((h, i) => {
      console.log(`${i}: ${h} -> ${row[i]}`);
    });
  } catch (err) {
    console.error(err);
  }
}

inspect();
