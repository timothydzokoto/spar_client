import { WebSocketServer, type WebSocket } from "ws";

type ClientEnvelope = {
  type: string;
  payload: unknown;
};

type StartRoundPayload = {
  seed?: number;
  rules?: {
    excludedRanks?: string[];
    excludedCards?: string[];
  };
};

const HEART_RANK_ORDER: Record<string, number> = {
  "2": 2,
  "3": 3,
  "4": 4,
  "5": 5,
  "6": 6,
  "7": 7,
  "8": 8,
  "9": 9,
  "10": 10,
  J: 11,
  Q: 12,
  K: 13,
  A: 14,
};

export class MockGameServer {
  private readonly wss: WebSocketServer;
  private hand = ["9H", "KS", "AH"];
  private youScore = 0;
  private opponentScore = 0;
  private readonly gameId = "table-1";
  private readonly you = 1;
  private readonly opponent = 2;

  constructor(port = 8099) {
    this.wss = new WebSocketServer({ port, path: "/ws" });
    this.wss.on("connection", (ws) => {
      ws.on("message", (raw) => this.handleClientMessage(ws, String(raw)));
    });
  }

  async stop(): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      this.wss.close((err) => (err ? reject(err) : resolve()));
    });
  }

  private handleClientMessage(ws: WebSocket, raw: string): void {
    let envelope: ClientEnvelope;
    try {
      envelope = JSON.parse(raw) as ClientEnvelope;
    } catch {
      return;
    }

    switch (envelope.type) {
      case "join_game":
        this.send(ws, "joined", {
          gameId: this.gameId,
          playerId: this.you,
          connectedPlayers: [1, 2],
        });
        break;
      case "start_round":
        this.handleStartRound(ws, envelope.payload as StartRoundPayload);
        break;
      case "get_state":
        this.sendState(ws);
        break;
      case "play_card":
        this.handlePlayCard(ws, envelope.payload as { card?: string });
        break;
      default:
        this.send(ws, "error", { message: `Unsupported message: ${envelope.type}` });
    }
  }

  private handleStartRound(ws: WebSocket, payload: StartRoundPayload): void {
    this.youScore = 0;
    this.opponentScore = 0;
    if (payload?.rules?.excludedRanks?.includes("A")) {
      this.hand = ["9H", "KS", "QH"];
    } else {
      this.hand = ["9H", "KS", "AH"];
    }
    this.sendState(ws);
  }

  private handlePlayCard(ws: WebSocket, payload: { card?: string }): void {
    const card = payload?.card;
    if (!card || !this.hand.includes(card)) {
      this.send(ws, "error", { message: "Invalid card payload" });
      return;
    }

    const leadSuit = "H";
    const hasLeadSuit = this.hand.some((c) => c.endsWith(leadSuit));
    if (hasLeadSuit && !card.endsWith(leadSuit)) {
      this.send(ws, "error", { message: "Must follow suit" });
      return;
    }

    this.hand = this.hand.filter((c) => c !== card);
    const opponentCard = "7H";
    const winnerPlayerId = getWinner(card, opponentCard);
    const winnerCard = winnerPlayerId === this.you ? card : opponentCard;
    const trickPoints = scoreForCard(winnerCard);
    if (winnerPlayerId === this.you) {
      this.youScore += trickPoints;
    } else {
      this.opponentScore += trickPoints;
    }

    this.send(ws, "trick_complete", {
      gameId: this.gameId,
      trickNumber: 0,
      leadSuit,
      plays: [
        { playerId: this.opponent, card: opponentCard },
        { playerId: this.you, card },
      ],
      winnerPlayerId,
      winnerCard,
      trickPoints,
      winnerScoreTotal: winnerPlayerId === this.you ? this.youScore : this.opponentScore,
    });

    this.send(ws, "state_update", {
      gameId: this.gameId,
      you: this.you,
      leaderPlayerId: winnerPlayerId,
      currentTurnPlayerId: winnerPlayerId,
      trickNumber: 1,
      leadSuit: "",
      currentTrick: [],
      yourHand: this.hand,
      players: [
        { playerId: this.you, handCount: this.hand.length, score: this.youScore },
        { playerId: this.opponent, handCount: 2, score: this.opponentScore },
      ],
    });
  }

  private sendState(ws: WebSocket): void {
    this.send(ws, "state_update", {
      gameId: this.gameId,
      you: this.you,
      leaderPlayerId: this.opponent,
      currentTurnPlayerId: this.you,
      trickNumber: 0,
      leadSuit: "H",
      currentTrick: [{ playerId: this.opponent, card: "7H" }],
      yourHand: this.hand,
      players: [
        { playerId: this.you, handCount: this.hand.length, score: this.youScore },
        { playerId: this.opponent, handCount: 3, score: this.opponentScore },
      ],
    });
  }

  private send(ws: WebSocket, type: string, payload: unknown): void {
    ws.send(JSON.stringify({ type, payload }));
  }
}

function scoreForCard(card: string): number {
  const rank = card.slice(0, -1);
  if (rank === "6") {
    return 3;
  }
  if (rank === "7") {
    return 2;
  }
  return 1;
}

function getWinner(youCard: string, opponentCard: string): number {
  const yourRank = HEART_RANK_ORDER[youCard.slice(0, -1)] ?? 0;
  const opponentRank = HEART_RANK_ORDER[opponentCard.slice(0, -1)] ?? 0;
  return yourRank >= opponentRank ? 1 : 2;
}
