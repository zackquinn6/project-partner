import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { TempQuizProvider } from './contexts/TempQuizContext';

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <TempQuizProvider>
      <App />
    </TempQuizProvider>
  </StrictMode>,
);
