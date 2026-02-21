import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useGameApp } from "../context/GameAppContext";

export function RulesScreen() {
  const navigate = useNavigate();
  const game = useGameApp();

  useEffect(() => {
    if (!game.joined) {
      navigate({ to: "/connect" });
    }
  }, [game.joined, navigate]);

  return (
    <main className="mx-auto mt-6 w-full max-w-3xl px-4">
      <section className="panel">
        <h2 className="mb-3 text-lg font-semibold text-slate-100">2. Round Rules</h2>
        <div className="grid gap-3">
          <label className="text-xs text-slate-300">
            Seed (optional)
            <input
              className="mt-1 w-full rounded-xl border border-white/20 bg-slate-900 px-3 py-2 text-sm text-slate-100"
              value={game.seedInput}
              onChange={(e) => game.setSeedInput(e.target.value)}
            />
          </label>
          <label className="text-xs text-slate-300">
            Excluded ranks
            <input
              className={[
                "mt-1 w-full rounded-xl border bg-slate-900 px-3 py-2 text-sm text-slate-100",
                game.rankValidation.errors.length > 0 ? "border-rose-400" : "border-white/20",
              ].join(" ")}
              value={game.excludedRanksInput}
              onChange={(e) => game.setExcludedRanksInput(e.target.value)}
              placeholder="2,3,4,5"
            />
          </label>
          {game.rankValidation.errors.map((msg) => (
            <p key={msg} className="text-xs text-rose-200">{msg}</p>
          ))}
          {game.rankValidation.values.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {game.rankValidation.values.map((rank) => (
                <span key={rank} className="chip">{rank}</span>
              ))}
            </div>
          ) : null}
          <label className="text-xs text-slate-300">
            Excluded cards
            <input
              className={[
                "mt-1 w-full rounded-xl border bg-slate-900 px-3 py-2 text-sm text-slate-100",
                game.cardValidation.errors.length > 0 ? "border-rose-400" : "border-white/20",
              ].join(" ")}
              value={game.excludedCardsInput}
              onChange={(e) => game.setExcludedCardsInput(e.target.value)}
              placeholder="AS,KH"
            />
          </label>
          {game.cardValidation.errors.map((msg) => (
            <p key={msg} className="text-xs text-rose-200">{msg}</p>
          ))}
          {game.cardValidation.values.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {game.cardValidation.values.map((card) => (
                <span key={card} className="chip">{card}</span>
              ))}
            </div>
          ) : null}
        </div>

        <div className="mt-3 rounded-xl border border-white/10 bg-slate-900/70 p-2 text-xs text-slate-200">
          <p>Effective deck size: {game.effectiveDeckInfo.size}</p>
          <p>Needed for round: {game.effectiveDeckInfo.minimumRequired} cards</p>
          {!game.effectiveDeckInfo.enoughForRound ? (
            <p className="mt-1 text-rose-200">Deck too small for configured players.</p>
          ) : null}
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button className="btn-secondary" onClick={() => navigate({ to: "/connect" })}>
            Back
          </button>
          <button className="btn-primary" onClick={game.startRound} disabled={!game.canStartRound}>
            Start Round
          </button>
          <button className="btn-secondary" onClick={game.getState}>
            Get State
          </button>
          <button className="btn-secondary" onClick={() => navigate({ to: "/table" })} disabled={!game.currentState}>
            Go To Table
          </button>
        </div>
      </section>
    </main>
  );
}
