import * as XLSX from 'xlsx';
import type { SheetUser } from './sheets';
import type { SubReferralLink } from './subReferrals';

export interface ReferralIdentity {
  raw: string;
  sbclCode: string;
  subReferralCode: string;
}

export function sanitizeReferralPart(value: string, maxLength = 8): string {
  return (value || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, maxLength);
}

export function parseReferralCode(value: string): ReferralIdentity {
  const raw = sanitizeReferralPart(value, 35);
  return {
    raw,
    sbclCode: raw.slice(0, 3),
    subReferralCode: raw.slice(3),
  };
}

export function buildReferralCode(sbclCode: string, subReferralCode = ''): string {
  const owner = sanitizeReferralPart(sbclCode, 3);
  const sub = sanitizeReferralPart(subReferralCode, 32);
  return `${owner}${sub}`;
}

/** Creates the SBCL prefix from the first three letters of the email username. */
export function deriveSbclCodeFromEmail(email: string): string {
  const username = (email.split('@')[0] || '').toUpperCase().replace(/[^A-Z]/g, '');
  return username.slice(0, 3);
}

/** Example: SAR + PRIYA + 482 => SARPRIYA482. */
export function generateSubReferralCode(sbclCode: string, referralName: string): string {
  const name = sanitizeReferralPart(referralName, 5).replace(/[0-9]/g, '');
  if (!name) return buildReferralCode(sbclCode);
  const values = new Uint16Array(1);
  crypto.getRandomValues(values);
  const digits = String(100 + (values[0] % 900));
  return buildReferralCode(sbclCode, `${name}${digits}`);
}

export function buildReferralLink(code: string): string {
  const origin = typeof window === 'undefined' ? '' : window.location.origin;
  return `${origin}/f/${buildReferralCode(code.slice(0, 3), code.slice(3)).toLowerCase()}`;
}

export interface CategorizedReferral extends SheetUser {
  isDirect: boolean;
  subReferralCode: string;
  subReferralName: string;
  referralType: 'Direct' | 'Sub-referral';
  isValid: boolean;
  flagReason?: string;
  status: 'valid' | 'existing_in_record' | 'duplicate';
}

export interface SubReferralNetworkMember {
  code: string;
  name: string;
  link: string;
  referrals: CategorizedReferral[];
  referralCount: number;
  flaggedCount: number;
  points: number;
  isRegistered: boolean;
}

export function getSbclSignups(users: SheetUser[], sbclCode: string): SheetUser[] {
  const owner = sanitizeReferralPart(sbclCode, 3).toUpperCase();
  return users.filter((user) => {
    if (user.sbclCode && user.sbclCode.toUpperCase() === owner) return true;
    return parseReferralCode(user.referralCode).sbclCode.toUpperCase() === owner;
  });
}

