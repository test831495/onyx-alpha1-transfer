import React from "react";
import { createRoot } from "react-dom/client";
import { ProviderHealthDashboard } from "./components/ProviderHealthDashboard";

if (typeof document !== "undefined") {
  const id = "onyx-provider-health-root";
  let node = document.getElementById(id);
  if (!node) { node = document.createElement("div"); node.id = id; document.body.appendChild(node); }
  createRoot(node).render(<React.StrictMode><ProviderHealthDashboard /></React.StrictMode>);
}
