import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useGameApp } from "../context/GameAppContext";

export function ConnectionScreen() {
  const navigate = useNavigate();
  const game = useGameApp();

  useEffect(() => {
    if (game.joined) {
      navigate({ to: "/rules" });
    }
  }, [game.joined, navigate]);

  return (
    <main className="mx-auto mt-6 w-full max-w-3xl px-4">
      <section className="panel">
        <h2 className="mb-3 text-lg font-semibold text-slate-100">1. Connection</h2>
        <div className="grid gap-3">
          <label className="text-xs text-slate-300">
            WS URL
            <input
              className="mt-1 w-full rounded-xl border border-white/20 bg-slate-900 px-3 py-2 text-sm text-slate-100"
              value={game.wsUrl}
              onChange={(e) => game.setWsUrl(e.target.value)}
            />
          </label>
          <label className="text-xs text-slate-300">
            Game ID
            <input
              className="mt-1 w-full rounded-xl border border-white/20 bg-slate-900 px-3 py-2 text-sm text-slate-100"
              value={game.gameId}
              onChange={(e) => game.setGameId(e.target.value)}
            />
          </label>
          <label className="text-xs text-slate-300">
            Player ID
            <input
              type="number"
              min={1}
              className="mt-1 w-full rounded-xl border border-white/20 bg-slate-900 px-3 py-2 text-sm text-slate-100"
              value={game.playerId}
              onChange={(e) => game.setPlayerId(Number(e.target.value))}
            />
          </label>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button className="btn-primary" onClick={game.connect} disabled={game.connected}>
            Connect
          </button>
          <button className="btn-secondary" onClick={game.disconnect} disabled={!game.connected}>
            Disconnect
          </button>
          <button className="btn-secondary" onClick={game.join} disabled={!game.connected}>
            Join Game
          </button>
          <button className="btn-secondary" onClick={game.getState} disabled={!game.joined}>
            Get State
          </button>
        </div>

        <div className="mt-3 text-sm text-slate-300">
          <p>Status: {game.connected ? "Connected" : "Disconnected"}</p>
          <p>Room: {game.gameId}</p>
        </div>
      </section>
    </main>
  );
}
