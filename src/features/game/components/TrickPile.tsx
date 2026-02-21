import type { PlayedCardView } from "../../../lib/protocol";
import { PlayingCard } from "./PlayingCard";

type TrickPileProps = {
  trickNumber: number;
  leadSuit?: string;
  cards: PlayedCardView[];
  active?: boolean;
};

const LEAD_LABEL: Record<string, string> = {
  C: "Clubs",
  D: "Diamonds",
  H: "Hearts",
  S: "Spades",
};

export function TrickPile({ trickNumber, leadSuit, cards, active = true }: TrickPileProps) {
  return (
    <div
      className={[
        "panel mx-auto w-full max-w-md",
        active ? "border-cyan-300/60 ring-1 ring-cyan-300/50" : "",
      ].join(" ")}
      aria-live="polite"
      aria-label="Current trick pile"
    >
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-semibold text-slate-200">Trick {trickNumber + 1}</p>
        <p className="text-xs text-slate-300">Lead Suit: {LEAD_LABEL[leadSuit ?? ""] ?? "-"}</p>
      </div>
      <div className="min-h-20 rounded-xl border border-white/10 bg-slate-800/70 p-3">
        {cards.length === 0 ? (
          <p className="text-center text-sm text-slate-400">Waiting for leader card...</p>
        ) : (
          <div className="flex flex-wrap justify-center gap-2">
            {cards.map((play, index) => (
              <div
                key={`${play.playerId}-${play.card}`}
                className={[
                  "animate-card-in text-center",
                  index === cards.length - 1 ? "animate-pile-focus" : "",
                ].join(" ")}
                style={{ animationDelay: `${index * 70}ms` }}
              >
                <PlayingCard card={play.card} size="sm" />
                <p className="mt-1 text-[11px] text-slate-300">P{play.playerId}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
