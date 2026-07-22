import React from "react";
import { createRoot } from "react-dom/client";
import { ImmortalCombat } from "../../app/ImmortalCombat";
import "../../app/globals.css";

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ImmortalCombat />
  </React.StrictMode>,
);
