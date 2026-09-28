export type OrderedPlayer = { id: string; name: string; position: number };

// The ranking belongs to the team AND phase; a lineup may skip ranks but cannot invert them.
export function isIncreasing(ids: string[], roster: OrderedPlayer[]): boolean {
  if (ids.length !== 4 || ids.some((id) => !id)) return false;
  const ranks = new Map(roster.map((player) => [player.id, Number(player.position)]));
  const selected = ids.map((id) => ranks.get(id));
  return selected.every((rank, i) =>
    rank !== undefined && Number.isFinite(rank) && (i === 0 || rank > (selected[i - 1] ?? Infinity)));
}

export function eligiblePlayers(roster: OrderedPlayer[], selected: string[], row: number): OrderedPlayer[] {
  const ranks = new Map(roster.map((player) => [player.id, Number(player.position)]));
  const ordered = [...roster].sort((a, b) => Number(a.position) - Number(b.position));
  return ordered.filter((candidate) => {
    const rank = Number(candidate.position);
    const index = ordered.findIndex((player) => player.id === candidate.id);
    // Leave enough players before/after to fill the remaining positions.
    if (index < row || ordered.length - index - 1 < 3 - row) return false;
    for (let other = 0; other < 4; other++) {
      if (other === row || !selected[other]) continue;
      const otherRank = ranks.get(selected[other]);
      if (otherRank === undefined) continue;
      // Between two fixed rows, leave room for any positions still to be chosen.
      const gap = Math.abs(other - row);
      const playersBetween = ordered.filter((player) =>
        Number(player.position) > Math.min(rank, otherRank) &&
        Number(player.position) < Math.max(rank, otherRank)).length;
      if (playersBetween < gap - 1) return false;
      if (other < row && otherRank >= rank) return false;
      if (other > row && otherRank <= rank) return false;
    }
    return true;
  });
}

export function selectPlayer(roster: OrderedPlayer[], selected: string[], row: number, id: string): string[] {
  const next = [...selected];
  next[row] = id;
  if (!id) return next;
  const ranks = new Map(roster.map((player) => [player.id, Number(player.position)]));
  const chosen = ranks.get(id);
  if (chosen === undefined) return next;
  for (let other = 0; other < 4; other++) {
    if (other === row || !next[other]) continue;
    const rank = ranks.get(next[other]);
    if (rank === undefined || (other < row && rank >= chosen) || (other > row && rank <= chosen)) {
      next[other] = "";
    }
  }
  return next;
}
