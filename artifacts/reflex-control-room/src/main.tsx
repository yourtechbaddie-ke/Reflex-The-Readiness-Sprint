import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import "./darker-approved-theme.css";
import "./settings.css";
import "./uniform-theme.css";
import "./navigationEnhancer";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
