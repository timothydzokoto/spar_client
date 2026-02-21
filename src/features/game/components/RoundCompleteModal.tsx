type RoundCompleteModalProps = {
  winnerPlayerId: number | null;
  open: boolean;
  onClose: () => void;
  onPlayAgain: () => void;
};

export function RoundCompleteModal({ winnerPlayerId, open, onClose, onPlayAgain }: RoundCompleteModalProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-30 grid place-items-center bg-black/55 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-white/20 bg-slate-900 p-5 shadow-2xl">
        <p className="text-xs uppercase tracking-wide text-cyan-200">Round Complete</p>
        <h2 className="mt-1 text-xl font-bold text-slate-100">
          {winnerPlayerId ? `Player ${winnerPlayerId} wins` : "Winner unavailable"}
        </h2>
        <p className="mt-2 text-sm text-slate-300">
          Start a new round to deal fresh cards and continue play.
        </p>
        <div className="mt-4 flex gap-2">
          <button type="button" className="btn-primary flex-1" onClick={onPlayAgain}>
            Play again
          </button>
          <button type="button" className="btn-secondary flex-1" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
