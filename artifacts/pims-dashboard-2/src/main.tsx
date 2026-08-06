import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import App from "./App";
import "./index.css";

import { setBaseUrl } from "@workspace/api-client-react";

if (typeof window !== "undefined") {
  const customApiUrl = (window as any).API_BASE_URL || import.meta.env.VITE_API_URL;
  if (customApiUrl) {
    setBaseUrl(customApiUrl);
  } else if (window.location.port && window.location.port !== "9480") {
    setBaseUrl(`${window.location.protocol}//${window.location.hostname}:9480`);
  }
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={queryClient}>
    <App />
  </QueryClientProvider>,
);
