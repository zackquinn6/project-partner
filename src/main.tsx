import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

/** Pathname at full document load (before client routing). Used by Index to only clear workshop state on F5 when the user reloaded `/`, not when returning from `/projects` with navigation state. */
try {
  if (typeof window !== "undefined") {
    sessionStorage.setItem("pp_initial_entry_path", window.location.pathname);
  }
} catch {
  /* private / blocked storage */
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