export function categorizeSbclReferrals(
  users: SheetUser[],
  sbclCode: string,
  subLinks: SubReferralLink[] = [],
  sbclName = ''
): {
  allSignups: CategorizedReferral[];
  directSignups: CategorizedReferral[];
  subReferralSignups: CategorizedReferral[];
  subNetwork: SubReferralNetworkMember[];
} {
  const rawSbclSignups = getSbclSignups(users, sbclCode);
  const owner = sanitizeReferralPart(sbclCode, 3).toUpperCase();

  // Create lookups for registered sub-referrals
  const subByCode = new Map<string, SubReferralLink>();
  const subByName = new Map<string, SubReferralLink>();

  subLinks.forEach((link) => {
    const fullCode = link.code.toUpperCase().trim();
    subByCode.set(fullCode, link);
    if (fullCode.startsWith(owner) && fullCode.length > owner.length) {
      subByCode.set(fullCode.slice(owner.length), link);
    }
    if (link.name) {
      subByName.set(link.name.toLowerCase().trim(), link);
    }
  });

  const seenAliases = new Set<string>();

  const allSignups: CategorizedReferral[] = rawSbclSignups.map((user) => {
    const rawRef = (user.referralCode || '').toUpperCase().trim();
    const parsed = parseReferralCode(rawRef);
    const refName = (user.referrerName || '').trim();
    const refNameLower = refName.toLowerCase();

    // Check if directly attributed to SBCL lead
    const isDirectByName =
      refNameLower === 'sbcl' ||
      refNameLower === 'direct' ||
      refNameLower === 'direct sbcl' ||
      (sbclName && refNameLower === sbclName.toLowerCase().trim());

    const isDirectByCode =
      rawRef === owner ||
      rawRef === '' ||
      (parsed.sbclCode === owner && !parsed.subReferralCode);

    // If registered as a sub-referrer code or has sub-referral suffix or explicit sub-referrer name
    const matchingLink =
      subByCode.get(rawRef) ||
      (parsed.subReferralCode ? subByCode.get(parsed.subReferralCode) : undefined) ||
      (refName ? subByName.get(refNameLower) : undefined);

    let isDirect = false;
    let subReferralCode = '';
    let subReferralName = '';

    if (matchingLink) {
      isDirect = false;
      subReferralCode = matchingLink.code;
      subReferralName = matchingLink.name;
    } else if (parsed.subReferralCode && parsed.subReferralCode.length > 0) {
      isDirect = false;
      subReferralCode = parsed.subReferralCode;
      subReferralName = refName || `Sub-referrer ${parsed.subReferralCode}`;
    } else if (refName && !isDirectByName) {
      isDirect = false;
      subReferralCode = rawRef !== owner ? rawRef : '';
      subReferralName = refName;
    } else if (isDirectByName || isDirectByCode) {
      isDirect = true;
      subReferralCode = '';
      subReferralName = sbclName || 'You (Direct SBCL)';
    } else {
      // Fallback
      isDirect = true;
      subReferralCode = '';
      subReferralName = sbclName || 'You (Direct SBCL)';
    }

    const cleanAlias = (user.alias || '').toUpperCase().trim();
    let isValid = user.isValid !== false;
    let flagReason = user.flagReason || '';
    let status: 'valid' | 'existing_in_record' | 'duplicate' = 'valid';

    if (!isValid || flagReason) {
      const lowerReason = flagReason.toLowerCase();
      if (lowerReason.includes('record') || lowerReason.includes('existing') || lowerReason.includes('sheet')) {
        status = 'existing_in_record';
      } else {
        status = 'duplicate';
      }
    } else if (cleanAlias && seenAliases.has(cleanAlias)) {
      isValid = false;
      status = 'duplicate';
      flagReason = 'Already signed up / duplicate alias';
    }

    if (cleanAlias) {
      seenAliases.add(cleanAlias);
    }

    return {
      ...user,
      isDirect,
      subReferralCode,
      subReferralName,
      referralType: isDirect ? ('Direct' as const) : ('Sub-referral' as const),
      isValid,
      flagReason,
      status,
    };
  });

  const directSignups = allSignups.filter((item) => item.isDirect);
  const subReferralSignups = allSignups.filter((item) => !item.isDirect);

  // Group sub-referrals network
  const networkMap = new Map<string, SubReferralNetworkMember>();

  // 1. Seed with registered sub-referrals
  subLinks.forEach((link) => {
    const key = link.code.toUpperCase().trim();
    networkMap.set(key, {
      code: link.code,
      name: link.name,
      link: link.link || `/f/${link.code.toLowerCase()}`,
      referrals: [],
      referralCount: 0,
      flaggedCount: 0,
      points: 0,
      isRegistered: true,
    });
  });

  // 2. Associate sub-referral signups
  subReferralSignups.forEach((user) => {
    const key = (user.subReferralCode || user.subReferralName).toUpperCase().trim();
    let member = networkMap.get(key);

    if (!member) {
      // Try to find by matching code or name
      for (const m of networkMap.values()) {
        if (
          m.code.toUpperCase() === user.subReferralCode.toUpperCase() ||
          (user.subReferralName && m.name.toLowerCase() === user.subReferralName.toLowerCase())
        ) {
          member = m;
          break;
        }
      }
    }

    if (!member) {
      // Create ad-hoc network member from signup record
      const code = user.subReferralCode || user.subReferralName || 'SUB';
      const name = user.subReferralName || `Sub-referrer ${code}`;
      member = {
        code,
        name,
        link: `/f/${code.toLowerCase()}`,
        referrals: [],
        referralCount: 0,
        flaggedCount: 0,
        points: 0,
        isRegistered: false,
      };
      networkMap.set(key, member);
    }

    member.referrals.push(user);
    const validOnes = member.referrals.filter((r) => r.isValid);
    member.referralCount = validOnes.length;
    member.flaggedCount = member.referrals.length - validOnes.length;
    member.points = validOnes.length * 15;
  });

  const subNetwork = [...networkMap.values()].sort((a, b) => b.referralCount - a.referralCount);

  return {
    allSignups,
    directSignups,
    subReferralSignups,
    subNetwork,
  };
}

