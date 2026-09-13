import { doc, getDoc, runTransaction, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { sendSignInLinkToEmail } from 'firebase/auth';
import { auth, db } from './firebase';
import { deriveSbclCodeFromEmail } from './referrals';

export interface SbclInvite {
  email: string;
  sbclCode: string;
  status: 'pending' | 'verified';
  invitedBy: string;
}

const inviteId = (email: string) => email.trim().toLowerCase();

function buildPrefixCandidates(email: string): string[] {
  const letters = (email.split('@')[0] || '').toUpperCase().replace(/[^A-Z]/g, '');
  const candidates = new Set<string>();

  if (letters.length >= 3) candidates.add(letters.slice(0, 3));

  // Prefer readable combinations derived from the email username.
  for (let i = 0; i < letters.length - 2; i++) {
    for (let j = i + 1; j < letters.length - 1; j++) {
      for (let k = j + 1; k < letters.length; k++) {
        candidates.add(`${letters[i]}${letters[j]}${letters[k]}`);
        if (candidates.size >= 30) return [...candidates];
      }
    }
  }

  // Extremely rare fallback when all readable combinations are reserved.
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  while (candidates.size < 45) {
    const bytes = new Uint8Array(3);
    crypto.getRandomValues(bytes);
    candidates.add([...bytes].map((value) => alphabet[value % 26]).join(''));
  }
  return [...candidates];
}

export async function inviteSbcl(email: string, invitedBy: string): Promise<string> {
  const normalizedEmail = inviteId(email);
  const preferredCode = deriveSbclCodeFromEmail(normalizedEmail);
  if (!normalizedEmail.includes('@') || preferredCode.length !== 3) throw new Error('Enter an email whose username contains at least three letters.');

  const inviteRef = doc(db, 'sbclInvites', normalizedEmail);
  const code = await runTransaction(db, async (transaction) => {
    const existingInvite = await transaction.get(inviteRef);
    const existing = existingInvite.exists() ? existingInvite.data() as SbclInvite : null;
    if (existing?.status === 'verified') throw new Error('This email already belongs to a verified SBCL.');

    const candidates = [...new Set([existing?.sbclCode, ...buildPrefixCandidates(normalizedEmail)].filter(Boolean) as string[])];
    const codeRefs = candidates.map((candidate) => doc(db, 'sbclCodes', candidate));
    const snapshots = await Promise.all(codeRefs.map((codeRef) => transaction.get(codeRef)));
    const availableIndex = snapshots.findIndex((snapshot) => !snapshot.exists() || snapshot.data()?.email === normalizedEmail);
    if (availableIndex < 0) throw new Error('Could not generate a unique SBCL prefix. Please try again.');

    const selectedCode = candidates[availableIndex];
    transaction.set(codeRefs[availableIndex], {
      email: normalizedEmail,
      status: 'reserved',
      createdAt: serverTimestamp(),
    });
    transaction.set(inviteRef, {
      email: normalizedEmail,
      sbclCode: selectedCode,
      status: 'pending',
      invitedBy,
      ...(existing ? { resentAt: serverTimestamp() } : { createdAt: serverTimestamp() }),
    }, { merge: true });
    return selectedCode;
  });

  await sendSignInLinkToEmail(auth, normalizedEmail, {
    url: `${window.location.origin}/sbcl/verify`,
    handleCodeInApp: true,
  });
  return code;
}

export async function acceptSbclInvite(email: string, uid: string): Promise<SbclInvite> {
  const normalizedEmail = inviteId(email);
  const inviteRef = doc(db, 'sbclInvites', normalizedEmail);
  const snapshot = await getDoc(inviteRef);
  if (!snapshot.exists()) throw new Error('No SBCL invitation was found for this email address.');
  const invite = snapshot.data() as SbclInvite;
  if (invite.status === 'verified') throw new Error('This invitation has already been used.');

  await setDoc(doc(db, 'sbclProfiles', uid), {
    email: normalizedEmail,
    sbclCode: invite.sbclCode,
    role: 'sbcl',
    verifiedAt: serverTimestamp(),
  });
  await updateDoc(inviteRef, { status: 'verified', verifiedUid: uid, verifiedAt: serverTimestamp() });
  return invite;
}
