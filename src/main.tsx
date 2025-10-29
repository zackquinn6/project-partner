import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { MembershipProvider } from "@/contexts/MembershipContext";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <MembershipProvider>
      <App />
    </MembershipProvider>
  </StrictMode>
);
