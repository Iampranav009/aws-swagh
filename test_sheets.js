import dotenv from 'dotenv';
dotenv.config();

const SHEET_ID = process.env.VITE_GOOGLE_SHEETS_ID || '1Di4lk_UcuF_3HBUj_p35N26h9fPJ4e0-lF9y2OI_WdM';
const SHEET_NAME = 'Form Responses 1';
const API_KEY = process.env.VITE_GOOGLE_SHEETS_API_KEY;

const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${encodeURIComponent(SHEET_NAME)}?key=${API_KEY}`;

async function run() {
  try {
    const res = await fetch(url);
    const result = await res.json();
    console.log('Columns: ', result.values ? result.values[0] : 'no values');
    if (result.values && result.values.length > 1) {
      console.log('Sample row: ', result.values[1]);
    }
  } catch (err) {
    console.error(err);
  }
}

run();
