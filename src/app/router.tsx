import { createRootRoute, createRoute, createRouter } from "@tanstack/react-router";
import { GameAppProvider } from "../features/game/context/GameAppContext";
import { ConnectionScreen } from "../features/game/screens/ConnectionScreen";
import { GameFlowLayout } from "../features/game/screens/GameFlowLayout";
import { RulesScreen } from "../features/game/screens/RulesScreen";
import { TableScreen } from "../features/game/screens/TableScreen";

function RootLayout() {
  return (
    <GameAppProvider>
      <GameFlowLayout />
    </GameAppProvider>
  );
}

const rootRoute = createRootRoute({
  component: RootLayout,
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: ConnectionScreen,
});

const connectRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/connect",
  component: ConnectionScreen,
});

const rulesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/rules",
  component: RulesScreen,
});

const tableRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/table",
  component: TableScreen,
});

const routeTree = rootRoute.addChildren([indexRoute, connectRoute, rulesRoute, tableRoute]);

export const router = createRouter({
  routeTree,
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
