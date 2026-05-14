// ─── Tier / Badge Configuration ────────────────────────────────────────────

export interface Tier {
  id: string;
  name: string;
  minReferrals: number;
  points: number;          // minReferrals × 15
  badge: string;           // path to image in /public/badges/
  reward: string;          // one-line reward text
  color: string;           // accent glow color
}

export const TIERS: Tier[] = [
  {
    id: 'beginner',
    name: 'Beginner',
    minReferrals: 0,
    points: 0,
    badge: '/badges/beginner.png',
    reward: 'Start earning points & rewards!',
    color: '#60A5FA',
  },
  {
    id: 'intermediate',
    name: 'Intermediate',
    minReferrals: 50,
    points: 750,
    badge: '/badges/intermediate.png',
    reward: 'AWS tote bag & goodies kit',
    color: '#A78BFA',
  },
  {
    id: 'expert',
    name: 'Expert',
    minReferrals: 80,
    points: 1200,
    badge: '/badges/expert.png',
    reward: 'T-shirt & AWS goodies',
    color: '#F59E0B',
  },
  {
    id: 'master',
    name: 'Master',
    minReferrals: 100,
    points: 1500,
    badge: '/badges/master.png',
    reward: 'Premium AWS swag bundle',
    color: '#F97316',
  },
  {
    id: 'legend',
    name: 'Legend',
    minReferrals: 120,
    points: 1800,
    badge: '/badges/legend.png',
    reward: 'Exclusive AWS merchandise + recognition',
    color: '#EC4899',
  },
];

/** Returns the current Tier for a given referral count */
export function getTierForReferrals(referrals: number): Tier {
  let current = TIERS[0];
  for (const tier of TIERS) {
    if (referrals >= tier.minReferrals) current = tier;
  }
  return current;
}

/** Returns the next Tier above the current one, or null if at max */
export function getNextTier(currentTier: Tier): Tier | null {
  const idx = TIERS.findIndex(t => t.id === currentTier.id);
  return TIERS[idx + 1] ?? null;
}

// ─── Notification / toast helpers ──────────────────────────────────────────

const LS_KEY = 'aws_tier_notified';

function getNotifiedTier(): string {
  return localStorage.getItem(LS_KEY) || '';
}

export function setNotifiedTier(tierId: string) {
  localStorage.setItem(LS_KEY, tierId);
}

/**
 * Returns the tier to announce if the user has just crossed into a new tier
 * that hasn't been notified yet.  Returns null if no announcement needed.
 */
export function checkTierUnlock(referrals: number): Tier | null {
  const currentTier = getTierForReferrals(referrals);
  const notifiedId   = getNotifiedTier();

  // Skip Beginner (always true) — only fire from Scholar upwards
  if (currentTier.id === 'beginner') {
    if (!notifiedId) setNotifiedTier('beginner');
    return null;
  }

  if (currentTier.id !== notifiedId) {
    return currentTier;   // caller should call setNotifiedTier() after showing
  }
  return null;
}
