type PlayingCardSize = "sm" | "md" | "lg";

type PlayingCardProps = {
  card: string;
  size?: PlayingCardSize;
  selected?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  title?: string;
};

const SUIT_SYMBOL: Record<string, string> = {
  C: "\u2663",
  D: "\u2666",
  H: "\u2665",
  S: "\u2660",
};

function parseCard(card: string): { rank: string; suit: string; symbol: string } {
  const trimmed = card.trim().toUpperCase();
  const suit = trimmed.slice(-1);
  const rank = trimmed.slice(0, -1);
  return { rank, suit, symbol: SUIT_SYMBOL[suit] ?? "?" };
}

function sizeClasses(size: PlayingCardSize): string {
  switch (size) {
    case "sm":
      return "h-16 w-12 text-xs";
    case "md":
      return "h-24 w-16 text-sm";
    case "lg":
      return "h-32 w-20 text-base";
    default:
      return "h-24 w-16 text-sm";
  }
}

export function PlayingCard({ card, size = "md", selected = false, disabled = false, onClick, title }: PlayingCardProps) {
  const parsed = parseCard(card);
  const isRed = parsed.suit === "H" || parsed.suit === "D";
  const suitColor = isRed ? "text-rose-600" : "text-slate-800";

  return (
    <button
      type="button"
      title={title}
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      className={[
        "group relative rounded-xl border bg-white p-1 text-left shadow-card transition",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400",
        sizeClasses(size),
        selected ? "-translate-y-2 border-cyan-400 ring-2 ring-cyan-400" : "border-slate-300",
        disabled ? "cursor-not-allowed opacity-45 grayscale" : "hover:-translate-y-1 hover:shadow-xl active:translate-y-0",
      ].join(" ")}
      aria-label={`Card ${parsed.rank}${parsed.suit}`}
    >
      <div className={`absolute left-1.5 top-1 ${suitColor}`}>
        <div className="font-bold leading-none">{parsed.rank}</div>
        <div className="leading-none">{parsed.symbol}</div>
      </div>
      <div className={`absolute bottom-1.5 right-1.5 rotate-180 ${suitColor}`}>
        <div className="font-bold leading-none">{parsed.rank}</div>
        <div className="leading-none">{parsed.symbol}</div>
      </div>
      <div className={`absolute inset-0 grid place-items-center text-2xl ${suitColor}`}>{parsed.symbol}</div>
    </button>
  );
}
