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
  console.log('Columns:', result.values ? result.values[0] : 'no values');
}).catch(console.error);
