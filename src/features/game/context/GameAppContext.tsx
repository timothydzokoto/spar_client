import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import type { PropsWithChildren } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  MessageType,
  type StartRoundPayload,
  type StateUpdatePayload,
  type TrickCompletePayload,
} from "../../../lib/protocol";
import { computeEffectiveDeckInfo, validateCardTokens, validateRankTokens } from "../gameRules";
import { queryKey, useGameSession } from "../hooks/useGameSession";
import type { ToastItem } from "../components/ToastStack";

type GameAppContextValue = {
  wsUrl: string;
  setWsUrl: (value: string) => void;
  gameId: string;
  setGameId: (value: string) => void;
  playerId: number;
  setPlayerId: (value: number) => void;
  seedInput: string;
  setSeedInput: (value: string) => void;
  excludedRanksInput: string;
  setExcludedRanksInput: (value: string) => void;
  excludedCardsInput: string;
  setExcludedCardsInput: (value: string) => void;
  connected: boolean;
  joined: ReturnType<typeof useGameSession>["joined"];
  error: string;
  events: ReturnType<typeof useGameSession>["events"];
  currentState: StateUpdatePayload | null;
  rankValidation: ReturnType<typeof validateRankTokens>;
  cardValidation: ReturnType<typeof validateCardTokens>;
  effectiveDeckInfo: ReturnType<typeof computeEffectiveDeckInfo>;
  canStartRound: boolean;
  canPlay: boolean;
  connect: () => void;
  disconnect: () => void;
  reconnectNow: () => void;
  join: () => void;
  startRound: () => void;
  getState: () => void;
  playCard: (card: string) => void;
  canPlayCard: (card: string) => { allowed: boolean; reason?: string };
  exitSession: () => void;
  toasts: ToastItem[];
  dismissToast: (id: number) => void;
  roundWinner: number | null;
  roundModalOpen: boolean;
  closeRoundModal: () => void;
  completedTricks: TrickCompletePayload[];
};

const GameAppContext = createContext<GameAppContextValue | null>(null);

