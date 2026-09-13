import type { SheetUser } from './sheets';

export interface ReferralIdentity {
  raw: string;
  sbclCode: string;
  subReferralCode: string;
}

export function sanitizeReferralPart(value: string, maxLength = 8): string {
  return (value || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, maxLength);
}

export function parseReferralCode(value: string): ReferralIdentity {
  const raw = sanitizeReferralPart(value, 12);
  return {
    raw,
    sbclCode: raw.slice(0, 3),
    subReferralCode: raw.slice(3),
  };
}

export function buildReferralCode(sbclCode: string, subReferralCode = ''): string {
  const owner = sanitizeReferralPart(sbclCode, 3);
  const sub = sanitizeReferralPart(subReferralCode, 9);
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
  return `${origin}/join/${buildReferralCode(code.slice(0, 3), code.slice(3))}`;
}

export function getSbclSignups(users: SheetUser[], sbclCode: string): SheetUser[] {
  const owner = sanitizeReferralPart(sbclCode, 3);
  return users.filter((user) => parseReferralCode(user.referralCode).sbclCode === owner);
}