export function exportReferralsListToExcel(
  signups: CategorizedReferral[],
  filename: string,
  sheetTitle = 'Referrals'
) {
  const rows = signups.map((user) => ({
    'Referral Type': user.isDirect ? 'Direct SBCL' : 'Sub-Referral',
    'Referred By': user.isDirect ? 'You (Direct SBCL)' : user.subReferralName || user.subReferralCode || 'Sub-referrer',
    'Sub-Referral Code': user.subReferralCode || '—',
    'Full Name': user.name || '—',
    'Email Address': user.email || '—',
    'Contact Number': user.contact || '—',
    'AWS Alias ID': user.rawAlias || user.alias || '—',
    'AWS Builder ID': user.builderCentralId === 'NO' ? 'No' : (user.builderCentralId || '—'),
    'Name on AWS': user.nameOnAws || '—',
    'Submission Date': user.submittedAt ? new Date(user.submittedAt).toLocaleString() : '—',
    Source: user.source === 'native-form' ? 'Native Form' : 'Google Sheet',
  }));

  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet(rows);
  worksheet['!cols'] = [
    { wch: 16 }, // Referral Type
    { wch: 24 }, // Referred By
    { wch: 20 }, // Sub-Referral Code
    { wch: 24 }, // Full Name
    { wch: 30 }, // Email Address
    { wch: 18 }, // Contact Number
    { wch: 20 }, // AWS Alias ID
    { wch: 22 }, // AWS Builder ID
    { wch: 22 }, // Name on AWS
    { wch: 22 }, // Submission Date
    { wch: 16 }, // Source
  ];
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetTitle.slice(0, 31));
  XLSX.writeFile(workbook, filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`);
}

export function exportAllNetworkToExcel({
  sbclCode,
  allSignups,
  directSignups,
  subReferralSignups,
  subNetwork,
}: {
  sbclCode: string;
  allSignups: CategorizedReferral[];
  directSignups: CategorizedReferral[];
  subReferralSignups: CategorizedReferral[];
  subNetwork: SubReferralNetworkMember[];
}) {
  const workbook = XLSX.utils.book_new();

  // Helper to map rows
  const mapUserRows = (list: CategorizedReferral[]) =>
    list.map((user) => ({
      'Referral Type': user.isDirect ? 'Direct SBCL' : 'Sub-Referral',
      'Referred By': user.isDirect ? 'You (Direct SBCL)' : user.subReferralName || user.subReferralCode || 'Sub-referrer',
      'Sub-Referral Code': user.subReferralCode || '—',
      'Full Name': user.name || '—',
      'Email Address': user.email || '—',
      'Contact Number': user.contact || '—',
      'AWS Alias ID': user.rawAlias || user.alias || '—',
      'AWS Builder ID': user.builderCentralId === 'NO' ? 'No' : (user.builderCentralId || '—'),
      'Submission Date': user.submittedAt ? new Date(user.submittedAt).toLocaleString() : '—',
    }));

  const colWidths = [
    { wch: 16 },
    { wch: 24 },
    { wch: 20 },
    { wch: 24 },
    { wch: 30 },
    { wch: 18 },
    { wch: 20 },
    { wch: 22 },
    { wch: 22 },
  ];

  // Sheet 1: All Referrals
  const allWs = XLSX.utils.json_to_sheet(mapUserRows(allSignups));
  allWs['!cols'] = colWidths;
  XLSX.utils.book_append_sheet(workbook, allWs, 'All Referrals');

  // Sheet 2: Direct Referrals
  const directWs = XLSX.utils.json_to_sheet(mapUserRows(directSignups));
  directWs['!cols'] = colWidths;
  XLSX.utils.book_append_sheet(workbook, directWs, 'Direct Referrals');

  // Sheet 3: Sub-Referral Referrals
  const subWs = XLSX.utils.json_to_sheet(mapUserRows(subReferralSignups));
  subWs['!cols'] = colWidths;
  XLSX.utils.book_append_sheet(workbook, subWs, 'Sub-Referral Network');

  // Sheet 4: Sub-Referrers Roster
  const rosterRows = subNetwork.map((item, idx) => ({
    Rank: `#${idx + 1}`,
    'Sub-Referrer Name': item.name,
    'Sub-Referral Code': item.code,
    'Personal Form Link': item.link,
    'Total Referrals': item.referralCount,
    'Points Earned': item.points,
    Status: item.isRegistered ? 'Registered Team' : 'Signup Attributed',
  }));
  const rosterWs = XLSX.utils.json_to_sheet(rosterRows);
  rosterWs['!cols'] = [
    { wch: 8 },
    { wch: 24 },
    { wch: 20 },
    { wch: 36 },
    { wch: 18 },
    { wch: 16 },
    { wch: 20 },
  ];
  XLSX.utils.book_append_sheet(workbook, rosterWs, 'Sub-Referrers Roster');

  XLSX.writeFile(workbook, `${sbclCode}-referral-network-master.xlsx`);
}

export function exportSubReferralRosterToExcel(
  subNetwork: SubReferralNetworkMember[],
  sbclCode: string
) {
  const workbook = XLSX.utils.book_new();
  const rows = subNetwork.map((item, idx) => ({
    Rank: `#${idx + 1}`,
    'Sub-Referrer Name': item.name,
    'Sub-Referral Code': item.code,
    'Personal Form Link': item.link,
    'Total Referrals': item.referralCount,
    'Points Earned': item.points,
    Status: item.isRegistered ? 'Registered Team' : 'Signup Attributed',
  }));
  const worksheet = XLSX.utils.json_to_sheet(rows);
  worksheet['!cols'] = [
    { wch: 8 },
    { wch: 24 },
    { wch: 20 },
    { wch: 36 },
    { wch: 18 },
    { wch: 16 },
    { wch: 20 },
  ];
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Sub-Referrers');
  XLSX.writeFile(workbook, `${sbclCode}-sub-referrers-roster.xlsx`);
}
