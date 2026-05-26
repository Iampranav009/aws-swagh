import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Canonical normalisation for all alias / referral-code inputs:
 *   - strip leading/trailing spaces
 *   - remove leading "@"
 *   - uppercase  (all comparisons are case-insensitive)
 */
export function normalizeAlias(s: string): string {
  return (s || '').replace(/^@/, '').trim().toUpperCase();
}

/**
 * Levenshtein edit-distance between two strings.
 * Used for fuzzy referral-code matching.
 */
export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const m = a.length;
  const n = b.length;

  // We only need two rows of size n+1
  let prevRow = new Int32Array(n + 1);
  let currRow = new Int32Array(n + 1);

  for (let j = 0; j <= n; j++) {
    prevRow[j] = j;
  }

  for (let i = 1; i <= m; i++) {
    currRow[0] = i;
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        currRow[j] = prevRow[j - 1];
      } else {
        currRow[j] = 1 + Math.min(
          prevRow[j],      // Deletion
          currRow[j - 1],  // Insertion
          prevRow[j - 1]   // Substitution
        );
      }
    }
    // Swap rows
    const temp = prevRow;
    prevRow = currRow;
    currRow = temp;
  }

  return prevRow[n];
}
