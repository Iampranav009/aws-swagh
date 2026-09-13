import fs from 'fs';
import path from 'path';
import * as xlsx from 'xlsx';

const apiKey = 'AIzaSyBuPVUvhWC69PeR0sRkk6TW7TEP1k-VFfE';
const sheetIds = [
  '1Di4lk_UcuF_3HBUj_p35N26h9fPJ4e0-lF9y2OI_WdM', // Sheet 1: AWS Builder ID Form
  '1tFhuCC0NSlAv9PmYd53rQPdfVE5yynGm8fxoec8OFtA', // Sheet 2: National Level Hackathon
  '1hLsMKH8hH4Dcz73Y98w3PGrqxRgMBIMnZiwf5dJ5zcU', // Sheet 3: Feedback Form
  '1s3DzZQo2Ji_TjXeD040ijIo9fR2Q3d5uZocBDvTjQPM'  // Sheet 4: Expert Session Registration
];

// Helper functions for cleaning
function cleanEmail(email) {
  if (!email) return '';
  return email.toString().trim().toLowerCase();
}

function cleanPhone(phone) {
  if (!phone) return '';
  const cleaned = phone.toString().replace(/\D/g, '');
  if (cleaned.length === 10) return cleaned;
  if (cleaned.length > 10) return cleaned.slice(-10);
  return cleaned;
}

function cleanName(name) {
  if (!name) return '';
  // Remove non-alphabetic starting characters or extra spaces
  return name.toString().trim().toLowerCase().replace(/\s+/g, ' ');
}

function cleanAlias(alias) {
  if (!alias) return '';
  return alias.toString().trim().toLowerCase().replace(/^@/, '');
}

function titleCase(str) {
  if (!str) return '';
  return str.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

// Levenshtein distance
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

// Fuzzy name similarity
function isSimilarName(name1, name2) {
  if (!name1 || !name2) return false;
  const n1 = cleanName(name1);
  const n2 = cleanName(name2);
  if (n1 === n2) return true;

  // Exact Levenshtein distance
  const dist = levenshtein(n1, n2);
  if (dist <= 2) return true;

  // Words subset check (for names like "Zubair khan javed khan" vs "Zubair khan")
  const words1 = n1.split(' ').filter(w => w.length > 2);
  const words2 = n2.split(' ').filter(w => w.length > 2);
  if (words1.length >= 2 && words2.length >= 2) {
    const isSubset1 = words1.every(w => words2.includes(w));
    const isSubset2 = words2.every(w => words1.includes(w));
    if (isSubset1 || isSubset2) return true;
  }

  return false;
}

// Check for common ignore values
function isPlaceholder(val) {
  if (!val) return true;
  const v = val.toString().trim().toLowerCase();
  return ['-', 'na', 'n/a', 'no', 'none', 'nil', 'null', '1', '2', '3'].includes(v);
}

async function getSheetMetadata(sheetId) {
  const metaUrl = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}?key=${apiKey}`;
  const res = await fetch(metaUrl);
  const data = await res.json();
  if (data.error) {
    throw new Error(JSON.stringify(data.error));
  }
  return data;
}

async function getSheetValues(sheetId, sheetName) {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(sheetName)}?key=${apiKey}`;
  const res = await fetch(url);
  const data = await res.json();
  if (data.error) {
    throw new Error(JSON.stringify(data.error));
  }
  return data.values || [];
}

