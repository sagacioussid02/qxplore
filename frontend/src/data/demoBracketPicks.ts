import type { BracketData, TeamEntry, AgentName, BracketPick, Matchup } from '../types/bracket';

// ── Per-agent scoring helpers ────────────────────────────────────────────────

function quantumTheta(team: TeamEntry): number {
  const base = Math.PI - (team.seed / 16) * (0.75 * Math.PI);
  const kBonus = (team.kenpom_rank ?? 300) <= 25 ? 0.25 : 0;
  const sBonus = (team.strength_of_schedule ?? 0) > 10 ? 0.20 : 0;
  return base + kBonus + sBonus;
}

function geminiScore(team: TeamEntry): number {
  return (17 - team.seed) * 3 + (220 - (team.kenpom_rank ?? 300));
}

// ── Deterministic pick logic per agent ─────────────────────────────────────

function pickWinner(
  agent: AgentName,
  a: TeamEntry,
  b: TeamEntry,
  round: number,
): { winner: TeamEntry; confidence: number; reasoning: string } {
  const rankA = a.kenpom_rank ?? 300;
  const rankB = b.kenpom_rank ?? 300;

  if (agent === 'quantum') {
    const tA = quantumTheta(a), tB = quantumTheta(b);
    const winner = tA >= tB ? a : b;
    const [tW, tL] = tA >= tB ? [tA, tB] : [tB, tA];
    return {
      winner,
      confidence: Math.round((tW / (tW + tL)) * 100) / 100,
      reasoning: `Amplitude encoding: θ=${tW.toFixed(2)} rad vs ${tL.toFixed(2)} rad — ${winner.name} (${winner.seed}-seed) collapses to the winning state.`,
    };
  }

  if (agent === 'openai') {
    const winner = rankA <= rankB ? a : b;
    const gap = Math.abs(rankA - rankB);
    return {
      winner,
      confidence: gap > 30 ? 0.87 : gap > 15 ? 0.74 : gap > 5 ? 0.62 : 0.54,
      reasoning: `KenPom #${Math.min(rankA, rankB)} vs #${Math.max(rankA, rankB)}: ${winner.name} advances — ${gap}-rank gap is ${gap > 20 ? 'decisive' : 'meaningful'}. Seeds are noise.`,
    };
  }

  if (agent === 'montecarlo') {
    const lower = a.seed <= b.seed ? a : b;
    const higher = a.seed <= b.seed ? b : a;
    const gap = Math.abs(a.seed - b.seed);
    // 12-over-5 is the classic reliable upset; pick it deterministically
    const isUpset = round === 1 && gap === 7;
    const winner = isUpset ? higher : lower;
    const conf = gap >= 8 ? 0.92 : gap >= 5 ? 0.78 : gap >= 2 ? 0.64 : 0.53;
    return {
      winner,
      confidence: conf,
      reasoning: `10k simulations: ${winner.seed}-seed wins this matchup in ${Math.round(conf * 100)}% of runs. ${winner.name} advances.`,
    };
  }

  if (agent === 'claude') {
    // Upset picks: 12/5, 11/6, 10/7, 9/8 in round 1; avoid #1 seeds in round 4+
    const lower = a.seed <= b.seed ? a : b;
    const higher = a.seed <= b.seed ? b : a;
    const gap = Math.abs(a.seed - b.seed);
    const upsetRound1 = round === 1 && (gap === 7 || gap === 5 || gap === 3 || gap === 1);
    const avoidOneSeed =
      round >= 4 && (a.seed === 1 || b.seed === 1) && !(a.seed === 1 && b.seed === 1);
    const isUpset = upsetRound1 || avoidOneSeed;
    const winner = isUpset ? higher : rankA <= rankB ? a : b;
    return {
      winner,
      confidence: isUpset ? 0.58 : 0.72,
      reasoning: isUpset
        ? `Upset pick! ${winner.name} (${winner.seed}-seed) has the exact profile to pull this off. KenPom luck signals regression for the favorite.`
        : `No upset here — ${winner.name} is legitimately better. KenPom #${Math.min(rankA, rankB)} doesn't lie.`,
    };
  }

  // gemini: balanced seed + KenPom score
  const sA = geminiScore(a), sB = geminiScore(b);
  const winner = sA >= sB ? a : b;
  const gap2 = Math.abs(sA - sB);
  return {
    winner,
    confidence: gap2 > 40 ? 0.82 : gap2 > 20 ? 0.70 : gap2 > 10 ? 0.61 : 0.54,
    reasoning: `Balanced score: ${winner.name} (${Math.round(Math.max(sA, sB))}) edges ${(sA >= sB ? b : a).name} (${Math.round(Math.min(sA, sB))}) on combined seed + efficiency.`,
  };
}

