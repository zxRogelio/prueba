import { useEffect, useState, useSyncExternalStore } from "react";
import { registerSW } from "virtual:pwa-register";
import { useOnline } from "../../hooks/useOnline";
import "./pwa.css";

type InstallPrompt = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };
let updateServiceWorker: ((reload?: boolean) => Promise<void>) | undefined;
let workerRegistered = false;
let workerStatus = { message: "", update: false };
const listeners = new Set<() => void>();
function publish(status: Partial<typeof workerStatus>) {
  workerStatus = { ...workerStatus, ...status };
  listeners.forEach((listener) => listener());
}
function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
const getStatus = () => workerStatus;

export function PwaStatus() {
  const online = useOnline();
  // Keep SW events observable after leaving a private layout and coming back.
  const { message, update } = useSyncExternalStore(subscribe, getStatus, getStatus);
  const [install, setInstall] = useState<InstallPrompt>();
  useEffect(() => {
    if (!workerRegistered) {
      workerRegistered = true;
      updateServiceWorker = registerSW({
        immediate: true,
        onOfflineReady() { publish({ message: "Aplicación lista para abrirse sin conexión. Los datos dependen de lo guardado." }); },
        onNeedRefresh() { publish({ update: true }); },
        onRegisterError() { publish({ message: "No se pudo preparar el modo offline. Recarga con conexión para reintentar." }); },
      });
    }
    const ready = (event: Event) => { event.preventDefault(); setInstall(event as InstallPrompt); };
    const installed = () => setInstall(undefined);
    const checkUpdate = () => { void navigator.serviceWorker?.getRegistration().then((registration) => registration?.update()).catch(() => {}); };
    window.addEventListener("beforeinstallprompt", ready);
    window.addEventListener("appinstalled", installed);
    window.addEventListener("online", checkUpdate);
    return () => {
      window.removeEventListener("beforeinstallprompt", ready);
      window.removeEventListener("appinstalled", installed);
      window.removeEventListener("online", checkUpdate);
    };
  }, []);
  if (online && !message && !update && !install) return null;
  return <aside className="pwa-status" aria-label="Estado de la aplicación">
    <span role="status">{!online ? "Sin conexión. Puedes consultar contenido local y los datos públicos guardados." : update ? "Hay una nueva versión de Titanium disponible." : message || "Instala Titanium para abrirlo desde tu dispositivo."}</span>
    {online && update && <button onClick={() => { void updateServiceWorker?.(true); }}>Actualizar</button>}
    {online && install && <button onClick={async () => { await install.prompt(); await install.userChoice; setInstall(undefined); }}>Instalar</button>}
    {online && message && <button aria-label="Cerrar aviso" onClick={() => publish({ message: "" })}>Cerrar</button>}
  </aside>;
}
