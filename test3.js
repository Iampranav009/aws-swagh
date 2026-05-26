import fs from 'fs';
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
fetch(url).then(res => res.json()).then(result => {
  if (result.values) {
    console.log(result.values.slice(1, 10).map(row => ({
      name: row[1],
      alias: row[3],
      status: row[13],
      profileStatus: row[15]
    })));
  }
}).catch(console.error);
