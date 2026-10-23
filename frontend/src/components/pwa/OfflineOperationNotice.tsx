import "./pwa.css";

export function OfflineOperationNotice({ online }: { online: boolean }) {
  if (online) return null;
  return (
    <div className="pwa-resource-notice" role="status">
      <p>Necesitas conexión a internet para realizar esta operación</p>
    </div>
  );
}
