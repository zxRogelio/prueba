import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import OrderDetails from "../../components/cart/OrderDetails";
import { DeliveryHeader, DeliveryIcon, DeliveryLoading, DeliveryEmpty, MethodBadge, StatusBadge } from "../../components/cart/DeliveryUi";
import { dateTime, deliveryErrorMessage, getProductOrder, listProductOrders, money,
  type OrderList, type ProductOrder } from "../../services/deliveryService";
import "../../styles/delivery.css";

export default function ClientOrdersPage() {
  const [searchParams] = useSearchParams();
  const selectedId = searchParams.get("orderId");
  const [page, setPage] = useState(1);
  const [list, setList] = useState<OrderList | null>(null);
  const [selected, setSelected] = useState<ProductOrder | null>(null);
  const [detailId, setDetailId] = useState<string | null>(selectedId);
  const [error, setError] = useState("");
  const [refresh, setRefresh] = useState(0);
  const [loading, setLoading] = useState(true);
  const detailRef = useRef<HTMLElement>(null);
  useEffect(() => { if (selected?.id) detailRef.current?.focus(); }, [selected?.id]);
  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const [orders, detail] = await Promise.all([listProductOrders(false, { page, limit: 10 }), detailId ? getProductOrder(detailId) : Promise.resolve(null)]);
        if (active) { setList(orders); setSelected(detail); setError(""); }
      } catch (failure) { if (active) setError(deliveryErrorMessage(failure)); }
      finally { if (active) setLoading(false); }
    };
    void load();
    const interval = window.setInterval(() => { if (document.visibilityState === "visible") void load(); }, 30000);
    return () => { active = false; window.clearInterval(interval); };
  }, [page, detailId, refresh]);
  return <div className="delivery-page">
    <DeliveryHeader eyebrow="Titanium / Tus compras" title="Mis pedidos" description="Del gimnasio a tu puerta. Consulta tus compras y sigue cada entrega en un solo lugar.">
      <button type="button" onClick={() => setRefresh((value) => value + 1)}><DeliveryIcon name="refresh" />Actualizar pedidos</button>
    </DeliveryHeader>
    <div className="delivery-list-caption"><span>{list ? `${list.pagination.total} pedidos registrados` : "Tus compras de productos"}</span><span><DeliveryIcon name="clock" />Actualización cada 30 segundos</span></div>
    {error && <div role="alert" className="delivery-error">{error}</div>}
    {loading && <DeliveryLoading>Consultando pedidos…</DeliveryLoading>}
    {detailId && !selected && !error && !loading && <DeliveryLoading>Consultando seguimiento…</DeliveryLoading>}
    {selected && selected.id === detailId && <section className="delivery-card delivery-selected-detail" ref={detailRef} tabIndex={-1} aria-label={`Detalle ${selected.orderNumber}`}>
      <div className="delivery-detail-close"><button type="button" onClick={() => { document.getElementById(`delivery-order-${detailId}`)?.focus(); setDetailId(null); setSelected(null); }}>Cerrar detalle</button></div><OrderDetails order={selected} /></section>}
    <div className="delivery-list delivery-order-cards">{list?.orders.map((order) => <article key={order.id} className="delivery-card delivery-order-card">
      <div className="delivery-card-heading"><span className="delivery-icon-tile"><DeliveryIcon name="package" /></span><span className="delivery-order-amount">{money(order.total)}<small>MXN · Total de compra</small></span></div>
      <h2>{order.orderNumber}</h2><p className="delivery-muted"><time dateTime={order.createdAt}>{dateTime(order.createdAt)}</time></p>
      <div className="delivery-status-row"><StatusBadge status={order.status} payment />{order.fulfillment && <StatusBadge status={order.fulfillment.status} />}</div>
      <ul className="delivery-order-item-list">{order.items.map((item) => <li key={item.id}><span>{item.itemNameSnapshot}</span><strong>× {item.quantity}</strong></li>)}</ul>
      <div className="delivery-order-footer">{order.fulfillment ? <MethodBadge method={order.fulfillment.method} /> : <span className="delivery-muted">Sin seguimiento registrado</span>}
        <button id={`delivery-order-${order.id}`} type="button" aria-label={`Ver pedido y seguimiento ${order.orderNumber}`} onClick={() => { if (detailId === order.id) setRefresh((value) => value + 1); else { setSelected(null); setDetailId(order.id); } }}>Ver pedido y seguimiento<DeliveryIcon name="arrow" /></button></div>
    </article>)}</div>
    {list && !list.orders.length && <DeliveryEmpty title="Tu próximo objetivo empieza aquí"><p>Aún no tienes compras de productos.</p><Link className="delivery-primary" to="/catalogue">Explorar productos<DeliveryIcon name="arrow" /></Link></DeliveryEmpty>}
    {list && list.orders.length > 0 && <nav aria-label="Paginación de pedidos" className="delivery-pagination"><button disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>Anterior</button><span>Página {page} de {Math.max(1, list.pagination.pages)}</span><button disabled={page >= list.pagination.pages} onClick={() => setPage((value) => value + 1)}>Siguiente</button></nav>}
  </div>;
}
