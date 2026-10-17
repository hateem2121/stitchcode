import React from "react";
import ReactDOM from "react-dom/client";
import "@fontsource-variable/inter";
import "@fontsource/jetbrains-mono/400.css";
import "@fontsource/jetbrains-mono/500.css";
import "@fontsource/jetbrains-mono/700.css";
import "./index.css";
import App from "./App.tsx";
import { applyTheme, getInitialTheme } from "./lib/themes";

applyTheme(getInitialTheme());

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

/* Offline-first: register the service worker in production builds only.
   The relative path keeps it working on Pages, custom domains and zips. */
if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("./sw.js", { updateViaCache: "none" })
      .then((registration) => {
        /* User-approved updates (2026 best practice): detect a new worker,
           show a small banner, and only skip waiting when the user accepts.
           Forced skipWaiting could serve half-old pages mid-session. */
        const onUpdateFound = () => {
          const installing = registration.installing;
          if (!installing) return;
          installing.addEventListener("statechange", () => {
            if (installing.state === "installed" && navigator.serviceWorker.controller) {
              showUpdateBanner(installing);
            }
          });
        };
        registration.addEventListener("updatefound", onUpdateFound);
        if (registration.waiting && navigator.serviceWorker.controller) {
          showUpdateBanner(registration.waiting);
        }

        /* long-lived tabs: re-check for updates hourly */
        window.setInterval(
          () => {
            registration.update().catch(() => {});
          },
          60 * 60 * 1000,
        );
      })
      .catch(() => {
        /* insecure context or unsupported browser — the studio still works online */
      });
  });
}

let reloading = false;
function showUpdateBanner(worker: ServiceWorker) {
  if (document.getElementById("sw-update-bar")) return;
  const bar = document.createElement("div");
  bar.id = "sw-update-bar";
  bar.style.cssText =
    "position:fixed;bottom:16px;left:50%;transform:translateX(-50%);z-index:9999;" +
    "display:flex;align-items:center;gap:10px;padding:10px 14px;border-radius:999px;" +
    "background:#1c1c1a;color:#fff6f0;font:600 13px system-ui,sans-serif;" +
    "box-shadow:0 4px 16px rgba(0,0,0,.3)";
  const label = document.createElement("span");
  label.textContent = "A new version of StitchCode is ready";
  const update = document.createElement("button");
  update.textContent = "Update";
  update.style.cssText =
    "border:1.5px solid #fff6f0;background:#c22e12;color:#fff;border-radius:999px;" +
    "padding:4px 12px;font:700 11px system-ui,sans-serif;text-transform:uppercase;cursor:pointer";
  const dismiss = document.createElement("button");
  dismiss.textContent = "Later";
  dismiss.style.cssText =
    "border:none;background:transparent;color:#fff6f0;opacity:.7;cursor:pointer;font:600 11px system-ui";
  update.addEventListener("click", () => {
    navigator.serviceWorker.addEventListener(
      "controllerchange",
      () => {
        if (reloading) return;
        reloading = true;
        window.location.reload();
      },
      { once: true },
    );
    worker.postMessage({ type: "SKIP_WAITING" });
    bar.remove();
  });
  dismiss.addEventListener("click", () => bar.remove());
  bar.append(label, update, dismiss);
  document.body.append(bar);
}
