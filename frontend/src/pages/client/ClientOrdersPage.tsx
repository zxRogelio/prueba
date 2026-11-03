import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import OrderDetails from "../../components/cart/OrderDetails";
import { dateTime, deliveryErrorMessage, fulfillmentLabels, getProductOrder, listProductOrders, money, paymentLabels,
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
    <div className="delivery-card-heading"><h1>Mis pedidos</h1><button type="button" onClick={() => setRefresh((value) => value + 1)}>Actualizar</button></div>
    <p>Consulta el seguimiento de tus productos. La información se consulta cada 30 segundos.</p>
    {error && <div role="alert" className="delivery-error">{error}</div>}
    {loading && <p role="status">Consultando pedidos…</p>}
    {selected && selected.id === detailId && <section className="delivery-card"><button type="button" onClick={() => { setDetailId(null); setSelected(null); }}>Cerrar detalle</button><OrderDetails order={selected} /></section>}
    <div className="delivery-list">{list?.orders.map((order) => <article key={order.id} className="delivery-card">
      <div className="delivery-card-heading"><h2>{order.orderNumber}</h2><strong>{money(order.total)}</strong></div>
      <p>{dateTime(order.createdAt)} · {paymentLabels[order.status] || order.status}</p>
      <p>{order.items.map((item) => `${item.itemNameSnapshot} × ${item.quantity}`).join(" · ")}</p>
      <p>{order.fulfillment ? `${order.fulfillment.method === "pickup" ? "Recogida" : "Domicilio"} · ${fulfillmentLabels[order.fulfillment.status] || order.fulfillment.status}` : "Sin seguimiento registrado"}</p>
      <button type="button" onClick={() => { setSelected(null); setDetailId(order.id); }}>Ver pedido y seguimiento</button>
    </article>)}</div>
    {list && !list.orders.length && <p className="delivery-notice">Aún no tienes compras de productos.</p>}
    <div className="delivery-pagination"><button disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>Anterior</button><span>Página {page} de {Math.max(1, list?.pagination.pages || 1)}</span><button disabled={!list || page >= list.pagination.pages} onClick={() => setPage((value) => value + 1)}>Siguiente</button></div>
  </div>;
}
