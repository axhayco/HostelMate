// ─── main.tsx — wrap app in AuthProvider ─────────────────────────────────────
// Drop this file at:  src/main.tsx
// Only change from your original: added AuthProvider wrapper.

import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "@/lib/envCheck";
import { AuthProvider } from "@/context/AuthContext";

createRoot(document.getElementById("root")!).render(
  <AuthProvider>
    <App />
  </AuthProvider>
);