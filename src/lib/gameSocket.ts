import type { Envelope, InboundEnvelope } from "./protocol";

type Listener = (message: InboundEnvelope) => void;
type StatusListener = (connected: boolean) => void;

export class GameSocket {
  private ws: WebSocket | null = null;
  private listeners = new Set<Listener>();
  private statusListeners = new Set<StatusListener>();
  private url: string | null = null;
  private manualClose = false;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly reconnectDelayMs = 1500;

  connect(url: string): void {
    this.url = url;
    this.manualClose = false;
    this.clearReconnectTimer();
    this.openSocket(url);
  }

  disconnect(): void {
    this.manualClose = true;
    this.clearReconnectTimer();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.emitStatus(false);
  }

  reconnectNow(): void {
    if (!this.url) {
      return;
    }
    this.manualClose = false;
    this.clearReconnectTimer();
    this.openSocket(this.url);
  }

  send<T>(envelope: Envelope<T>): boolean {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return false;
    }
    this.ws.send(JSON.stringify(envelope));
    return true;
  }

  onMessage(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  onStatus(listener: StatusListener): () => void {
    this.statusListeners.add(listener);
    return () => this.statusListeners.delete(listener);
  }

  private openSocket(url: string): void {
    if (this.ws) {
      this.ws.close();
    }
    this.ws = new WebSocket(url);

    this.ws.onopen = () => {
      this.clearReconnectTimer();
      this.emitStatus(true);
    };
    this.ws.onclose = () => {
      this.emitStatus(false);
      if (!this.manualClose) {
        this.scheduleReconnect();
      }
    };
    this.ws.onerror = () => this.emitStatus(false);
    this.ws.onmessage = (event) => {
      try {
        const parsed = JSON.parse(String(event.data)) as InboundEnvelope;
        this.listeners.forEach((listener) => listener(parsed));
      } catch {
        // Ignore malformed messages.
      }
    };
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer || !this.url) {
      return;
    }
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      if (!this.manualClose && this.url) {
        this.openSocket(this.url);
      }
    }, this.reconnectDelayMs);
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private emitStatus(connected: boolean): void {
    this.statusListeners.forEach((listener) => listener(connected));
  }
}
