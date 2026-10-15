import { useEffect, useState, type ImgHTMLAttributes } from "react";
import fallback from "../../assets/LogoP.png";
import { Skeleton } from "./Skeleton";
import { cacheInitialPublicImage } from "../../pwa/publicImages";

export function PublicImage({ src, alt, className = "", onLoad, onError, style, ...props }: ImgHTMLAttributes<HTMLImageElement>) {
  const [loadedSrc, setLoadedSrc] = useState<string>();
  const [failedSrc, setFailedSrc] = useState<string>();
  const failed = failedSrc === src;
  const loaded = loadedSrc === src || failed;
  useEffect(() => {
    if (loaded) return;
    const timer = setTimeout(() => setFailedSrc(src), 8000);
    return () => clearTimeout(timer);
  }, [src, loaded]);
  return <span className={`pwa-image ${className}`} style={style}>
    {!loaded && <Skeleton className="pwa-image-loading" />}
    <img {...props} src={failed ? fallback : src} alt={failed ? `${alt || "Imagen"}: imagen no disponible` : alt}
      style={{ opacity: loaded ? 1 : 0 }}
      onLoad={(event) => { setLoadedSrc(src); if (!failed) void cacheInitialPublicImage(src); onLoad?.(event); }}
      onError={(event) => { setFailedSrc(src); onError?.(event); }} />
  </span>;
}
