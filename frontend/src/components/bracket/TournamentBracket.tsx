/**
 * TournamentBracket — full NCAA bracket visualization matching the CBS Sports layout.
 *
 * Layout (11 columns):
 *  [R64-L] [R32-L] [S16-L] [E8-L] [FF-L]  [CHAMP]  [FF-R] [E8-R] [S16-R] [R32-R] [R64-R]
 *
 * Left half:  regions[0] (top) + regions[1] (bottom)  →  final_four[0]
 * Right half: regions[2] (top) + regions[3] (bottom)  →  final_four[1]
 * Championship: final_four[0] winner vs final_four[1] winner
 */
import { useMemo } from 'react';
import { motion } from 'framer-motion';
import type { BracketData, BracketPick, Matchup, TeamEntry, AgentName } from '../../types/bracket';
import { AGENT_COLORS } from '../../types/bracket';
import { reconstructBracket } from './bracketUtils';

interface Props {
  bracket: BracketData;
  picks: Record<string, BracketPick>;
  agent: AgentName;
}

const BRACKET_H = 640;  // total height of bracket area
const CARD_W    = 148;  // matchup card width
const COL_GAP   = 2;    // gap between columns

// ── Team row ──────────────────────────────────────────────────────────────────
function TeamRow({
  team, isWinner, isPicked, agentColor, side,
}: {
  team: TeamEntry | null;
  isWinner: boolean;
  isPicked: boolean;
  agentColor: string;
  side: 'left' | 'right' | 'center';
}) {
  const winnerBorder = side === 'right'
    ? { borderRight: `2px solid ${agentColor}` }
    : { borderLeft: `2px solid ${agentColor}` };

  return (
    <div
      className="flex items-center gap-1 px-1.5 h-[22px] text-[11px] overflow-hidden transition-all"
      style={
        isWinner
          ? { backgroundColor: agentColor + '28', ...winnerBorder, color: '#fff', fontWeight: 600 }
          : isPicked
          ? { color: '#4b5563' }
          : { color: '#9ca3af' }
      }
    >
      {team ? (
        <>
          <span className="w-[14px] shrink-0 font-mono text-[10px] text-gray-500">{team.seed}</span>
          <span className="truncate flex-1">{team.name}</span>
          {isWinner && (
            <motion.span
              className="shrink-0 text-[9px] ml-1"
              style={{ color: agentColor }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              ✓
            </motion.span>
          )}
        </>
      ) : (
        <span className="text-gray-700 text-[10px]">TBD</span>
      )}
    </div>
  );
}

// ── Matchup card ──────────────────────────────────────────────────────────────
function MatchupCard({
  matchup, pick, agentColor, side,
}: {
  matchup: Matchup;
  pick?: BracketPick;
  agentColor: string;
  side: 'left' | 'right' | 'center';
}) {
  const winnerId = pick?.winner_team_id;
  const isAWinner = !!winnerId && winnerId === matchup.team_a?.team_id;
  const isBWinner = !!winnerId && winnerId === matchup.team_b?.team_id;
  const isPicked = !!winnerId;

  // Bracket connector line direction
  const connectorBorder = side === 'right'
    ? { borderLeft: '1px solid #374151' }
    : side === 'left'
    ? { borderRight: '1px solid #374151' }
    : {};

  return (
    <motion.div
      className="rounded-sm overflow-hidden bg-gray-800/50 mx-[3px]"
      style={{ width: CARD_W, ...connectorBorder }}
      initial={{ opacity: 0.4 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
      title={pick?.reasoning}
    >
      <TeamRow team={matchup.team_a} isWinner={isAWinner} isPicked={isPicked} agentColor={agentColor} side={side} />
      <div className="border-t border-gray-700/60" />
      <TeamRow team={matchup.team_b} isWinner={isBWinner} isPicked={isPicked} agentColor={agentColor} side={side} />
    </motion.div>
  );
}

// ── Round column ──────────────────────────────────────────────────────────────
const ROUND_LABEL: Record<number, string> = {
  1: 'Round of 64', 2: 'Round of 32', 3: 'Sweet 16', 4: 'Elite 8', 5: 'Final Four',
};

function RoundColumn({
  round, matchups, picks, agentColor, side, regionLabels,
}: {
  round: number;
  matchups: Matchup[];
  picks: Record<string, BracketPick>;
  agentColor: string;
  side: 'left' | 'right';
  regionLabels?: [string, string]; // top and bottom region names
}) {
  const isR64 = round === 1;

  return (
    <div className="flex flex-col shrink-0" style={{ width: CARD_W + 6 + COL_GAP }}>
      {/* Column header */}
      <div className="text-center text-[9px] text-gray-600 uppercase tracking-wider h-9 flex items-center justify-center font-semibold">
        {ROUND_LABEL[round] ?? `Round ${round}`}
      </div>

      {/* Region name for R64 column */}
      {isR64 && regionLabels && (
        <div className="flex flex-col" style={{ height: BRACKET_H }}>
          {/* Top region */}
          <div className="flex-1 flex flex-col justify-around border-b border-gray-700/20 pb-1">
            <div className="text-[9px] text-gray-600 text-center mb-1 italic">{regionLabels[0]}</div>
            {matchups.slice(0, 8).map(m => (
              <MatchupCard key={m.game_id} matchup={m} pick={picks[m.game_id]} agentColor={agentColor} side={side} />
            ))}
          </div>
          {/* Bottom region */}
          <div className="flex-1 flex flex-col justify-around pt-1">
            <div className="text-[9px] text-gray-600 text-center mb-1 italic">{regionLabels[1]}</div>
            {matchups.slice(8).map(m => (
              <MatchupCard key={m.game_id} matchup={m} pick={picks[m.game_id]} agentColor={agentColor} side={side} />
            ))}
          </div>
        </div>
      )}

      {!isR64 && (
        <div
          className="flex flex-col justify-around"
          style={{ height: BRACKET_H }}
        >
          {matchups.map(m => (
            <MatchupCard key={m.game_id} matchup={m} pick={picks[m.game_id]} agentColor={agentColor} side={side} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Championship center ───────────────────────────────────────────────────────
function ChampionshipCenter({
  matchup, picks, agentColor,
}: {
  matchup: Matchup | null;
  picks: Record<string, BracketPick>;
  agentColor: string;
}) {
  const pick = matchup ? picks[matchup.game_id] : undefined;
  const champion = pick?.winner_name;

  return (
    <div className="flex flex-col shrink-0 items-center" style={{ width: 180 }}>
      <div className="text-[9px] text-gray-600 uppercase tracking-wider h-9 flex items-center font-semibold">
        Championship
      </div>
      <div className="flex-1 flex flex-col items-center justify-center gap-3">
        {/* Trophy + champion name */}
        <div className="text-center">
          <div className="text-3xl mb-2">🏆</div>
          {champion ? (
            <motion.div
              className="font-bold text-sm px-3 py-1 rounded-full"
              style={{ backgroundColor: agentColor + '33', color: agentColor, border: `1px solid ${agentColor}66` }}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 300 }}
            >
              {champion}
            </motion.div>
          ) : (
            <div className="text-[11px] text-gray-600">National Champion</div>
          )}
        </div>

        {/* Championship matchup */}
        {matchup && (
          <div className="w-full">
            <div className="text-[9px] text-gray-600 text-center mb-1 uppercase tracking-wider">Final</div>
            <MatchupCard matchup={matchup} pick={pick} agentColor={agentColor} side="center" />
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main TournamentBracket ────────────────────────────────────────────────────
export function TournamentBracket({ bracket, picks, agent }: Props) {
  const color = AGENT_COLORS[agent];

  // Propagate winners into round 2-6 team slots based on picks made so far
  const filled = useMemo(() => reconstructBracket(bracket, picks), [bracket, picks]);

  if (filled.regions.length < 4) return <div className="text-gray-500 text-sm p-4">Bracket data incomplete</div>;

  const [lTop, lBot, rTop, rBot] = filled.regions;

  const getR = (region: typeof lTop, round: number) =>
    region.matchups.filter(m => m.round === round);

  // Left half matchups per round (top region first, then bottom region)
  const lMatchups = (round: number) => [...getR(lTop, round), ...getR(lBot, round)];
  // Right half matchups per round
  const rMatchups = (round: number) => [...getR(rTop, round), ...getR(rBot, round)];

  const leftFF  = filled.final_four[0] ? [filled.final_four[0]] : [];
  const rightFF = filled.final_four[1] ? [filled.final_four[1]] : [];

  return (
    <div className="w-full overflow-x-auto overflow-y-hidden">
      <div className="flex items-start" style={{ minWidth: 'max-content' }}>
        {/* ── LEFT HALF (R64 → FF, left to right) ── */}
        <RoundColumn round={1} matchups={lMatchups(1)} picks={picks} agentColor={color} side="left"
          regionLabels={[lTop.name, lBot.name]} />
        <RoundColumn round={2} matchups={lMatchups(2)} picks={picks} agentColor={color} side="left" />
        <RoundColumn round={3} matchups={lMatchups(3)} picks={picks} agentColor={color} side="left" />
        <RoundColumn round={4} matchups={lMatchups(4)} picks={picks} agentColor={color} side="left" />
        <RoundColumn round={5} matchups={leftFF}       picks={picks} agentColor={color} side="left" />

        {/* ── CHAMPIONSHIP CENTER ── */}
        <ChampionshipCenter matchup={filled.championship ?? null} picks={picks} agentColor={color} />

        {/* ── RIGHT HALF (FF → R64, right to left) ── */}
        <RoundColumn round={5} matchups={rightFF}      picks={picks} agentColor={color} side="right" />
        <RoundColumn round={4} matchups={rMatchups(4)} picks={picks} agentColor={color} side="right" />
        <RoundColumn round={3} matchups={rMatchups(3)} picks={picks} agentColor={color} side="right" />
        <RoundColumn round={2} matchups={rMatchups(2)} picks={picks} agentColor={color} side="right" />
        <RoundColumn round={1} matchups={rMatchups(1)} picks={picks} agentColor={color} side="right"
          regionLabels={[rTop.name, rBot.name]} />
      </div>
    </div>
  );
}
