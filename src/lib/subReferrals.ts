import { collection, doc, getDocs, query, serverTimestamp, where, writeBatch } from 'firebase/firestore';
import { db } from './firebase';
import { buildReferralLink, generateSubReferralCode } from './referrals';

export interface SubReferralLink {
  code: string;
  name: string;
  sbclCode: string;
  link: string;
  createdBy: string;
}

export async function loadSubReferralLinks(sbclCode: string): Promise<SubReferralLink[]> {
  const snapshot = await getDocs(query(collection(db, 'sbclSubReferrals'), where('sbclCode', '==', sbclCode)));
  return snapshot.docs.map((item) => item.data() as SubReferralLink).sort((a, b) => a.name.localeCompare(b.name));
}

export async function createSubReferralLinks(sbclCode: string, names: string[], createdBy: string): Promise<SubReferralLink[]> {
  const existing = await loadSubReferralLinks(sbclCode);
  const used = new Set(existing.map((item) => item.code));
  const uniqueNames = [...new Set(names.map((name) => name.trim()).filter(Boolean))];
  const records = uniqueNames.map((name) => {
    let code = generateSubReferralCode(sbclCode, name);
    while (used.has(code)) code = generateSubReferralCode(sbclCode, name);
    used.add(code);
    return { code, name, sbclCode, link: buildReferralLink(code), createdBy };
  });
  const batch = writeBatch(db);
  records.forEach((record) => batch.set(doc(db, 'sbclSubReferrals', record.code), { ...record, createdAt: serverTimestamp() }));
  await batch.commit();
  return [...existing, ...records].sort((a, b) => a.name.localeCompare(b.name));
}
