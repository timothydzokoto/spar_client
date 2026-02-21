# Trickleader TanStack Client

## Run

```powershell
cd client
pnpm install
pnpm run dev
```

Dev server URL is shown by Vite (usually `http://localhost:5173`).

## Backend

Start backend first:

```powershell
cd ..
go run ./cmd/trickleaderd -addr :8080
```

Then in the web UI:
- WS URL: `ws://localhost:8080/ws`
- Game ID: any string (for example `table-1`)
- Player ID: numeric (for example `1` or `2`)

## Flow

1. Connect
2. Join Game
3. Start Round
   - Optional: set excluded ranks/cards before starting.
4. Play cards when it is your turn
5. Use Get State after reconnect/resume
