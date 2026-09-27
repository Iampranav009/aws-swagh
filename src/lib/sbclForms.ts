import { supabase } from './supabase';

export interface PublicSbclForm {
  formSlug: string;
  sbclCode: string;
  displayName: string;
  referralCode: string;
  sourceName: string;
  builderSignupUrl?: string;
}

export async function loadPublicSbclForm(slug: string): Promise<PublicSbclForm> {
  const { data, error } = await supabase.rpc('get_public_sbcl_form', { p_slug: slug });
  const row = Array.isArray(data) ? data[0] : null;
  if (error || !row) throw new Error(error?.message || 'This signup form is not active.');
  return {
    formSlug: row.form_slug,
    sbclCode: row.sbcl_code,
    displayName: row.display_name,
    referralCode: row.referral_code,
    sourceName: row.source_name,
    builderSignupUrl: row.builder_signup_url || '',
  };
}

export async function submitSbclForm(slug: string, values: {
  name: string; email: string; hasBuilderId: boolean; alias: string; contact: string;
  builderCentralId?: string; nameOnAws?: string; country?: string;
}): Promise<number> {
  const { data, error } = await supabase.rpc('submit_sbcl_form', {
    p_slug: slug, p_name: values.name, p_email: values.email,
    p_has_builder_id: values.hasBuilderId, p_alias: values.alias, p_contact: values.contact,
    p_builder_central_id: values.builderCentralId || null,
    p_name_on_aws: values.nameOnAws || values.name,
    p_country: values.country || 'India',
  });
  if (error) throw new Error(error.message);
  return Number(data);
}

export function buildSbclFormLink(codeOrAlias: string): string {
  const origin = typeof window === 'undefined' ? '' : window.location.origin;
  const clean = (codeOrAlias || '').replace(/^@/, '').toLowerCase().trim();
  return `${origin}/f/${clean}`;
}
