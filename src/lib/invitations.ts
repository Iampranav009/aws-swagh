import { supabase } from './supabase';
import { deriveSbclCodeFromEmail } from './referrals';

export interface SbclInvite { email: string; sbclCode: string; referralCode: string; status: 'pending' | 'verified'; invitedBy: string | null; }
export interface GeneratedSbclInvite { sbclCode: string; inviteUrl: string; expiresAt: string; }
export interface SbclInvitePreview { email: string; sbclCode: string; expiresAt: string; }
const normalizeEmail = (email: string) => email.trim().toLowerCase();

function generateToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes)).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
}

export async function hashInviteToken(token: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
  return [...new Uint8Array(digest)].map((value) => value.toString(16).padStart(2, '0')).join('');
}

function buildPrefixCandidates(email: string): string[] {
  const letters = (email.split('@')[0] || '').toUpperCase().replace(/[^A-Z]/g, '');
  const candidates = new Set<string>();
  if (letters.length >= 3) candidates.add(letters.slice(0, 3));
  for (let i = 0; i < letters.length - 2; i++) for (let j = i + 1; j < letters.length - 1; j++) for (let k = j + 1; k < letters.length; k++) {
    candidates.add(`${letters[i]}${letters[j]}${letters[k]}`);
    if (candidates.size >= 30) return [...candidates];
  }
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  while (candidates.size < 45) {
    const bytes = new Uint8Array(3); crypto.getRandomValues(bytes);
    candidates.add([...bytes].map((value) => alphabet[value % 26]).join(''));
  }
  return [...candidates];
}

export async function inviteSbcl(email: string, invitedBy: string): Promise<GeneratedSbclInvite> {
  const normalizedEmail = normalizeEmail(email);
  const preferredCode = deriveSbclCodeFromEmail(normalizedEmail);
  if (!normalizedEmail.includes('@') || preferredCode.length !== 3) throw new Error('Enter an email whose username contains at least three letters.');
  const { data: existing, error: existingError } = await supabase.from('sbcl_invites').select('email,sbcl_code,status').eq('email', normalizedEmail).maybeSingle();
  if (existingError) throw existingError;
  if (existing?.status === 'verified') throw new Error('This email already belongs to a verified SBCL.');
  const candidates = [...new Set([existing?.sbcl_code, ...buildPrefixCandidates(normalizedEmail)].filter(Boolean) as string[])];
  const { data: usedRows, error: usedError } = await supabase.from('sbcl_invites').select('email,sbcl_code').in('sbcl_code', candidates);
  if (usedError) throw usedError;
  const used = new Map((usedRows || []).map((row) => [row.sbcl_code, row.email]));
  const code = candidates.find((candidate) => !used.has(candidate) || used.get(candidate) === normalizedEmail);
  if (!code) throw new Error('Could not generate a unique SBCL prefix. Please try again.');
  const token = generateToken();
  const tokenHash = await hashInviteToken(token);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const { error: inviteError } = await supabase.from('sbcl_invites').upsert({
    email: normalizedEmail,
    sbcl_code: code,
    status: 'pending',
    invited_by: invitedBy,
    verified_user_id: null,
    verified_at: null,
    invite_token_hash: tokenHash,
    invite_expires_at: expiresAt,
    invite_used_at: null,
  }, { onConflict: 'email' });
  if (inviteError) throw inviteError;
  return { sbclCode: code, inviteUrl: `${window.location.origin}/sbcl/verify?token=${encodeURIComponent(token)}`, expiresAt };
}

export async function loadSbclInvite(token: string): Promise<SbclInvitePreview> {
  const tokenHash = await hashInviteToken(token);
  const { data, error } = await supabase.rpc('get_sbcl_invite', { p_token_hash: tokenHash });
  const row = Array.isArray(data) ? data[0] : null;
  if (error || !row) throw new Error('This invitation link is invalid, expired, or already used.');
  return { email: row.email, sbclCode: row.sbcl_code, expiresAt: row.expires_at };
}

export async function acceptSbclInvite(token: string, name: string, aliasId: string): Promise<SbclInvite> {
  const tokenHash = await hashInviteToken(token);
  const cleanAlias = aliasId.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 32);
  const { data, error } = await supabase.rpc('accept_sbcl_invite_token', { p_token_hash: tokenHash, p_name: name.trim(), p_alias_id: cleanAlias });
  if (error || !data?.sbcl_code || !data?.referral_code) throw new Error(error?.message || 'No pending SBCL invitation was found for this email address.');
  const { data: userData } = await supabase.auth.getUser();
  return { email: userData.user?.email || '', sbclCode: String(data.sbcl_code), referralCode: String(data.referral_code), status: 'verified', invitedBy: null };
}
