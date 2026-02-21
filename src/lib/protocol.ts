export const MessageType = {
  JoinGame: "join_game",
  Joined: "joined",
  StartRound: "start_round",
  GetState: "get_state",
  PlayCard: "play_card",
  StateUpdate: "state_update",
  TrickComplete: "trick_complete",
  RoundComplete: "round_complete",
  Error: "error",
} as const;

export type MessageType = (typeof MessageType)[keyof typeof MessageType];

export type Envelope<T = unknown> = {
  type: MessageType | string;
  payload: T;
};

export type JoinGamePayload = {
  gameId: string;
  playerId: number;
};

export type JoinedPayload = {
  gameId: string;
  playerId: number;
  connectedPlayers: number[];
};

export type StartRoundPayload = {
  seed?: number;
  rules?: {
    excludedRanks?: string[];
    excludedCards?: string[];
  };
};

export type PlayCardPayload = {
  card: string;
};

export type PlayerView = {
  playerId: number;
  handCount: number;
  score: number;
};

export type PlayedCardView = {
  playerId: number;
  card: string;
};

export type StateUpdatePayload = {
  gameId: string;
  you: number;
  leaderPlayerId: number;
  currentTurnPlayerId: number;
  trickNumber: number;
  leadSuit?: string;
  currentTrick: PlayedCardView[];
  yourHand: string[];
  players: PlayerView[];
};

export type TrickCompletePayload = {
  gameId: string;
  trickNumber: number;
  leadSuit: string;
  plays: PlayedCardView[];
  winnerPlayerId: number;
  winnerCard: string;
  trickPoints: number;
  winnerScoreTotal: number;
};

export type RoundCompletePayload = {
  gameId: string;
  winnerPlayerId: number;
  finalScores: Record<string, number>;
  winnerTotalPoints: number;
};

export type ErrorPayload = {
  message: string;
};

export type InboundEnvelope =
  | Envelope<JoinedPayload>
  | Envelope<StateUpdatePayload>
  | Envelope<TrickCompletePayload>
  | Envelope<RoundCompletePayload>
  | Envelope<ErrorPayload>;
