import { Outlet, useNavigate } from "@tanstack/react-router";
import { GameHeader } from "../components/GameHeader";
import { RoundCompleteModal } from "../components/RoundCompleteModal";
import { ToastStack } from "../components/ToastStack";
import { useGameApp } from "../context/GameAppContext";

export function GameFlowLayout() {
  const navigate = useNavigate();
  const game = useGameApp();

  return (
    <div className="min-h-screen bg-gradient-to-b from-felt-900 via-felt-800 to-felt-700">
      <GameHeader
        gameId={game.gameId}
        connected={game.connected}
        onToggleSettings={() => navigate({ to: "/rules" })}
        onExit={() => {
          game.exitSession();
          navigate({ to: "/connect" });
        }}
      />
      <ToastStack toasts={game.toasts} onDismiss={game.dismissToast} />
      <RoundCompleteModal
        winnerPlayerId={game.roundWinner}
        open={game.roundModalOpen}
        onClose={game.closeRoundModal}
        onPlayAgain={() => {
          game.startRound();
          navigate({ to: "/table" });
        }}
      />
      {!game.connected && game.joined ? (
        <div className="mx-auto mt-3 w-full max-w-6xl px-4">
          <div className="panel flex flex-wrap items-center justify-between gap-2 border-amber-300/50 bg-amber-500/20 text-amber-50">
            <p className="text-sm">Connection lost. Trying to reconnect automatically.</p>
            <button type="button" className="btn-secondary py-1.5 text-sm" onClick={game.reconnectNow}>
              Retry now
            </button>
          </div>
        </div>
      ) : null}
      <Outlet />
    </div>
  );
}
