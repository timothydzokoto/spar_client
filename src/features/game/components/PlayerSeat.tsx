type PlayerSeatProps = {
  playerId: number;
  handCount: number;
  score?: number;
  totalScore?: number;
  isYou?: boolean;
  isLeader?: boolean;
  isTurn?: boolean;
  compact?: boolean;
};

export function PlayerSeat({
  playerId,
  handCount,
  score = 0,
  totalScore = 0,
  isYou = false,
  isLeader = false,
  isTurn = false,
  compact = false,
}: PlayerSeatProps) {
  return (
    <div
      className={[
        "rounded-2xl border border-white/20 bg-slate-900/80 p-3 shadow-lg backdrop-blur",
        isTurn ? "ring-2 ring-cyan-400" : "",
        compact ? "w-36" : "w-44",
      ].join(" ")}
    >
      <div className="mb-2 flex items-center justify-between">
        <p className="text-sm font-semibold text-slate-100">{isYou ? `You (P${playerId})` : `Player ${playerId}`}</p>
        <div className="h-8 w-8 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500" />
      </div>
      <div className="space-y-1 text-xs text-slate-300">
        <p>Cards: {handCount}</p>
        <p>Score: {score}</p>
        <p>Total: {totalScore}</p>
        <div className="flex flex-wrap gap-1">
          {isLeader ? <span className="rounded-full bg-amber-400/20 px-2 py-0.5 text-amber-200">Leader</span> : null}
          {isTurn ? <span className="rounded-full bg-cyan-400/20 px-2 py-0.5 text-cyan-200">Turn</span> : null}
        </div>
      </div>
    </div>
  );
}
