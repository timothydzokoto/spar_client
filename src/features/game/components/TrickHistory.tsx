import { useMemo, useState } from "react";
import type { TrickCompletePayload } from "../../../lib/protocol";
import { PlayingCard } from "./PlayingCard";

type TrickHistoryProps = {
  tricks: TrickCompletePayload[];
  activeTrickNumber: number;
};

export function TrickHistory({ tricks, activeTrickNumber }: TrickHistoryProps) {
  const [selectedTrickNumber, setSelectedTrickNumber] = useState<number | null>(null);
  const selectedTrick = useMemo(
    () => tricks.find((trick) => trick.trickNumber === selectedTrickNumber) ?? null,
    [selectedTrickNumber, tricks],
  );

  if (tricks.length === 0) {
    return null;
  }

  return (
    <section className="panel mt-4" aria-label="Played tricks history">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-100">Played Tricks</h3>
        <p className="text-xs text-slate-300">Active: Trick {activeTrickNumber + 1}</p>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 md:grid md:grid-cols-3 md:overflow-visible">
        {tricks.map((trick) => {
          const isLatestCompleted = trick.trickNumber === activeTrickNumber - 1;
          return (
            <button
              key={`trick-${trick.trickNumber}`}
              type="button"
              onClick={() => setSelectedTrickNumber(trick.trickNumber)}
              aria-label={`Open details for trick ${trick.trickNumber + 1}`}
              className={[
                "min-w-48 rounded-xl border p-2 text-left transition",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300",
                isLatestCompleted
                  ? "border-cyan-300/70 bg-cyan-500/15 ring-1 ring-cyan-300/60"
                  : "border-white/15 bg-slate-900/60 opacity-85 hover:opacity-100",
              ].join(" ")}
            >
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs font-semibold text-slate-200">Trick {trick.trickNumber + 1}</p>
                {trick.trickPoints > 0 ? (
                  <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[11px] text-emerald-100">
                    P{trick.winnerPlayerId} +{trick.trickPoints}
                  </span>
                ) : (
                  <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[11px] text-amber-100">
                    P{trick.winnerPlayerId} +0 (no 1-pt streak bonus)
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-1">
                {trick.plays.map((play) => (
                  <div key={`${trick.trickNumber}-${play.playerId}`} className="text-center">
                    <PlayingCard card={play.card} size="sm" />
                    <p className="mt-1 text-[11px] text-slate-300">P{play.playerId}</p>
                  </div>
                ))}
              </div>
            </button>
          );
        })}
      </div>

      {selectedTrick ? (
        <div className="fixed inset-0 z-40 grid place-items-center bg-black/60 px-4">
          <div className="w-full max-w-sm rounded-2xl border border-white/20 bg-slate-900 p-4 shadow-2xl">
            <div className="mb-3 flex items-center justify-between">
              <h4 className="text-base font-semibold text-slate-100">Trick {selectedTrick.trickNumber + 1} Details</h4>
              <button
                type="button"
                onClick={() => setSelectedTrickNumber(null)}
                className="rounded-lg border border-white/20 px-2 py-1 text-xs text-slate-200 hover:bg-white/10"
                aria-label="Close trick details"
              >
                Close
              </button>
            </div>
            <div className="mb-3 space-y-1 text-xs text-slate-300">
              <p>Lead suit: {selectedTrick.leadSuit}</p>
              <p>Winner: Player {selectedTrick.winnerPlayerId}</p>
              <p>Winning card: {selectedTrick.winnerCard}</p>
              <p>Trick points: +{selectedTrick.trickPoints}</p>
              {selectedTrick.trickPoints === 0 ? (
                <p className="text-amber-200">No points added: consecutive 1-point win does not accumulate.</p>
              ) : null}
              <p>Total score: {selectedTrick.winnerScoreTotal}</p>
            </div>
            <div className="space-y-2">
              {selectedTrick.plays.map((play, index) => (
                <div
                  key={`detail-${selectedTrick.trickNumber}-${play.playerId}-${play.card}`}
                  className="flex items-center gap-2 rounded-xl border border-white/10 bg-slate-800/60 p-2"
                >
                  <span className="w-4 text-xs text-slate-400">{index + 1}.</span>
                  <PlayingCard card={play.card} size="sm" />
                  <p className="text-sm text-slate-200">Player {play.playerId}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
