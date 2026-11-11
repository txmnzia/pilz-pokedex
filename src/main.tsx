import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import "./index.css";
import App from "./App";
import { debugLog, dlog, overlayDepth } from "./lib/overlay";

createRoot(document.getElementById("root")!).render(<StrictMode><App /></StrictMode>);

// v0.16.7 (Sam: "after a reload the UI is shifted up under the status bar"). On iOS the page is 100lvh, taller than the
// visible area, so the window can scroll: Safari restores the old scroll position on reload, and focusing an input (the
// species search) scrolls the window and leaves it there when the keyboard closes. The app never scrolls the window
// itself (everything scrolls inside the LCD), so pin it back to the top whenever nothing is being typed.
if ("scrollRestoration" in history) history.scrollRestoration = "manual";
const pinTop = () => {
  const a = document.activeElement;
  if (a instanceof HTMLInputElement || a instanceof HTMLTextAreaElement || a instanceof HTMLSelectElement) return;
  if (window.scrollY || window.scrollX) window.scrollTo(0, 0);
};
addEventListener("pageshow", pinTop);
addEventListener("load", pinTop);
document.addEventListener("focusout", () => setTimeout(pinTop, 120));
visualViewport?.addEventListener("resize", () => setTimeout(pinTop, 120));
addEventListener("scroll", () => setTimeout(pinTop, 250), { passive: true });

// Drop the cache-busting ?v= left by a forced update (keeps any other parameter such as ?debug=1)
{ const u = new URL(location.href); if (u.searchParams.has("v")) { u.searchParams.delete("v"); history.replaceState(null, "", u.toString()); } }

// Service worker: check for a new version on load, whenever the tab comes back, and hourly.
// iOS Safari kept serving old versions (v0.4.0, then v0.4.4) despite the worker's own update check, so the
// app also asks the server directly (version.json, no cache). If the server is newer and the worker has not
// taken over within 4 s, drop the worker and its caches and reload. Once per version, so it cannot loop.
let registration: ServiceWorkerRegistration | undefined;
const updateSW = registerSW({
  immediate: true,
  onNeedRefresh() { updateSW(true); }, // new version ready: activate and reload
  onRegisteredSW(_url, reg) { registration = reg; },
});

async function ensureLatest() {
  if (!navigator.onLine) return;
  registration?.update().catch(() => {});
  let live: string | undefined;
  try {
    const r = await fetch(`${import.meta.env.BASE_URL}version.json?t=${Date.now()}`, { cache: "no-store" });
    live = (await r.json()).version;
  } catch { return; }
  if (!live || live === __APP_VERSION__) return;
  const key = "pz.forcedUpdate";
  if (sessionStorage.getItem(key) === live) return; // already tried for this version in this tab
  setTimeout(async () => {
    sessionStorage.setItem(key, live!);
    for (const reg of await navigator.serviceWorker?.getRegistrations?.() ?? []) await reg.unregister();
    for (const k of await caches?.keys?.() ?? []) await caches.delete(k);
    // a plain reload can be answered by Safari's HTTP cache (GitHub Pages: max-age 600) and bring the old app back
    const u = new URL(location.href); u.searchParams.set("v", live!);
    location.replace(u.toString());
  }, 4000); // a normal worker update reloads the page before this fires
}
ensureLatest();
document.addEventListener("visibilitychange", () => { if (!document.hidden) ensureLatest(); });
setInterval(ensureLatest, 60 * 60 * 1000);

// ?debug=1: viewport numbers for iOS layout issues (txmnzia convention: fix from numbers, not guesses)
if (new URLSearchParams(location.search).has("debug")) {
  const probe = Object.assign(document.createElement("div"), { className: "sa-probe" });
  const units = ["svh", "lvh", "dvh"].map(u => {
    const el = document.createElement("div");
    el.style.cssText = `position:fixed;top:0;left:0;width:1px;height:100${u};visibility:hidden;pointer-events:none`;
    document.body.append(el); return [u, el] as const;
  });
  const box = Object.assign(document.createElement("div"), { className: "dbg" });
  document.body.append(probe, box);
  const show = () => {
    const cs = getComputedStyle(probe), dev = document.getElementById("device")?.getBoundingClientRect();
    box.textContent = [
      `scrollY ${Math.round(scrollY)}  innerH ${innerHeight}  vvH ${Math.round(visualViewport?.height ?? 0)}  screenH ${screen.height}`,
      `safe-area t ${cs.paddingTop} b ${cs.paddingBottom}`,
      units.map(([u, el]) => `${u} ${Math.round(el.getBoundingClientRect().height)}`).join("  ") +
        `  vvTop ${Math.round(visualViewport?.offsetTop ?? 0)}  docH ${document.documentElement.clientHeight}`,
      `device top ${Math.round(dev?.top ?? 0)} h ${Math.round(dev?.height ?? 0)}`,
      `standalone ${matchMedia("(display-mode: standalone)").matches}  v${__APP_VERSION__}  overlays ${overlayDepth()}`,
      ...debugLog,
    ].join("\n");
  };
  addEventListener("error", e => { dlog(`ERR ${e.message}`); show(); });
  addEventListener("unhandledrejection", e => { dlog(`REJ ${String((e as PromiseRejectionEvent).reason).slice(0, 80)}`); show(); });
  show(); setInterval(show, 1000); addEventListener("resize", show); visualViewport?.addEventListener("resize", show);
}
declare const __APP_VERSION__: string;
