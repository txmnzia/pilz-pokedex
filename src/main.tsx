import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import "./index.css";
import App from "./App";

createRoot(document.getElementById("root")!).render(<StrictMode><App /></StrictMode>);

// Service worker: check for a new version on load, whenever the tab comes back, and hourly.
// iOS Safari otherwise keeps serving the old version until a full reload (seen on v0.4.0).
const updateSW = registerSW({
  immediate: true,
  onNeedRefresh() { updateSW(true); }, // new version ready: activate and reload
  onRegisteredSW(_url, reg) {
    if (!reg) return;
    const check = () => { if (navigator.onLine) reg.update().catch(() => {}); };
    document.addEventListener("visibilitychange", () => { if (!document.hidden) check(); });
    setInterval(check, 60 * 60 * 1000);
  },
});

// ?debug=1: viewport numbers for iOS layout issues (txmnzia convention: fix from numbers, not guesses)
if (new URLSearchParams(location.search).has("debug")) {
  const probe = Object.assign(document.createElement("div"), { className: "sa-probe" });
  const box = Object.assign(document.createElement("div"), { className: "dbg" });
  document.body.append(probe, box);
  const show = () => {
    const cs = getComputedStyle(probe), dev = document.getElementById("device")?.getBoundingClientRect();
    box.textContent = [
      `innerH ${innerHeight}  vvH ${Math.round(visualViewport?.height ?? 0)}  screenH ${screen.height}`,
      `safe-area t ${cs.paddingTop} b ${cs.paddingBottom}`,
      `device top ${Math.round(dev?.top ?? 0)} h ${Math.round(dev?.height ?? 0)}`,
      `standalone ${matchMedia("(display-mode: standalone)").matches}  v${__APP_VERSION__}`,
    ].join("\n");
  };
  show(); setInterval(show, 2000); addEventListener("resize", show); visualViewport?.addEventListener("resize", show);
}
declare const __APP_VERSION__: string;
