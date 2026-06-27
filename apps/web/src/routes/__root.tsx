import { TanStackDevtools } from "@tanstack/react-devtools";
import type { QueryClient } from "@tanstack/react-query";
import { ReactQueryDevtoolsPanel } from "@tanstack/react-query-devtools";
import {
  createRootRouteWithContext,
  HeadContent,
  Outlet,
  Scripts,
  useRouterState,
} from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import { ThemeProvider } from "@/components/context/theme-provider";
import Loader from "@/components/loader";
import { Toaster } from "@/components/ui/sonner";

import type { orpc } from "@/utils/orpc";
import appCss from "../index.css?url";

export interface RouterAppContext {
  orpc: typeof orpc;
  queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<RouterAppContext>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Gasolina" },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
  }),

  component: RootDocument,
});

function RootDocument() {
  const isFetching = useRouterState({ select: (s) => s.isLoading });
  return (
    <html className="dark" lang="pt-BR">
      <head>
        <HeadContent />
      </head>
      <body>
        <ThemeProvider>
          {isFetching ? <Loader /> : <Outlet />}
          <Toaster richColors />
          {/* <TanStackDevtools
            plugins={[
              { name: "TanStack Query", render: <ReactQueryDevtoolsPanel /> },
              {
                name: "TanStack Router",
                render: <TanStackRouterDevtoolsPanel />,
              },
            ]}
          /> */}
          <Scripts />
        </ThemeProvider>
      </body>
    </html>
  );
}
