import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        // Prototype mock API — avoid aggressive reloads that feel like a stuck overlay.
        staleTime: 5_000,
        refetchOnWindowFocus: false,
      },
    },
  });

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
    // Only show pending UI for genuinely slow navigations — not every transition.
    defaultPendingMs: 800,
    defaultPendingMinMs: 0,
    defaultPendingComponent: () => null,
  });

  return router;
};
