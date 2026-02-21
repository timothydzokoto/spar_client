type GameHeaderProps = {
  gameId: string;
  connected: boolean;
  onToggleSettings: () => void;
  onExit: () => void;
};

export function GameHeader({ gameId, connected, onToggleSettings, onExit }: GameHeaderProps) {
  return (
    <header className="sticky top-0 z-20 border-b border-white/10 bg-slate-950/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <div>
          <h1 className="text-lg font-bold text-slate-100 sm:text-xl">Trickleader Table</h1>
          <p className="text-xs text-slate-400">Room: {gameId || "-"}</p>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={[
              "rounded-full px-3 py-1 text-xs font-medium",
              connected ? "bg-emerald-400/20 text-emerald-200" : "bg-rose-400/20 text-rose-200",
            ].join(" ")}
          >
            {connected ? "Connected" : "Disconnected"}
          </span>
          <button type="button" className="btn-secondary px-3 py-1.5 text-sm" onClick={onToggleSettings}>
            Settings
          </button>
          <button type="button" className="btn-secondary px-3 py-1.5 text-sm" onClick={onExit}>
            Exit
          </button>
        </div>
      </div>
    </header>
  );
}