async function run() {
  console.log('--- Fetching Sheet Data from Google Sheets API ---');
  
  // Sheet 1: AWS Builder ID Form
  const meta1 = await getSheetMetadata(sheetIds[0]);
  const s1_name = meta1.sheets[0].properties.title;
  const s1_rows = await getSheetValues(sheetIds[0], s1_name);
  console.log(`Sheet 1 ("${meta1.properties.title}"): Fetched ${s1_rows.length} rows.`);

  // Sheet 2: Hackathon Form
  const meta2 = await getSheetMetadata(sheetIds[1]);
  const s2_name = meta2.sheets[0].properties.title;
  const s2_rows = await getSheetValues(sheetIds[1], s2_name);
  console.log(`Sheet 2 ("${meta2.properties.title}"): Fetched ${s2_rows.length} rows.`);

  // Sheet 3: Feedback Form
  const meta3 = await getSheetMetadata(sheetIds[2]);
  const s3_name = meta3.sheets[0].properties.title;
  const s3_rows = await getSheetValues(sheetIds[2], s3_name);
  console.log(`Sheet 3 ("${meta3.properties.title}"): Fetched ${s3_rows.length} rows.`);

  // Sheet 4: Expert Session Form
  const meta4 = await getSheetMetadata(sheetIds[3]);
  const s4_name = meta4.sheets[0].properties.title;
  const s4_rows = await getSheetValues(sheetIds[3], s4_name);
  console.log(`Sheet 4 ("${meta4.properties.title}"): Fetched ${s4_rows.length} rows.`);

  const rawRecords = [];

  // Parse Sheet 1
  // Headers: 0:Timestamp, 1:Name, 2:Do you have ID, 3:Alias, 4:Contact, 5:Referral, 12:Cleaned_Alias, 13:Status, 14:Name_on_AWS, 15:Profile_Status, 16:Country
  s1_rows.slice(1).forEach((row, idx) => {
    const name = row[1];
    if (isPlaceholder(name)) return;
    
    rawRecords.push({
      source: 'Sheet 1 (Builder ID)',
      name: name,
      alias: row[12] || row[3] || '',
      phone: row[4] || '',
      email: '',
      college: '',
      department: '',
      year: '',
      // Sheet 1 details
      s1_status: row[13] || '',
      s1_profile_status: row[15] || '',
      s1_name_on_aws: row[14] || '',
      s1_country: row[16] || '',
      s1_referral: row[5] || '',
      s1_alias_raw: row[3] || ''
    });
  });

  // Parse Sheet 2
  // Headers: 1:Team name, 2:Name member 1, 3:Email Address, 4:No members, 5:Email member 1, 6:Phone member 1, 
  // 7:Name member 2, 8:Email member 2, 9:Phone member 2, 10:Name member 3, 11:Email member 3, 12:Phone member 3,
  // 13:College, 14:Course, 15:Department, 16:Year, 17:Problem Statement Info, 20:Problem assigned, 21:Idea Description
  s2_rows.slice(1).forEach((row, idx) => {
    const college = row[13] || '';
    const course = row[14] || '';
    const department = row[15] || '';
    const year = row[16] || '';
    const teamName = row[1] || '';
    const problem = row[20] || row[17] || '';
    const idea = row[21] || '';

    // Member 1
    const m1_name = row[2];
    if (!isPlaceholder(m1_name)) {
      rawRecords.push({
        source: 'Sheet 2 (Hackathon)',
        name: m1_name,
        email: row[5] || row[3] || '',
        phone: row[6] || '',
        alias: '',
        college,
        department,
        year,
        s2_role: 'Team Leader (Member 1)',
        s2_team: teamName,
        s2_course: course,
        s2_problem: problem,
        s2_idea: idea
      });
    }

    // Member 2
    const m2_name = row[7];
    if (!isPlaceholder(m2_name)) {
      rawRecords.push({
        source: 'Sheet 2 (Hackathon)',
        name: m2_name,
        email: row[8] || '',
        phone: row[9] || '',
        alias: '',
        college,
        department,
        year,
        s2_role: 'Member 2',
        s2_team: teamName,
        s2_course: course,
        s2_problem: problem,
        s2_idea: idea
      });
    }

    // Member 3
    const m3_name = row[10];
    if (!isPlaceholder(m3_name)) {
      rawRecords.push({
        source: 'Sheet 2 (Hackathon)',
        name: m3_name,
        email: row[11] || '',
        phone: row[12] || '',
        alias: '',
        college,
        department,
        year,
        s2_role: 'Member 3',
        s2_team: teamName,
        s2_course: course,
        s2_problem: problem,
        s2_idea: idea
      });
    }
  });

  // Parse Sheet 3
  // Headers: 1:Email Address, 2:E-mail, 3:Full Name, 4:Phone no., 5:Name of collage, 6:Year of study, 7:Department, 8:Your review, 
  // 9:Session rate, 10:Speaker rate, 11:Cloud real-world help, 12:Future attend, 13:Topics next,
  // 15:Doc URL Cloud GenAI, 19:Doc URL GenAI 2026, 23:Doc URL SGBAU 2026
  s3_rows.slice(1).forEach((row, idx) => {
    const name = row[3];
    if (isPlaceholder(name)) return;

    rawRecords.push({
      source: 'Sheet 3 (Feedback Form)',
      name: name,
      email: row[2] || row[1] || '',
      phone: row[4] || '',
      alias: '',
      college: row[5] || '',
      department: row[7] || '',
      year: row[6] || '',
      // Feedback specific
      s3_review: row[8] || '',
      s3_session_rate: row[9] || '',
      s3_speaker_rate: row[10] || '',
      s3_cloud_help: row[11] || '',
      s3_future_attend: row[12] || '',
      s3_topics_next: row[13] || '',
      s3_doc_cloud_genai: row[15] || '',
      s3_doc_genai_2026: row[19] || '',
      s3_doc_sgbau_2026: row[23] || ''
    });
  });

  // Parse Sheet 4
  // Headers: 1:Email Address, 2:Full Name, 3:E-mail, 4:Phone no., 5:Department, 6:Year of study
  s4_rows.slice(1).forEach((row, idx) => {
    const name = row[2];
    if (isPlaceholder(name)) return;

    rawRecords.push({
      source: 'Sheet 4 (Expert Session Registration)',
      name: name,
      email: row[3] || row[1] || '',
      phone: row[4] || '',
      alias: '',
      college: '',
      department: row[5] || '',
      year: row[6] || '',
      s4_registered: 'Yes'
    });
  });

  console.log(`Parsed total raw student records: ${rawRecords.length}`);

  // ----------------------------------------------------
  // UNION-FIND (CONNECTED COMPONENTS) FOR CLUSTERING
  // ----------------------------------------------------
  const n = rawRecords.length;
  const parent = Array.from({ length: n }, (_, i) => i);

  function find(i) {
    if (parent[i] === i) return i;
    parent[i] = find(parent[i]);
    return parent[i];
  }

  function union(i, j) {
    const rootI = find(i);
    const rootJ = find(j);
    if (rootI !== rootJ) {
      parent[rootI] = rootJ;
    }
  }

  // Prep cleaner lookups
  const cleanedEmails = rawRecords.map(r => cleanEmail(r.email));
  const cleanedPhones = rawRecords.map(r => cleanPhone(r.phone));
  const cleanedAliases = rawRecords.map(r => cleanAlias(r.alias));
  const cleanedNames = rawRecords.map(r => cleanName(r.name));

  // Pass 1: Union exact email matches, exact phone matches, exact alias matches
  console.log('Grouping records by exact Email, Phone, or AWS Alias ID...');
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      // 1. Email match
      if (cleanedEmails[i] && cleanedEmails[i] === cleanedEmails[j]) {
        union(i, j);
        continue;
      }
      // 2. Phone match
      if (cleanedPhones[i] && cleanedPhones[i] === cleanedPhones[j]) {
        union(i, j);
        continue;
      }
      // 3. Alias match
      if (cleanedAliases[i] && cleanedAliases[i] === cleanedAliases[j]) {
        union(i, j);
        continue;
      }
    }
  }

  // Pass 2: Fuzzy Name Similarity matching for records without conflicting identifiers
  console.log('Grouping records by similar names (fuzzy name matching)...');
  
  // Reconstruct intermediate groups to check conflicts easily
  function getGroupDetails(rootIndex) {
    const emails = new Set();
    const phones = new Set();
    const aliases = new Set();
    const names = [];

    for (let i = 0; i < n; i++) {
      if (find(i) === rootIndex) {
        if (cleanedEmails[i]) emails.add(cleanedEmails[i]);
        if (cleanedPhones[i]) phones.add(cleanedPhones[i]);
        if (cleanedAliases[i]) aliases.add(cleanedAliases[i]);
        names.push(cleanedNames[i]);
      }
    }
    return { emails, phones, aliases, names };
  }

  // Check if two groups conflict on non-empty unique fields
  function hasConflict(detailsA, detailsB) {
    // Conflict on Email
    for (const e of detailsA.emails) {
      if (detailsB.emails.size > 0 && !detailsB.emails.has(e)) return true;
    }
    // Conflict on Phone
    for (const p of detailsA.phones) {
      if (detailsB.phones.size > 0 && !detailsB.phones.has(p)) return true;
    }
    // Conflict on Alias
    for (const a of detailsA.aliases) {
      if (detailsB.aliases.size > 0 && !detailsB.aliases.has(a)) return true;
    }
    return false;
  }

  let fuzzyMergesCount = 0;
  for (let i = 0; i < n; i++) {
    const rootI = find(i);
    const nameI = cleanedNames[i];
    if (!nameI) continue;

    for (let j = i + 1; j < n; j++) {
      const rootJ = find(j);
      if (rootI === rootJ) continue; // Already in same group
      
      const nameJ = cleanedNames[j];
      if (!nameJ) continue;

      if (isSimilarName(nameI, nameJ)) {
        // Retrieve group details
        const detailsI = getGroupDetails(rootI);
        const detailsJ = getGroupDetails(rootJ);

        if (!hasConflict(detailsI, detailsJ)) {
          union(rootI, rootJ);
          fuzzyMergesCount++;
        }
      }
    }
  }
  console.log(`Perform fuzzy merges for ${fuzzyMergesCount} similar name entries without conflicts.`);

  // ----------------------------------------------------
  // CONSOLIDATE AND MERGE USER DATA
  // ----------------------------------------------------
  const groups = {};
  for (let i = 0; i < n; i++) {
    const root = find(i);
    if (!groups[root]) {
      groups[root] = [];
    }
    groups[root].push(rawRecords[i]);
  }

  console.log(`Deduplication finished. Unique students found: ${Object.keys(groups).length}`);

  const mergedStudents = [];

  for (const root in groups) {
    const records = groups[root];
    
    // Choose consensus fields
    // Name: pick the longest, well-formatted name
    let bestName = '';
    records.forEach(r => {
      const n = (r.name || '').trim();
      if (n.length > bestName.length) {
        bestName = n;
      }
    });
    bestName = titleCase(bestName);

    // Email
    let email = '';
    for (const r of records) {
      if (r.email) {
        email = r.email.trim();
        break;
      }
    }

    // Phone
    let phone = '';
    for (const r of records) {
      if (r.phone) {
        phone = r.phone.trim();
        break;
      }
    }

    // Alias
    let alias = '';
    for (const r of records) {
      if (r.alias) {
        alias = cleanAlias(r.alias);
        break;
      }
    }

    // College
    let college = '';
    for (const r of records) {
      if (r.college && !isPlaceholder(r.college)) {
        college = titleCase(r.college.trim());
        break;
      }
    }

    // Department
    let department = '';
    for (const r of records) {
      if (r.department && !isPlaceholder(r.department)) {
        department = titleCase(r.department.trim());
        break;
      }
    }

    // Year
    let year = '';
    for (const r of records) {
      if (r.year && !isPlaceholder(r.year)) {
        year = r.year.trim().toLowerCase();
        break;
      }
    }
    // Clean up Year representation (e.g. "2nd year" -> "Second Year" or "2nd Year")
    if (year) {
      year = titleCase(year);
    }

    // Accumulate other fields
    let s1_status = '';
    let s1_profile_status = '';
    let s1_name_on_aws = '';
    let s1_country = '';
    let s1_referral = '';
    let s1_alias_raw = '';

    let s2_role = '';
    let s2_team = '';
    let s2_course = '';
    let s2_problem = '';
    let s2_idea = '';

    let s3_review = '';
    let s3_session_rate = '';
    let s3_speaker_rate = '';
    let s3_cloud_help = '';
    let s3_future_attend = '';
    let s3_topics_next = '';
    let s3_doc_cloud_genai = '';
    let s3_doc_genai_2026 = '';
    let s3_doc_sgbau_2026 = '';

    let s4_registered = 'No';

    const sourcesSet = new Set();

    records.forEach(r => {
      sourcesSet.add(r.source);
      if (r.source === 'Sheet 1 (Builder ID)') {
        s1_status = r.s1_status || s1_status;
        s1_profile_status = r.s1_profile_status || s1_profile_status;
        s1_name_on_aws = r.s1_name_on_aws || s1_name_on_aws;
        s1_country = r.s1_country || s1_country;
        s1_referral = r.s1_referral || s1_referral;
        s1_alias_raw = r.s1_alias_raw || s1_alias_raw;
      }
      if (r.source === 'Sheet 2 (Hackathon)') {
        s2_role = r.s2_role || s2_role;
        s2_team = r.s2_team || s2_team;
        s2_course = r.s2_course || s2_course;
        s2_problem = r.s2_problem || s2_problem;
        s2_idea = r.s2_idea || s2_idea;
      }
      if (r.source === 'Sheet 3 (Feedback Form)') {
        s3_review = r.s3_review || s3_review;
        s3_session_rate = r.s3_session_rate || s3_session_rate;
        s3_speaker_rate = r.s3_speaker_rate || s3_speaker_rate;
        s3_cloud_help = r.s3_cloud_help || s3_cloud_help;
        s3_future_attend = r.s3_future_attend || s3_future_attend;
        s3_topics_next = r.s3_topics_next || s3_topics_next;
        s3_doc_cloud_genai = r.s3_doc_cloud_genai || s3_doc_cloud_genai;
        s3_doc_genai_2026 = r.s3_doc_genai_2026 || s3_doc_genai_2026;
        s3_doc_sgbau_2026 = r.s3_doc_sgbau_2026 || s3_doc_sgbau_2026;
      }
      if (r.source === 'Sheet 4 (Expert Session Registration)') {
        s4_registered = 'Yes';
      }
    });

    mergedStudents.push({
      'Full Name': bestName,
      'Email Address': email,
      'Phone Number': phone,
      'College Name': college,
      'AWS Builder ID Alias (Alice ID)': alias ? `@${alias}` : '',
      'Department': department,
      'Year of Study': year,
      
      // Sheet 1 details
      'AWS Builder ID Status': s1_status,
      'AWS Profile Status': s1_profile_status,
      'AWS Name on Profile': s1_name_on_aws,
      'AWS Country': s1_country,
      'Referral Code Used': s1_referral,
      'AWS Alias (Raw Submissions)': s1_alias_raw,

      // Sheet 2 details
      'Hackathon Team Name': s2_team,
      'Hackathon Member Role': s2_role,
      'Hackathon Course Name': s2_course,
      'Hackathon Assigned Problem Statement': s2_problem,
      'Hackathon Brief Idea': s2_idea,

      // Sheet 3 details
      'Feedback Review': s3_review,
      'Feedback Rating (Overall)': s3_session_rate,
      'Feedback Speaker Rating': s3_speaker_rate,
      'Feedback Real World Cloud Helpfulness': s3_cloud_help,
      'Feedback Future Attendance Interest': s3_future_attend,
      'Feedback Topics Requested': s3_topics_next,
      'Feedback Merged Doc URL (Cloud & GenAI)': s3_doc_cloud_genai,
      'Feedback Merged Doc URL (GenAI 2026)': s3_doc_genai_2026,
      'Feedback Merged Doc URL (SGBAU 2026)': s3_doc_sgbau_2026,

      // Sheet 4 details
      'Registered for Expert Session': s4_registered,

      // Metadata
      'Participated In Sheets': Array.from(sourcesSet).join(', '),
      'Total Forms Submitted': records.length
    });
  }

  // SORT ALPHABETICALLY BY NAME
  console.log('Sorting students alphabetically by name...');
  mergedStudents.sort((a, b) => {
    const nameA = (a['Full Name'] || '').toLowerCase();
    const nameB = (b['Full Name'] || '').toLowerCase();
    if (nameA < nameB) return -1;
    if (nameA > nameB) return 1;
    return 0;
  });

  // ----------------------------------------------------
  // WRITE OUTPUT FILES
  // ----------------------------------------------------
  const targetDir = 'AWS club JDID name folder';
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  const xlsxPath = path.join(targetDir, 'student_mega_sheet.xlsx');
  const csvPath = path.join(targetDir, 'student_mega_sheet.csv');

  console.log(`Writing consolidated Excel sheet to ${xlsxPath}...`);
  const wb = xlsx.utils.book_new();
  const ws = xlsx.utils.json_to_sheet(mergedStudents);
  xlsx.utils.book_append_sheet(wb, ws, "Combined Students");
  xlsx.writeFile(wb, xlsxPath);

  console.log(`Writing consolidated CSV sheet to ${csvPath}...`);
  const csvContent = xlsx.utils.sheet_to_csv(ws);
  fs.writeFileSync(csvPath, csvContent, 'utf8');

  console.log('\n======================================================');
  console.log('SUCCESS! Mega Sheet created and saved in AWS club JDID name folder.');
  console.log(`Total Deduplicated Students: ${mergedStudents.length}`);
  console.log('======================================================');
}

run().catch(err => {
  console.error('Fatal error running merge script:', err);
});
