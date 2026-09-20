import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MotionConfig } from "motion/react";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { SessionProvider } from "./app/session";
import { ToastProvider } from "./app/toast";
import { ready } from "./crypto/sodium";
import "./design/theme.css";

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: true } },
});

const root = document.getElementById("root");
if (!root) throw new Error("#root missing");

// libsodium (WebAssembly) must be ready before any crypto call.
void ready().then(() => {
  createRoot(root).render(
    <StrictMode>
      <MotionConfig reducedMotion="user">
        <QueryClientProvider client={queryClient}>
          <ToastProvider>
            <SessionProvider>
              <App />
            </SessionProvider>
          </ToastProvider>
        </QueryClientProvider>
      </MotionConfig>
    </StrictMode>,
  );
});
