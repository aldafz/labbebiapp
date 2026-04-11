import React from "react"
import ReactDOM from "react-dom/client"
import App from "./BambiniApp.jsx"

ReactDOM.createRoot(document.getElementById("root")).render(<App />)

// ── Registrazione Service Worker (PWA) ──
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/La-Bebi-App/app/sw.js")
      .catch((err) => console.log("SW error:", err));
  });
}
