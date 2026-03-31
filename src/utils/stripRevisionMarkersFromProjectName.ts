/**
 * Removes trailing revision/draft decorations from a stored project `name`.
 * Used when collapsing revision history so `name` stays the product name, not "… rev N".
 */
export function stripRevisionMarkersFromProjectName(name: string): string {
  let s = name.trim();
  let prev = '';
  while (s !== prev) {
    prev = s;
    s = s
      .replace(/\s*—\s*Rev\.?\s+\d+\s*$/i, '')
      .replace(/\s*-\s*Rev\.?\s+\d+\s*$/i, '')
      .replace(/\s*\u2013\s*Rev\.?\s+\d+\s*$/i, '')
      .replace(/\s*\([Rr]ev\.?\s+\d+\)\s*$/i, '')
      .replace(/\s*\([Rr]evision\s+\d+\)\s*$/i, '')
      .replace(/\s+[Rr]ev\.?\s+\d+\s*$/i, '')
      .replace(/\s*\([Dd]raft\)\s*$/i, '')
      .replace(/\s*\([Pp]ublished\)\s*$/i, '')
      .replace(/\s*\([Bb]eta\)\s*$/i, '')
      .trim();
  }
  return s;
}
