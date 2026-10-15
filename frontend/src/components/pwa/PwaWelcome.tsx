import { useEffect, useRef, useState } from "react";
import "./pwa.css";

// This preference belongs to the installation, not to an SW or build version.
const WELCOME_KEY = "titanium:pwa-welcome";
let handledThisSession = false;

function isStandalone() {
  return window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

function hasHandledWelcome() {
  if (handledThisSession) return true;
  try {
    return localStorage.getItem(WELCOME_KEY) !== null;
  } catch {
    return false;
  }
}

function rememberWelcome(outcome: string) {
  handledThisSession = true;
  try {
    localStorage.setItem(WELCOME_KEY, JSON.stringify({ outcome, attendedAt: Date.now() }));
  } catch {
    // Restricted storage must not block the app. Remember within this session.
  }
}

function notificationsSupported() {
  return window.isSecureContext && typeof Notification !== "undefined" &&
    typeof Notification.requestPermission === "function" &&
    "serviceWorker" in navigator && typeof ServiceWorkerRegistration !== "undefined" &&
    "showNotification" in ServiceWorkerRegistration.prototype;
}

async function existingRegistration() {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      navigator.serviceWorker.ready,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error("Service Worker no disponible")), 10_000);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

export function PwaWelcome() {
  const [visible, setVisible] = useState(() => isStandalone() && !hasHandledWelcome());
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState("");
  const attemptActive = useRef(false);
  const supported = notificationsSupported();
  const blocked = supported && Notification.permission === "denied";

  useEffect(() => {
    const media = window.matchMedia("(display-mode: standalone)");
    const check = () => setVisible(isStandalone() && !hasHandledWelcome());
    const storageChanged = (event: StorageEvent) => {
      if (event.key === WELCOME_KEY || event.key === null) check();
    };
    // Older iOS versions expose MediaQueryList.addListener instead.
    if (media.addEventListener) media.addEventListener("change", check);
    else media.addListener(check);
    window.addEventListener("storage", storageChanged);
    return () => {
      if (media.removeEventListener) media.removeEventListener("change", check);
      else media.removeListener(check);
      window.removeEventListener("storage", storageChanged);
      attemptActive.current = false;
    };
  }, []);

  const defer = () => {
    attemptActive.current = false;
    rememberWelcome("deferred");
    setVisible(false);
  };

  const activate = async () => {
    if (attemptActive.current || !supported || blocked) return;
    if (hasHandledWelcome()) { setVisible(false); return; }
    attemptActive.current = true;
    setBusy(true);
    // Persist the user action before awaiting anything: reloads or updates must
    // not repeat this invitation, even if the permission prompt is dismissed.
    rememberWelcome("requested");
    try {
      // Keep this call in the click handler, before any await (required by iOS).
      const permission = Notification.permission === "granted"
        ? "granted" : await Notification.requestPermission();
      if (!attemptActive.current) return;
      rememberWelcome(permission);
      if (permission !== "granted") {
        setFeedback(permission === "denied"
          ? "Las notificaciones están bloqueadas. Puedes habilitarlas en los ajustes del navegador."
          : "No se activaron las notificaciones. Puedes continuar sin ellas.");
        return;
      }
      const registration = await existingRegistration();
      if (!attemptActive.current) return;
      await registration.showNotification("Titanium Sport Gym", {
        body: "¡Bienvenido a Titanium! Las notificaciones están activadas correctamente.",
        icon: "/icons/pwa-192.png",
        tag: "titanium-welcome",
      });
      rememberWelcome("notified");
      setVisible(false);
    } catch {
      rememberWelcome("unavailable");
      setFeedback("El navegador no pudo activar el aviso. Puedes continuar usando Titanium sin notificaciones.");
    } finally {
      attemptActive.current = false;
      setBusy(false);
    }
  };

  if (!visible) return null;
  return (
    <aside className="pwa-welcome" aria-labelledby="pwa-welcome-title">
      <div className="pwa-welcome-heading">
        <img src="/icons/pwa-192.png" alt="" width="48" height="48" />
        <div>
          <span className="pwa-welcome-label">Titanium Sport Gym</span>
          <h2 id="pwa-welcome-title">¡Bienvenido a Titanium!</h2>
        </div>
      </div>
      <p>¿Deseas activar las notificaciones de Titanium Sport Gym?</p>
      <p className="pwa-welcome-help" role="status">
        {feedback || (!supported ? "Este navegador no permite activar notificaciones en esta app. Puedes continuar sin ellas."
          : blocked ? "Las notificaciones están bloqueadas. Puedes habilitarlas en los ajustes del navegador."
          : "Tú decides. Puedes seguir usando la app sin activarlas.")}
      </p>
      <div className="pwa-welcome-actions">
        <button type="button" className="pwa-welcome-activate" onClick={() => { void activate(); }}
          disabled={busy || !supported || blocked || Boolean(feedback)} aria-busy={busy}>
          Activar notificaciones
        </button>
        <button type="button" className="pwa-welcome-defer" onClick={defer}>Ahora no</button>
      </div>
    </aside>
  );
}