// ── Main simulation ─────────────────────────────────────────────────────────

export function generateAllDemoPicks(bracket: BracketData): {
  picks: Record<AgentName, Record<string, Omit<BracketPick, 'session_id' | 'agent'>>>;
  champions: Record<AgentName, TeamEntry | null>;
} {
  const agents: AgentName[] = ['claude', 'openai', 'gemini', 'montecarlo', 'quantum'];

  // Flatten all games in round order
  const allGames: Matchup[] = [
    ...bracket.regions.flatMap(r => r.matchups),
    ...bracket.final_four,
    ...(bracket.championship ? [bracket.championship] : []),
  ].sort((a, b) => a.round - b.round || a.position - b.position);

  // Build feeders map: target_game_id → [feeder_a_id, feeder_b_id] (in position order)
  const feeders: Record<string, string[]> = {};
  for (const game of allGames) {
    if (game.winner_advances_to) {
      (feeders[game.winner_advances_to] ??= []).push(game.game_id);
    }
  }

  const picks = Object.fromEntries(
    agents.map(a => [a, {} as Record<string, Omit<BracketPick, 'session_id' | 'agent'>>]),
  ) as Record<AgentName, Record<string, Omit<BracketPick, 'session_id' | 'agent'>>>;

  const champions = Object.fromEntries(agents.map(a => [a, null])) as Record<AgentName, TeamEntry | null>;

  for (const agent of agents) {
    const winners: Record<string, TeamEntry> = {};

    for (const game of allGames) {
      const feederIds = feeders[game.game_id] ?? [];
      const teamA = game.team_a ?? (feederIds[0] ? winners[feederIds[0]] ?? null : null);
      const teamB = game.team_b ?? (feederIds[1] ? winners[feederIds[1]] ?? null : null);
      if (!teamA || !teamB) continue;

      const { winner, confidence, reasoning } = pickWinner(agent, teamA, teamB, game.round);
      winners[game.game_id] = winner;
      picks[agent][game.game_id] = {
        game_id: game.game_id,
        winner_team_id: winner.team_id,
        winner_name: winner.name,
        confidence,
        reasoning,
        pick_metadata: {},
      };
    }

    champions[agent] = winners['CHAMP'] ?? null;
  }

  return { picks, champions };
}

// ── Static commissioner evaluation text ─────────────────────────────────────

export const DEMO_EVALUATION_TEXT =
  `**Claude (Contrarian AI):** Aggressive upset hunting throughout — ` +
  `targeting 12-over-5 seeds and avoiding #1 seeds in the late rounds is exactly ` +
  `the philosophy that wins big pools. Creative, defensible, high-variance. ` +
  `*Methodology: 7 | Upsets: 9 | Champion: 7 | Total: 23/30*\n\n` +
  `**GPT-4o (Quant Analyst):** Pure KenPom discipline with zero sentiment. ` +
  `If the model is right, this bracket dominates. If not, it crashes hard and fast. ` +
  `High-variance science. *Methodology: 8 | Upsets: 4 | Champion: 6 | Total: 18/30*\n\n` +
  `**Gemini (Balanced):** The pragmatist's bracket — weighting seed and KenPom equally ` +
  `produces sensible results that won't embarrass you but won't win a big pool either. ` +
  `Solid, low-drama. *Methodology: 7 | Upsets: 5 | Champion: 7 | Total: 19/30*\n\n` +
  `**Monte Carlo (10k Sims):** Historical simulation done right. The 12-over-5 call ` +
  `is textbook. Statistically grounded, reliably boring. A great tool for pool ` +
  `optimization but lacks the chaos March demands. *Methodology: 9 | Upsets: 6 | Champion: 6 | Total: 21/30*\n\n` +
  `**Quantum ⚛ (Qiskit Circuits):** Encoding basketball matchups as qubit rotation angles ` +
  `is genuinely novel — amplitude encoding captures non-linear team dynamics that ` +
  `KenPom and seed models miss entirely. Bold, creative, defensible. ` +
  `*Methodology: 10 | Upsets: 7 | Champion: 8 | Total: 25/30*\n\n` +
  `---\n## SCORES\n` +
  `Claude: 23/30 | GPT-4o: 18/30 | Gemini: 19/30 | Monte Carlo: 21/30 | Quantum: 25/30\n\n` +
  `## VERDICT\n` +
  `**Quantum wins the methodology crown.** Treating basketball matchups as quantum ` +
  `measurement problems is the most inventive approach here. For a real bracket pool: ` +
  `Claude's upsets or Quantum's unpredictability could crater or conquer. That's March Madness. ` +
  `The chalk rarely survives.\n\n` +
  `*This is a demo run on static 2026 bracket data. Sign up for credits to run live agents on real-time team stats and news.*`;
