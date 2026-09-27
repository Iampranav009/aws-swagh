import { supabase } from './supabase';
import { generateSubReferralCode } from './referrals';
import { buildSbclFormLink } from './sbclForms';

export interface SubReferralLink { code: string; name: string; sbclCode: string; link: string; createdBy: string; }
export async function loadSubReferralLinks(sbclCode: string): Promise<SubReferralLink[]> {
  const { data, error } = await supabase.from('sub_referrals').select('code,name,sbcl_code,link,created_by').eq('sbcl_code', sbclCode).order('name');
  if (error) throw error;
  return (data || []).map((row) => ({
    code: row.code,
    name: row.name,
    sbclCode: row.sbcl_code,
    link: buildSbclFormLink(row.code),
    createdBy: row.created_by,
  }));
}
export async function createSubReferralLinks(sbclCode: string, names: string[], createdBy: string): Promise<SubReferralLink[]> {
  const existing = await loadSubReferralLinks(sbclCode);
  const used = new Set(existing.map((item) => item.code));
  const records = [...new Set(names.map((name) => name.trim()).filter(Boolean))].map((name) => {
    let code = generateSubReferralCode(sbclCode, name); while (used.has(code)) code = generateSubReferralCode(sbclCode, name); used.add(code);
    return { code, name, sbcl_code: sbclCode, link: buildSbclFormLink(code), created_by: createdBy };
  });
  if (records.length) { const { error } = await supabase.from('sub_referrals').insert(records); if (error) throw error; }
  return loadSubReferralLinks(sbclCode);
}
