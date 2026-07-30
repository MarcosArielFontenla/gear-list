import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./app/App";
import { ApplicationErrorBoundary } from "./app/ApplicationErrorBoundary";
import { AppProviders } from "./app/providers/AppProviders";
import "./index.css";

const root = document.getElementById("root");

if (!root) {
  throw new Error("Root element was not found.");
}

createRoot(root).render(
  <StrictMode>
    <ApplicationErrorBoundary>
      <AppProviders>
        <App />
      </AppProviders>
    </ApplicationErrorBoundary>
  </StrictMode>,
);
