/**
 * Reconstruct a filled bracket from picks.
 *
 * The raw bracket has team_a/team_b = null for rounds 2-6 (TBD slots).
 * This function walks winner_advances_to links and propagates winners
 * into the correct slots round by round.
 */
import type { BracketData, BracketPick, Matchup } from '../../types/bracket';

export function reconstructBracket(
  bracket: BracketData,
  picks: Record<string, BracketPick>,
): BracketData {
  if (!Object.keys(picks).length) return bracket;

  // Deep clone so we never mutate the store's bracket
  const result: BracketData = JSON.parse(JSON.stringify(bracket));

  // ── Build a flat map of all matchups ──────────────────────────────────────
  const allMatchups = new Map<string, Matchup>();
  for (const region of result.regions)
    for (const m of region.matchups) allMatchups.set(m.game_id, m);
  for (const m of result.final_four) allMatchups.set(m.game_id, m);
  if (result.championship) allMatchups.set(result.championship.game_id, result.championship);

  // ── Stable insertion order (used to sort feeders correctly) ───────────────
  const order = new Map<string, number>();
  let idx = 0;
  for (const region of result.regions)
    for (const m of region.matchups) order.set(m.game_id, idx++);
  for (const m of result.final_four) order.set(m.game_id, idx++);
  if (result.championship) order.set(result.championship.game_id, idx++);

  // ── Build feeders map: target_game_id → [feeder_game_ids sorted by order] ─
  const feeders = new Map<string, string[]>();
  for (const [gid, m] of allMatchups) {
    if (!m.winner_advances_to) continue;
    const list = feeders.get(m.winner_advances_to) ?? [];
    list.push(gid);
    feeders.set(m.winner_advances_to, list);
  }
  for (const list of feeders.values())
    list.sort((a, b) => (order.get(a) ?? 0) - (order.get(b) ?? 0));

  // ── Propagate winners round by round ─────────────────────────────────────
  // Rounds 2-6: feeder round is always round-1, already processed.
  for (let round = 2; round <= 6; round++) {
    for (const matchup of allMatchups.values()) {
      if (matchup.round !== round) continue;

      const feederIds = feeders.get(matchup.game_id) ?? [];
      feederIds.forEach((feederId, slot) => {
        const pick = picks[feederId];
        if (!pick) return;

        const feeder = allMatchups.get(feederId)!;
        const winner =
          feeder.team_a?.team_id === pick.winner_team_id ? feeder.team_a :
          feeder.team_b?.team_id === pick.winner_team_id ? feeder.team_b :
          null;

        if (!winner) return;
        if (slot === 0) matchup.team_a = winner;
        else            matchup.team_b = winner;
      });
    }
  }

  return result;
}
