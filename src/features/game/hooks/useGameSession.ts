import { useEffect, useRef, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { GameSocket } from "../../../lib/gameSocket";
import {
  MessageType,
  type Envelope,
  type ErrorPayload,
  type InboundEnvelope,
  type JoinedPayload,
  type RoundCompletePayload,
  type StateUpdatePayload,
  type TrickCompletePayload,
} from "../../../lib/protocol";

export type EventLog = {
  id: number;
  text: string;
};

export type ToastTone = "info" | "success" | "warning" | "error";

export const queryKey = (gameId: string, playerId: number) => ["game", gameId, playerId] as const;

type UseGameSessionProps = {
  onToast: (text: string, tone?: ToastTone) => void;
  onRoundComplete: (winnerPlayerId: number) => void;
};

export function useGameSession({ onToast, onRoundComplete }: UseGameSessionProps) {
  const queryClient = useQueryClient();
  const socketRef = useRef<GameSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const [joined, setJoined] = useState<JoinedPayload | null>(null);
  const [error, setError] = useState("");
  const [events, setEvents] = useState<EventLog[]>([]);

  useEffect(() => {
    const socket = new GameSocket();
    socketRef.current = socket;

    const offStatus = socket.onStatus((next) => setConnected(next));
    const offMessage = socket.onMessage((message) => {
      handleInbound(message, queryClient, setJoined, setError, setEvents, onToast, onRoundComplete);
    });

    return () => {
      offStatus();
      offMessage();
      socket.disconnect();
      socketRef.current = null;
    };
  }, [onRoundComplete, onToast, queryClient]);

  function connect(url: string): void {
    socketRef.current?.connect(url);
  }

  function disconnect(): void {
    socketRef.current?.disconnect();
  }

  function reconnectNow(): void {
    socketRef.current?.reconnectNow();
  }

  function send<T>(envelope: Envelope<T>): boolean {
    const ok = socketRef.current?.send(envelope) ?? false;
    if (!ok) {
      setError("WebSocket is not connected");
      onToast("Message not sent: socket disconnected", "error");
    }
    return ok;
  }

  function clearError(): void {
    setError("");
  }

  function resetSession(): void {
    setJoined(null);
    setError("");
    setEvents([]);
  }

  return {
    connected,
    joined,
    error,
    events,
    connect,
    disconnect,
    reconnectNow,
    send,
    clearError,
    resetSession,
  };
}

function handleInbound(
  envelope: InboundEnvelope,
  queryClient: ReturnType<typeof useQueryClient>,
  setJoined: Dispatch<SetStateAction<JoinedPayload | null>>,
  setError: Dispatch<SetStateAction<string>>,
  setEvents: Dispatch<SetStateAction<EventLog[]>>,
  onToast: (text: string, tone?: ToastTone) => void,
  onRoundComplete: (winnerPlayerId: number) => void,
) {
  switch (envelope.type) {
    case MessageType.Joined: {
      const payload = envelope.payload as JoinedPayload;
      setJoined(payload);
      setError("");
      pushEvent(setEvents, `Joined ${payload.gameId}. Connected: ${payload.connectedPlayers.join(", ")}`);
      return;
    }
    case MessageType.StateUpdate: {
      const payload = envelope.payload as StateUpdatePayload;
      const normalized: StateUpdatePayload = {
        ...payload,
        currentTrick: payload.currentTrick ?? [],
        players: payload.players ?? [],
        yourHand: payload.yourHand ?? [],
      };
      queryClient.setQueryData(queryKey(normalized.gameId, normalized.you), normalized);
      setError("");
      return;
    }
    case MessageType.TrickComplete: {
      const payload = envelope.payload as TrickCompletePayload;
      pushEvent(
        setEvents,
        `Trick ${payload.trickNumber} winner: P${payload.winnerPlayerId} (${payload.plays
          .map((p) => `P${p.playerId}:${p.card}`)
          .join(", ")})`,
      );
      onToast(`Trick ${payload.trickNumber}: P${payload.winnerPlayerId} won`, "info");
      return;
    }
    case MessageType.RoundComplete: {
      const payload = envelope.payload as RoundCompletePayload;
      pushEvent(setEvents, `Round complete. Winner: P${payload.winnerPlayerId}`);
      onToast(`Round winner: Player ${payload.winnerPlayerId}`, "success");
      onRoundComplete(payload.winnerPlayerId);
      return;
    }
    case MessageType.Error: {
      const payload = envelope.payload as ErrorPayload;
      setError(payload.message);
      pushEvent(setEvents, `Error: ${payload.message}`);
      onToast(payload.message, "error");
      return;
    }
    default:
      return;
  }
}

function pushEvent(setEvents: Dispatch<SetStateAction<EventLog[]>>, text: string) {
  setEvents((prev) => [...prev, { id: Date.now() + Math.floor(Math.random() * 1000), text }].slice(-20));
}
