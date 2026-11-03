import { Check, Clock3, MapPin, Package, RefreshCw, Truck, AlertTriangle, ArrowRight } from "lucide-react";
import type { ReactNode } from "react";
import { fulfillmentLabels, paymentLabels } from "../../services/deliveryService";

export function DeliveryIcon({ name }: { name: "pickup" | "delivery" | "package" | "check" | "clock" | "refresh" | "alert" | "arrow" }) {
  const Icon = { pickup: MapPin, delivery: Truck, package: Package, check: Check, clock: Clock3, refresh: RefreshCw, alert: AlertTriangle, arrow: ArrowRight }[name];
  return <Icon size={20} strokeWidth={1.8} aria-hidden="true" focusable="false" />;
}
export function StatusBadge({ status, payment = false }: { status: string; payment?: boolean }) {
  const tone = ["paid", "picked_up", "delivered"].includes(status) ? "success"
    : ["failed", "incident", "delivery_failed", "cancelled", "disputed", "charged_back"].includes(status) ? "danger"
    : ["pending", "pending_payment", "awaiting_payment"].includes(status) ? "pending" : "neutral";
  return <span className={`delivery-badge delivery-badge--${tone}`}><span className="delivery-badge-dot" aria-hidden="true" />
    {payment ? "Pago: " : "Entrega: "}{(payment ? paymentLabels : fulfillmentLabels)[status] || status}</span>;
}
export function MethodBadge({ method }: { method: "pickup" | "delivery" }) {
  return <span className="delivery-method-badge"><DeliveryIcon name={method} />{method === "pickup" ? "Recogida en gimnasio" : "Envío a domicilio"}</span>;
}
export function DeliveryHeader({ eyebrow, title, description, children }: { eyebrow: string; title: string; description: string; children?: ReactNode }) {
  return <header className="delivery-hero"><div><span className="delivery-eyebrow">{eyebrow}</span><h1>{title}</h1><p>{description}</p></div>
    {children && <div className="delivery-hero-actions">{children}</div>}</header>;
}
export function DeliveryLoading({ children = "Consultando información…" }: { children?: ReactNode }) {
  return <div className="delivery-loading" role="status"><span className="delivery-spinner" aria-hidden="true" /><span>{children}</span></div>;
}
export function DeliveryEmpty({ title, children }: { title: string; children: ReactNode }) {
  return <div className="delivery-empty"><span className="delivery-icon-tile"><DeliveryIcon name="package" /></span><h2>{title}</h2><div>{children}</div></div>;
}
