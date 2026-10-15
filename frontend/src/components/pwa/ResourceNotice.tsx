type ResourceStatus = {
  loading: boolean; stale: boolean; error: boolean; online: boolean;
  savedAt?: number; retry: () => void;
};

export function ResourceNotice({ resource, empty = false }: { resource: ResourceStatus; empty?: boolean }) {
  if (resource.loading) return <p className="pwa-sr-only" role="status">Cargando contenido público…</p>;
  if (!resource.stale && !resource.error && !empty) return null;
  return <div className="pwa-resource-notice" role="status">
    <p>{resource.stale ? "Mostrando contenido guardado; los precios y la disponibilidad pueden estar desactualizados."
      : resource.error ? (resource.online ? "No pudimos contactar al servidor. El contenido aún no está disponible."
        : "Sin conexión. No hay datos guardados para esta sección.")
      : "No hay contenido publicado en esta sección."}
      {resource.stale && resource.savedAt && <small> Guardado: {new Date(resource.savedAt).toLocaleString("es-MX")}</small>}
    </p>
    <button type="button" onClick={resource.retry}>Reintentar</button>
  </div>;
}