export function GameAppProvider({ children }: PropsWithChildren) {
  const queryClient = useQueryClient();
  const [wsUrl, setWsUrl] = useState(import.meta.env.VITE_WS_URL ?? "ws://localhost:8080/ws");
  const [gameId, setGameId] = useState("table-1");
  const [playerId, setPlayerId] = useState(1);
  const [seedInput, setSeedInput] = useState("42");
  const [excludedRanksInput, setExcludedRanksInput] = useState("");
  const [excludedCardsInput, setExcludedCardsInput] = useState("");
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [roundWinner, setRoundWinner] = useState<number | null>(null);
  const [roundModalOpen, setRoundModalOpen] = useState(false);
  const [completedTricks, setCompletedTricks] = useState<TrickCompletePayload[]>([]);
  const hasEverConnected = useRef(false);

  const onToast = useCallback((text: string, tone: ToastItem["tone"] = "info", durationMs = 2600) => {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    setToasts((prev) => [...prev, { id, text, tone }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, durationMs);
  }, []);

  const handleRoundComplete = useCallback((winnerPlayerId: number) => {
    setRoundWinner(winnerPlayerId);
    setRoundModalOpen(true);
  }, []);

  const handleTrickComplete = useCallback((payload: TrickCompletePayload) => {
    setCompletedTricks((prev) => {
      const withoutDuplicate = prev.filter((trick) => trick.trickNumber !== payload.trickNumber);
      return [...withoutDuplicate, payload].sort((a, b) => a.trickNumber - b.trickNumber);
    });
  }, []);

  const session = useGameSession({
    onToast,
    onRoundComplete: handleRoundComplete,
    onTrickComplete: handleTrickComplete,
  });

  if (session.connected) {
    hasEverConnected.current = true;
  }

  const stateQuery = useQuery<StateUpdatePayload | null>({
    queryKey: session.joined ? queryKey(session.joined.gameId, session.joined.playerId) : ["game", "none", 0],
    queryFn: async () => null as StateUpdatePayload | null,
    enabled: false,
  });

  const currentState = stateQuery.data ?? null;
  const rankValidation = useMemo(() => validateRankTokens(excludedRanksInput), [excludedRanksInput]);
  const cardValidation = useMemo(() => validateCardTokens(excludedCardsInput), [excludedCardsInput]);

  const connectedPlayers = session.joined?.connectedPlayers.length ?? 0;
  const playerCountForValidation = Math.max(connectedPlayers, 2);
  const effectiveDeckInfo = useMemo(
    () => computeEffectiveDeckInfo(rankValidation.values, cardValidation.values, playerCountForValidation),
    [cardValidation.values, playerCountForValidation, rankValidation.values],
  );

  const canStartRound = Boolean(session.joined)
    && rankValidation.errors.length === 0
    && cardValidation.errors.length === 0
    && effectiveDeckInfo.enoughForRound;

  const canPlay = Boolean(
    currentState
      && currentState.currentTurnPlayerId === currentState.you
      && currentState.yourHand.length > 0,
  );

  function connect() {
    session.connect(wsUrl);
    onToast("Connected to server", "success");
  }

  function disconnect() {
    session.disconnect();
    if (hasEverConnected.current) {
      onToast("Disconnected", "warning");
    }
  }

  function reconnectNow() {
    session.reconnectNow();
  }

  function join() {
    session.send({
      type: MessageType.JoinGame,
      payload: { gameId, playerId },
    });
  }

  function startRound() {
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
    setCompletedTricks([]);
    setRoundModalOpen(false);
  }

  function getState() {
    session.send({
      type: MessageType.GetState,
      payload: {},
    });
  }

  function playCard(card: string) {
    session.send({
      type: MessageType.PlayCard,
      payload: { card },
    });
  }

  function canPlayCard(card: string): { allowed: boolean; reason?: string } {
    if (!currentState || !canPlay) {
      return { allowed: false, reason: "Not your turn" };
    }
    const trick = currentState.currentTrick ?? [];
    if (trick.length === 0) {
      return { allowed: true };
    }
    const trickLeadSuit = trick[0]?.card?.slice(-1) ?? "";
    const hasLeadSuit = currentState.yourHand.some((c) => c.endsWith(trickLeadSuit));
    if (hasLeadSuit && !card.endsWith(trickLeadSuit)) {
      return { allowed: false, reason: "Must follow suit" };
    }
    return { allowed: true };
  }

  function exitSession() {
    session.disconnect();
    session.resetSession();
    setRoundModalOpen(false);
    setRoundWinner(null);
    setCompletedTricks([]);
    queryClient.removeQueries({ queryKey: ["game"] });
  }

  const value: GameAppContextValue = {
    wsUrl,
    setWsUrl,
    gameId,
    setGameId,
    playerId,
    setPlayerId,
    seedInput,
    setSeedInput,
    excludedRanksInput,
    setExcludedRanksInput,
    excludedCardsInput,
    setExcludedCardsInput,
    connected: session.connected,
    joined: session.joined,
    error: session.error,
    events: session.events,
    currentState,
    rankValidation,
    cardValidation,
    effectiveDeckInfo,
    canStartRound,
    canPlay,
    connect,
    disconnect,
    reconnectNow,
    join,
    startRound,
    getState,
    playCard,
    canPlayCard,
    exitSession,
    toasts,
    dismissToast: (id) => setToasts((prev) => prev.filter((t) => t.id !== id)),
    roundWinner,
    roundModalOpen,
    closeRoundModal: () => setRoundModalOpen(false),
    completedTricks,
  };

  return <GameAppContext.Provider value={value}>{children}</GameAppContext.Provider>;
}

export function useGameApp() {
  const value = useContext(GameAppContext);
  if (!value) {
    throw new Error("useGameApp must be used within GameAppProvider");
  }
  return value;
}
