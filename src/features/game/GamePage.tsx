import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  MessageType,
  type PlayCardPayload,
  type PlayerView,
  type StartRoundPayload,
  type StateUpdatePayload,
} from "../../lib/protocol";
import { GameHeader } from "./components/GameHeader";
import { PlayerSeat } from "./components/PlayerSeat";
import { PlayingCard } from "./components/PlayingCard";
import { RoundCompleteModal } from "./components/RoundCompleteModal";
import { ToastStack, type ToastItem } from "./components/ToastStack";
import { TrickPile } from "./components/TrickPile";
import { computeEffectiveDeckInfo, validateCardTokens, validateRankTokens } from "./gameRules";
import { queryKey, useGameSession } from "./hooks/useGameSession";

type UIPhase = "lobby" | "ready" | "in_game" | "round_complete";

export function GamePage() {
  const qc = useQueryClient();
  const hasEverConnected = useRef(false);
  const prevConnected = useRef(false);

  const [wsUrl, setWsUrl] = useState(import.meta.env.VITE_WS_URL ?? "ws://localhost:8080/ws");
  const [gameId, setGameId] = useState("table-1");
  const [playerId, setPlayerId] = useState(1);
  const [seedInput, setSeedInput] = useState("42");
  const [excludedRanksInput, setExcludedRanksInput] = useState("");
  const [excludedCardsInput, setExcludedCardsInput] = useState("");

  const [selectedCard, setSelectedCard] = useState<string | null>(null);
  const [animatingCard, setAnimatingCard] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(true);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [roundWinner, setRoundWinner] = useState<number | null>(null);
  const [roundModalOpen, setRoundModalOpen] = useState(false);

  const onToast = useCallback((text: string, tone?: ToastItem["tone"]) => {
    pushToast(setToasts, text, tone);
  }, []);

  const session = useGameSession({
    onToast,
    onRoundComplete: useCallback((winnerPlayerId: number) => {
      setRoundWinner(winnerPlayerId);
      setRoundModalOpen(true);
    }, []),
  });

  const state = useQuery<StateUpdatePayload | null>({
    queryKey: session.joined ? queryKey(session.joined.gameId, session.joined.playerId) : ["game", "none", 0],
    queryFn: async () => null as StateUpdatePayload | null,
    enabled: false,
  });

  const rankValidation = useMemo(() => validateRankTokens(excludedRanksInput), [excludedRanksInput]);
  const cardValidation = useMemo(() => validateCardTokens(excludedCardsInput), [excludedCardsInput]);
  const canStartRound = Boolean(session.joined) && rankValidation.errors.length === 0 && cardValidation.errors.length === 0;

  const currentState = state.data;
  const yourId = currentState?.you ?? session.joined?.playerId ?? playerId;
  const players = currentState?.players ?? [];
  const yourHand = currentState?.yourHand ?? [];
  const leadSuit = currentState?.leadSuit ?? "";

  const connectedPlayers = session.joined?.connectedPlayers.length ?? 0;
  const playerCountForValidation = Math.max(connectedPlayers, 2);

  const effectiveDeckInfo = useMemo(
    () => computeEffectiveDeckInfo(rankValidation.values, cardValidation.values, playerCountForValidation),
    [cardValidation.values, playerCountForValidation, rankValidation.values],
  );

  const canPlay = useMemo(() => {
    if (!currentState) {
      return false;
    }
    return currentState.currentTurnPlayerId === currentState.you && currentState.yourHand.length > 0;
  }, [currentState]);

  const uiPhase: UIPhase = useMemo(() => {
    if (!session.joined) {
      return "lobby";
    }
    if (roundModalOpen) {
      return "round_complete";
    }
    if (!currentState || (currentState.yourHand.length === 0 && currentState.trickNumber === 0)) {
      return "ready";
    }
    return "in_game";
  }, [currentState, roundModalOpen, session.joined]);

  useEffect(() => {
    if (selectedCard && !yourHand.includes(selectedCard)) {
      setSelectedCard(null);
    }
  }, [selectedCard, yourHand]);

  useEffect(() => {
    if (session.connected) {
      hasEverConnected.current = true;
    }
    if (prevConnected.current !== session.connected) {
      if (session.connected) {
        pushToast(setToasts, "Connected to server", "success");
      } else if (hasEverConnected.current) {
        pushToast(setToasts, "Disconnected. Reconnecting...", "warning");
      }
      prevConnected.current = session.connected;
    }
  }, [session.connected]);

  const connectMutation = useMutation({
    mutationFn: async () => {
      session.connect(wsUrl);
    },
  });

  const joinMutation = useMutation({
    mutationFn: async () => {
      session.send({
        type: MessageType.JoinGame,
        payload: { gameId, playerId },
      });
    },
  });

  const startRoundMutation = useMutation({
    mutationFn: async () => {
      const seedNum = Number(seedInput);
      const payload: StartRoundPayload = {};
      if (Number.isFinite(seedNum)) {
        payload.seed = seedNum;
      }
      if (rankValidation.values.length > 0 || cardValidation.values.length > 0) {
        payload.rules = {
          excludedRanks: rankValidation.values,
          excludedCards: cardValidation.values,
        };
      }
      session.send({
        type: MessageType.StartRound,
        payload,
      });
      setRoundModalOpen(false);
    },
  });

  const getStateMutation = useMutation({
    mutationFn: async () => {
      session.send({
        type: MessageType.GetState,
        payload: {},
      });
    },
  });

  const playCardMutation = useMutation({
    mutationFn: async (payload: PlayCardPayload) => {
      session.send({
        type: MessageType.PlayCard,
        payload,
      });
      setSelectedCard(null);
    },
  });

  function canPlayCard(card: string): { allowed: boolean; reason?: string } {
    if (!currentState || !canPlay) {
      return { allowed: false, reason: "Not your turn" };
    }
    const trick = currentState.currentTrick ?? [];
    if (trick.length === 0) {
      return { allowed: true };
    }
    const trickLeadSuit = trick[0]?.card?.slice(-1) ?? "";
    const hasLeadSuit = yourHand.some((c: string) => c.endsWith(trickLeadSuit));
    if (hasLeadSuit && !card.endsWith(trickLeadSuit)) {
      return { allowed: false, reason: "Must follow suit" };
    }
    return { allowed: true };
  }

  const playSelectedCard = useCallback(() => {
    if (!selectedCard) {
      pushToast(setToasts, "Select a card first", "warning");
      return;
    }
    const status = canPlayCard(selectedCard);
    if (!status.allowed) {
      pushToast(setToasts, status.reason ?? "Illegal move", "error");
      return;
    }
    if (animatingCard) {
      return;
    }

    const cardToPlay = selectedCard;
    setAnimatingCard(cardToPlay);
    window.setTimeout(() => playCardMutation.mutate({ card: cardToPlay }), 160);
    window.setTimeout(() => {
      setAnimatingCard((prev) => (prev === cardToPlay ? null : prev));
    }, 520);
  }, [animatingCard, playCardMutation, selectedCard]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const tag = target?.tagName ?? "";
      if (tag === "INPUT" || tag === "TEXTAREA") {
        return;
      }
      if (event.key === "Enter" && canPlay) {
        event.preventDefault();
        playSelectedCard();
        return;
      }
      if ((event.key !== "ArrowRight" && event.key !== "ArrowLeft") || !canPlay || yourHand.length === 0) {
        return;
      }

      const legalCards = yourHand.filter((card: string) => canPlayCard(card).allowed);
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
  }, [canPlay, playSelectedCard, selectedCard, yourHand]);

  const otherPlayers = players.filter((p) => p.playerId !== yourId);
  const seatLayout = mapSeatLayout(otherPlayers);
  const selectedPlayable = selectedCard ? canPlayCard(selectedCard).allowed : false;
  const selectedReason = selectedCard ? canPlayCard(selectedCard).reason : undefined;
  const showReconnectBanner = hasEverConnected.current && !session.connected;

  const liveRegionText = currentState
    ? `Trick ${currentState.trickNumber + 1}. Turn player ${currentState.currentTurnPlayerId}.`
    : "Waiting for game state.";

  return (
    <div className="min-h-screen bg-gradient-to-b from-felt-900 via-felt-800 to-felt-700">
      <p className="sr-only" aria-live="polite">{liveRegionText}</p>
      <GameHeader
        gameId={gameId}
        connected={session.connected}
        onToggleSettings={() => setSettingsOpen((v) => !v)}
        onExit={() => {
          session.disconnect();
          session.resetSession();
          setRoundModalOpen(false);
          setRoundWinner(null);
          setSelectedCard(null);
          setAnimatingCard(null);
          qc.removeQueries({ queryKey: ["game"] });
        }}
      />
      <ToastStack toasts={toasts} onDismiss={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))} />
      <RoundCompleteModal
        winnerPlayerId={roundWinner}
        open={roundModalOpen}
        onClose={() => setRoundModalOpen(false)}
        onPlayAgain={() => startRoundMutation.mutate()}
      />

      {showReconnectBanner ? (
        <div className="mx-auto mt-3 w-full max-w-6xl px-4">
          <div className="panel flex flex-wrap items-center justify-between gap-2 border-amber-300/50 bg-amber-500/20 text-amber-50">
            <p className="text-sm">Connection lost. Trying to reconnect automatically.</p>
            <button type="button" className="btn-secondary py-1.5 text-sm" onClick={() => session.reconnectNow()}>
              Retry now
            </button>
          </div>
        </div>
      ) : null}

      {settingsOpen ? (
        <section className="mx-auto mt-4 grid w-full max-w-6xl gap-3 px-4 md:grid-cols-2">
          <div className="panel">
            <h2 className="mb-2 text-sm font-semibold text-slate-200">Connection</h2>
            <div className="grid gap-2">
              <label className="text-xs text-slate-300">
                WS URL
                <input
                  className="mt-1 w-full rounded-xl border border-white/20 bg-slate-900 px-3 py-2 text-sm text-slate-100"
                  value={wsUrl}
                  onChange={(e) => setWsUrl(e.target.value)}
                />
              </label>
              <label className="text-xs text-slate-300">
                Game ID
                <input
                  className="mt-1 w-full rounded-xl border border-white/20 bg-slate-900 px-3 py-2 text-sm text-slate-100"
                  value={gameId}
                  onChange={(e) => setGameId(e.target.value)}
                />
              </label>
              <label className="text-xs text-slate-300">
                Player ID
                <input
                  type="number"
                  min={1}
                  className="mt-1 w-full rounded-xl border border-white/20 bg-slate-900 px-3 py-2 text-sm text-slate-100"
                  value={playerId}
                  onChange={(e) => setPlayerId(Number(e.target.value))}
                />
              </label>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <button className="btn-primary" onClick={() => connectMutation.mutate()} disabled={session.connected}>
                Connect
              </button>
              <button className="btn-secondary" onClick={() => session.disconnect()} disabled={!session.connected}>
                Disconnect
              </button>
              <button className="btn-secondary" onClick={() => joinMutation.mutate()} disabled={!session.connected}>
                Join Game
              </button>
              <button className="btn-secondary" onClick={() => getStateMutation.mutate()} disabled={!session.joined}>
                Get State
              </button>
            </div>
          </div>

          <div className="panel">
            <h2 className="mb-2 text-sm font-semibold text-slate-200">Round Settings</h2>
            <div className="grid gap-2">
              <label className="text-xs text-slate-300">
                Seed (optional)
                <input
                  className="mt-1 w-full rounded-xl border border-white/20 bg-slate-900 px-3 py-2 text-sm text-slate-100"
                  value={seedInput}
                  onChange={(e) => setSeedInput(e.target.value)}
                />
              </label>
              <label className="text-xs text-slate-300">
                Excluded ranks
                <input
                  className={[
                    "mt-1 w-full rounded-xl border bg-slate-900 px-3 py-2 text-sm text-slate-100",
                    rankValidation.errors.length > 0 ? "border-rose-400" : "border-white/20",
                  ].join(" ")}
                  value={excludedRanksInput}
                  onChange={(e) => setExcludedRanksInput(e.target.value)}
                  placeholder="2,3,4,5"
                />
              </label>
              {rankValidation.errors.map((msg) => (
                <p key={msg} className="text-xs text-rose-200">{msg}</p>
              ))}
              {rankValidation.values.length > 0 ? (
                <div className="flex flex-wrap gap-1">
                  {rankValidation.values.map((rank) => (
                    <span key={rank} className="chip">{rank}</span>
                  ))}
                </div>
              ) : null}
              <label className="text-xs text-slate-300">
                Excluded cards
                <input
                  className={[
                    "mt-1 w-full rounded-xl border bg-slate-900 px-3 py-2 text-sm text-slate-100",
                    cardValidation.errors.length > 0 ? "border-rose-400" : "border-white/20",
                  ].join(" ")}
                  value={excludedCardsInput}
                  onChange={(e) => setExcludedCardsInput(e.target.value)}
                  placeholder="AS,KH"
                />
              </label>
              {cardValidation.errors.map((msg) => (
                <p key={msg} className="text-xs text-rose-200">{msg}</p>
              ))}
              {cardValidation.values.length > 0 ? (
                <div className="flex flex-wrap gap-1">
                  {cardValidation.values.map((card) => (
                    <span key={card} className="chip">{card}</span>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="mt-3 rounded-xl border border-white/10 bg-slate-900/70 p-2 text-xs text-slate-200">
              <p>Effective deck size: {effectiveDeckInfo.size}</p>
              <p>Needed for round: {effectiveDeckInfo.minimumRequired} cards ({playerCountForValidation} players x 5)</p>
              {!effectiveDeckInfo.enoughForRound ? (
                <p className="mt-1 text-rose-200">Deck too small for configured players.</p>
              ) : null}
            </div>

            <div className="mt-3 flex items-center gap-2">
              <button
                className="btn-primary"
                onClick={() => startRoundMutation.mutate()}
                disabled={!canStartRound || !effectiveDeckInfo.enoughForRound}
              >
                Start Round
              </button>
              <span className="rounded-full bg-white/10 px-2 py-1 text-xs text-slate-200">State: {uiPhase}</span>
            </div>
          </div>
        </section>
      ) : null}

      <main className="mx-auto mt-4 w-full max-w-6xl px-4 pb-6">
        <section className="relative rounded-3xl border border-white/20 bg-gradient-to-b from-felt-800 to-felt-900 p-4 shadow-2xl">
          {uiPhase === "lobby" ? (
            <div className="mb-3 rounded-xl border border-cyan-300/40 bg-cyan-500/15 p-3 text-sm text-cyan-50">
              Connect and join a room to enter the table.
            </div>
          ) : null}
          {uiPhase === "ready" ? (
            <div className="mb-3 rounded-xl border border-amber-300/40 bg-amber-500/15 p-3 text-sm text-amber-50">
              Ready state: start a new round when all players are connected.
            </div>
          ) : null}

          <div className="mb-4 flex justify-center">
            {seatLayout.top ? (
              <PlayerSeat
                playerId={seatLayout.top.playerId}
                handCount={seatLayout.top.handCount}
                isLeader={currentState?.leaderPlayerId === seatLayout.top.playerId}
                isTurn={currentState?.currentTurnPlayerId === seatLayout.top.playerId}
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
                  isLeader={currentState?.leaderPlayerId === seatLayout.left.playerId}
                  isTurn={currentState?.currentTurnPlayerId === seatLayout.left.playerId}
                  compact
                />
              ) : <div />}
            </div>
            <TrickPile trickNumber={currentState?.trickNumber ?? 0} leadSuit={leadSuit} cards={currentState?.currentTrick ?? []} />
            <div className="flex justify-center md:justify-end">
              {seatLayout.right ? (
                <PlayerSeat
                  playerId={seatLayout.right.playerId}
                  handCount={seatLayout.right.handCount}
                  isLeader={currentState?.leaderPlayerId === seatLayout.right.playerId}
                  isTurn={currentState?.currentTurnPlayerId === seatLayout.right.playerId}
                  compact
                />
              ) : <div />}
            </div>
          </div>

          <div className="mx-auto mb-4 w-fit">
            {currentState ? (
              <PlayerSeat
                playerId={yourId}
                handCount={yourHand.length}
                isYou
                isLeader={currentState.leaderPlayerId === yourId}
                isTurn={currentState.currentTurnPlayerId === yourId}
              />
            ) : null}
          </div>

          <div className="panel bg-slate-950/40">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold text-slate-100">Your Hand</p>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-white/10 px-2 py-1 text-xs text-slate-200">
                  Turn: P{currentState?.currentTurnPlayerId ?? "-"}
                </span>
                <button
                  className="btn-primary py-1.5 text-sm"
                  onClick={playSelectedCard}
                  disabled={!selectedCard || !canPlay || Boolean(animatingCard)}
                  aria-disabled={!selectedCard || !canPlay || Boolean(animatingCard)}
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
                {yourHand.map((card: string, index: number) => {
                  const status = canPlayCard(card);
                  const selected = selectedCard === card;
                  const offset = (index - (yourHand.length - 1) / 2) * 12;
                  return (
                    <div
                      key={card}
                      className={[
                        "transition-transform",
                        animatingCard === card ? "animate-play-out" : "",
                      ].join(" ")}
                      style={{ transform: `translateX(${offset}px)` }}
                    >
                      <PlayingCard
                        card={card}
                        size="lg"
                        selected={selected}
                        disabled={!status.allowed}
                        title={status.allowed ? "Select card" : status.reason}
                        onClick={() => {
                          if (!status.allowed) {
                            pushToast(setToasts, status.reason ?? "Illegal move", "error");
                            return;
                          }
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

        <section className="mt-4 panel" aria-live="polite">
          <h3 className="mb-2 text-sm font-semibold text-slate-100">Game Log</h3>
          {session.error ? <p className="mb-2 rounded-lg bg-rose-500/20 p-2 text-sm text-rose-100">{session.error}</p> : null}
          <ul className="max-h-36 space-y-1 overflow-auto text-xs text-slate-300" role="log" aria-label="Game event log">
            {session.events.map((event) => (
              <li key={event.id}>{event.text}</li>
            ))}
          </ul>
        </section>
      </main>
    </div>
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

function pushToast(
  setToasts: Dispatch<SetStateAction<ToastItem[]>>,
  text: string,
  tone: ToastItem["tone"] = "info",
  durationMs = 2600,
) {
  const id = Date.now() + Math.floor(Math.random() * 1000);
  setToasts((prev) => [...prev, { id, text, tone }]);
  window.setTimeout(() => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, durationMs);
}
