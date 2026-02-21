import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import type { PlayerView } from "../../../lib/protocol";
import { PlayerSeat } from "../components/PlayerSeat";
import { PlayingCard } from "../components/PlayingCard";
import { TrickHistory } from "../components/TrickHistory";
import { TrickPile } from "../components/TrickPile";
import { useGameApp } from "../context/GameAppContext";

export function TableScreen() {
  const navigate = useNavigate();
  const game = useGameApp();
  const [selectedCard, setSelectedCard] = useState<string | null>(null);
  const [animatingCard, setAnimatingCard] = useState<string | null>(null);

  useEffect(() => {
    if (!game.joined) {
      navigate({ to: "/connect" });
    }
  }, [game.joined, navigate]);

  const currentState = game.currentState;
  const yourId = currentState?.you ?? game.joined?.playerId ?? game.playerId;
  const players = currentState?.players ?? [];
  const yourHand = currentState?.yourHand ?? [];
  const leadSuit = currentState?.leadSuit ?? "";

  const otherPlayers = players.filter((p) => p.playerId !== yourId);
  const seatLayout = mapSeatLayout(otherPlayers);
  const selectedPlayable = selectedCard ? game.canPlayCard(selectedCard).allowed : false;
  const selectedReason = selectedCard ? game.canPlayCard(selectedCard).reason : undefined;

  useEffect(() => {
    if (selectedCard && !yourHand.includes(selectedCard)) {
      setSelectedCard(null);
    }
  }, [selectedCard, yourHand]);

  const playSelectedCard = useCallback(() => {
    if (!selectedCard) {
      return;
    }
    const status = game.canPlayCard(selectedCard);
    if (!status.allowed || animatingCard) {
      return;
    }
    const cardToPlay = selectedCard;
    setAnimatingCard(cardToPlay);
    window.setTimeout(() => game.playCard(cardToPlay), 160);
    window.setTimeout(() => {
      setAnimatingCard((prev) => (prev === cardToPlay ? null : prev));
    }, 520);
    setSelectedCard(null);
  }, [animatingCard, game, selectedCard]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const tag = target?.tagName ?? "";
      if (tag === "INPUT" || tag === "TEXTAREA") {
        return;
      }
      if (event.key === "Enter" && game.canPlay) {
        event.preventDefault();
        playSelectedCard();
        return;
      }
      if ((event.key !== "ArrowRight" && event.key !== "ArrowLeft") || !game.canPlay || yourHand.length === 0) {
        return;
      }
      const legalCards = yourHand.filter((card) => game.canPlayCard(card).allowed);
      const selectionPool = legalCards.length > 0 ? legalCards : yourHand;
      const currentIndex = selectedCard ? selectionPool.indexOf(selectedCard) : -1;
      const step = event.key === "ArrowRight" ? 1 : -1;
      const nextIndex = currentIndex === -1
        ? 0
        : (currentIndex + step + selectionPool.length) % selectionPool.length;
      setSelectedCard(selectionPool[nextIndex]);
      event.preventDefault();
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [game, playSelectedCard, selectedCard, yourHand]);

  const liveRegionText = useMemo(() => {
    if (!currentState) {
      return "Waiting for game state.";
    }
    return `Trick ${currentState.trickNumber + 1}. Turn player ${currentState.currentTurnPlayerId}.`;
  }, [currentState]);

  return (
    <main className="mx-auto mt-4 w-full max-w-6xl px-4 pb-6">
      <p className="sr-only" aria-live="polite">{liveRegionText}</p>
      {!currentState ? (
        <section className="panel">
          <p className="text-sm text-slate-200">No active state yet. Start a round from Rules, then fetch state.</p>
          <div className="mt-3 flex gap-2">
            <button className="btn-secondary" onClick={() => navigate({ to: "/rules" })}>Go To Rules</button>
            <button className="btn-primary" onClick={game.getState}>Get State</button>
          </div>
        </section>
      ) : (
        <section className="relative rounded-3xl border border-white/20 bg-gradient-to-b from-felt-800 to-felt-900 p-4 shadow-2xl">
          <div className="mb-4 flex justify-center">
            {seatLayout.top ? (
              <PlayerSeat
                playerId={seatLayout.top.playerId}
                handCount={seatLayout.top.handCount}
                score={seatLayout.top.score}
                isLeader={currentState.leaderPlayerId === seatLayout.top.playerId}
                isTurn={currentState.currentTurnPlayerId === seatLayout.top.playerId}
                compact
              />
            ) : null}
          </div>

          <div className="mb-4 space-y-2 md:grid md:grid-cols-[1fr_auto_1fr] md:items-center md:gap-2 md:space-y-0">
            <div className="flex justify-center md:justify-start">
              {seatLayout.left ? (
                <PlayerSeat
                  playerId={seatLayout.left.playerId}
                  handCount={seatLayout.left.handCount}
                  score={seatLayout.left.score}
                  isLeader={currentState.leaderPlayerId === seatLayout.left.playerId}
                  isTurn={currentState.currentTurnPlayerId === seatLayout.left.playerId}
                  compact
                />
              ) : <div />}
            </div>
            <TrickPile
              trickNumber={currentState.trickNumber}
              leadSuit={leadSuit}
              cards={currentState.currentTrick ?? []}
              active
            />
            <div className="flex justify-center md:justify-end">
              {seatLayout.right ? (
                <PlayerSeat
                  playerId={seatLayout.right.playerId}
                  handCount={seatLayout.right.handCount}
                  score={seatLayout.right.score}
                  isLeader={currentState.leaderPlayerId === seatLayout.right.playerId}
                  isTurn={currentState.currentTurnPlayerId === seatLayout.right.playerId}
                  compact
                />
              ) : <div />}
            </div>
          </div>

          <div className="mx-auto mb-4 w-fit">
            <PlayerSeat
              playerId={yourId}
              handCount={yourHand.length}
              score={players.find((p) => p.playerId === yourId)?.score ?? 0}
              isYou
              isLeader={currentState.leaderPlayerId === yourId}
              isTurn={currentState.currentTurnPlayerId === yourId}
            />
          </div>

          <div className="panel bg-slate-950/40">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold text-slate-100">Your Hand</p>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-white/10 px-2 py-1 text-xs text-slate-200">
                  Turn: P{currentState.currentTurnPlayerId}
                </span>
                <button
                  className="btn-primary py-1.5 text-sm"
                  onClick={playSelectedCard}
                  disabled={!selectedCard || !game.canPlay || Boolean(animatingCard)}
                >
                  Play Selected
                </button>
              </div>
            </div>

            <p className="mb-2 text-xs text-slate-300" id="hand-help">
              Keyboard: left/right arrows select a legal card, Enter plays selected.
            </p>
            <div className="flex min-h-36 items-end justify-center overflow-x-auto pb-2" role="listbox" aria-labelledby="hand-help">
              <div className="flex items-end px-3">
                {yourHand.map((card, index) => {
                  const status = game.canPlayCard(card);
                  const selected = selectedCard === card;
                  const offset = (index - (yourHand.length - 1) / 2) * 12;
                  return (
                    <div
                      key={card}
                      className={["transition-transform", animatingCard === card ? "animate-play-out" : ""].join(" ")}
                      style={{ transform: `translateX(${offset}px)` }}
                    >
                      <PlayingCard
                        card={card}
                        size="lg"
                        selected={selected}
                        disabled={!status.allowed}
                        title={status.allowed ? "Select card" : status.reason}
                        onClick={() => {
                          if (!status.allowed) return;
                          if (selected) {
                            playSelectedCard();
                            return;
                          }
                          setSelectedCard(card);
                        }}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
            {selectedCard && !selectedPlayable ? (
              <p className="mt-2 text-xs text-rose-200">{selectedReason}</p>
            ) : null}
          </div>
        </section>
      )}

      {currentState ? (
        <TrickHistory tricks={game.completedTricks} activeTrickNumber={currentState.trickNumber} />
      ) : null}

      <section className="mt-4 panel" aria-live="polite">
        <h3 className="mb-2 text-sm font-semibold text-slate-100">Game Log</h3>
        {game.error ? <p className="mb-2 rounded-lg bg-rose-500/20 p-2 text-sm text-rose-100">{game.error}</p> : null}
        <ul className="max-h-36 space-y-1 overflow-auto text-xs text-slate-300" role="log" aria-label="Game event log">
          {game.events.map((event) => (
            <li key={event.id}>{event.text}</li>
          ))}
        </ul>
      </section>
    </main>
  );
}

function mapSeatLayout(others: PlayerView[]) {
  if (others.length === 1) {
    return { top: others[0], left: null, right: null };
  }
  if (others.length === 2) {
    return { top: null, left: others[0], right: others[1] };
  }
  return { top: others[0] ?? null, left: others[1] ?? null, right: others[2] ?? null };
}
