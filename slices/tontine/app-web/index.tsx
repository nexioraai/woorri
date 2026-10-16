import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";

const racine = document.getElementById("racine");
if (racine === null) throw new Error("ELEMENT_RACINE_ABSENT");
createRoot(racine).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
