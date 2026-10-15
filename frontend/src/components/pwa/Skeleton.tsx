import type { CSSProperties } from "react";
import "./pwa.css";

export function Skeleton({ className = "", style }: { className?: string; style?: CSSProperties }) {
  return <span aria-hidden="true" className={`pwa-skeleton ${className}`} style={style} />;
}

export function SkeletonCards({ count = 6, variant = "product", unavailable = false, waitingForConnection = false, className = "" }: {
  count?: number; variant?: "product" | "plan" | "detail"; unavailable?: boolean; waitingForConnection?: boolean; className?: string;
}) {
  return <div className={`pwa-skeleton-grid ${variant} ${className} ${unavailable ? "unavailable" : ""}`}
    aria-busy={!unavailable} aria-label={unavailable ? "Contenido no disponible"
      : waitingForConnection ? "Esperando conexión para cargar el contenido" : "Cargando contenido"}>
    {Array.from({ length: count }, (_, index) => <article className={`pwa-skeleton-card ${variant}`} key={index}>
      {variant !== "plan" && <Skeleton className="pwa-skeleton-image" />}
      <div className="pwa-skeleton-copy">
        <Skeleton style={{ width: "40%", height: 14 }} />
        <Skeleton style={{ width: "85%", height: 30 }} />
        <Skeleton style={{ width: "100%", height: 18 }} />
        <Skeleton style={{ width: "65%", height: 18 }} />
        <Skeleton style={{ width: "45%", height: 34 }} />
        {variant === "plan" && Array.from({ length: 5 }, (_, row) => <Skeleton key={row} style={{ width: "90%", height: 18 }} />)}
        {unavailable ? <span>Contenido no disponible</span> : <Skeleton style={{ width: "100%", height: 48 }} />}
      </div>
    </article>)}
  </div>;
}
