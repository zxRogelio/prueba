import { useEffect, useState, type FormEvent } from "react";
import OrderDetails from "../../components/cart/OrderDetails";
import PickupSettingsForm from "../../components/cart/PickupSettingsForm";
import { dateTime, deliveryErrorMessage, fulfillmentLabels, getProductOrder, listProductOrders, listRates,
  money, paymentLabels, saveRate, updateDelivery, type OrderList, type ProductOrder, type ShippingRate } from "../../services/deliveryService";
import "../../styles/delivery.css";

function FulfillmentEditor({ order, onUpdated }: { order: ProductOrder; onUpdated: () => void }) {
  const fulfillment = order.fulfillment;
  const allowed = fulfillment?.allowedTransitions || [];
  const [status, setStatus] = useState(allowed[0] || "");
  const [notes, setNotes] = useState("");
  const [carrier, setCarrier] = useState(fulfillment?.carrier || "");
  const [trackingNumber, setTrackingNumber] = useState(fulfillment?.trackingNumber || "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!fulfillment || busy) return;
    setBusy(true); setError("");
    try { await updateDelivery(order.id, { status, expectedStatus: fulfillment.status, notes, carrier, trackingNumber }); onUpdated(); }
    catch (failure) { setError(deliveryErrorMessage(failure)); }
    finally { setBusy(false); }
  };
  if (!allowed.length) return <p className="delivery-notice">No hay cambios logísticos disponibles para el estado actual.</p>;
  return <form className="delivery-admin-form" onSubmit={submit}><h3>Actualizar entrega</h3>
    {error && <p role="alert" className="delivery-error">{error}</p>}
    <label>Nuevo estado<select value={status} disabled={busy} onChange={(event) => setStatus(event.target.value)}>{allowed.map((next) => <option key={next} value={next}>{fulfillmentLabels[next] || next}</option>)}</select></label>
    {status === "shipped" && <div className="delivery-fields"><label>Paquetería<input required maxLength={120} value={carrier} onChange={(event) => setCarrier(event.target.value)} /></label>
      <label>Número de guía<input required maxLength={120} value={trackingNumber} onChange={(event) => setTrackingNumber(event.target.value)} /></label></div>}
    <label>Observaciones (visibles para el cliente)<textarea maxLength={1000} required={["incident", "delivery_failed", "cancelled"].includes(status)} value={notes} onChange={(event) => setNotes(event.target.value)} /></label>
    {status === "cancelled" && <p>Este cambio cancela la entrega. Los reembolsos se gestionan desde Pagos.</p>}
    <button className="delivery-primary" disabled={busy}>{busy ? "Guardando…" : "Confirmar cambio de estado"}</button>
  </form>;
}

function ShippingRates() {
  const [rates, setRates] = useState<ShippingRate[]>([]);
  const [draft, setDraft] = useState<Omit<ShippingRate, "id">>({ name: "", postalCodeFrom: "", postalCodeTo: "", amount: "", active: true });
  const [editingId, setEditingId] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => { let active = true; listRates().then((data) => { if (active) setRates(data); }).catch((failure: unknown) => { if (active) setError(deliveryErrorMessage(failure)); }); return () => { active = false; }; }, []);
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setBusy(true); setError("");
    try { await saveRate(draft, editingId); setRates(await listRates()); setEditingId(undefined); setDraft({ name: "", postalCodeFrom: "", postalCodeTo: "", amount: "", active: true }); }
    catch (failure) { setError(deliveryErrorMessage(failure)); }
    finally { setBusy(false); }
  };
  return <details className="delivery-card delivery-rates"><summary>Tarifas y cobertura de envíos</summary>
    <p>Configura importes reales en MXN y rangos de códigos postales. Sin tarifa válida no se permite pagar un envío. El rango más específico tiene prioridad; rangos de igual amplitud que coincidan bloquean la cotización.</p>
    {error && <p role="alert" className="delivery-error">{error}</p>}
    {rates.length === 0 && <p>No hay tarifas registradas.</p>}
    <div className="delivery-table-wrap"><table className="delivery-table"><thead><tr><th>Tarifa</th><th>Códigos postales</th><th>Importe</th><th>Estado</th><th>Acción</th></tr></thead><tbody>{rates.map((rate) => <tr key={rate.id}>
      <td>{rate.name}</td><td>{rate.postalCodeFrom}–{rate.postalCodeTo}</td><td>{money(rate.amount)}</td><td>{rate.active ? "Activa" : "Inactiva"}</td><td><button disabled={busy} type="button" onClick={() => { setEditingId(rate.id); setDraft(rate); }}>Editar</button></td>
    </tr>)}</tbody></table></div>
    <form onSubmit={submit}><h3>{editingId ? "Editar tarifa" : "Agregar tarifa"}</h3><div className="delivery-fields">
      <label>Nombre<input required maxLength={120} value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} /></label>
      <label>Importe MXN<input type="number" min="0" max="9999999999.99" step="0.01" required value={draft.amount} onChange={(event) => setDraft({ ...draft, amount: event.target.value })} /></label>
      <label>CP inicial<input inputMode="numeric" pattern="[0-9]{5}" maxLength={5} required value={draft.postalCodeFrom} onChange={(event) => setDraft({ ...draft, postalCodeFrom: event.target.value })} /></label>
      <label>CP final<input inputMode="numeric" pattern="[0-9]{5}" maxLength={5} required value={draft.postalCodeTo} onChange={(event) => setDraft({ ...draft, postalCodeTo: event.target.value })} /></label>
    </div><label className="delivery-check"><input type="checkbox" checked={draft.active} onChange={(event) => setDraft({ ...draft, active: event.target.checked })} /> Activa</label>
      <button disabled={busy} className="delivery-primary">Guardar tarifa</button>{editingId && <button type="button" onClick={() => { setEditingId(undefined); setDraft({ name: "", postalCodeFrom: "", postalCodeTo: "", amount: "", active: true }); }}>Cancelar edición</button>}
    </form>
  </details>;
}

export default function AdminOrdersPage() {
  const [method, setMethod] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [refresh, setRefresh] = useState(0);
  const [list, setList] = useState<OrderList | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [selected, setSelected] = useState<ProductOrder | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    Promise.all([listProductOrders(true, { page, limit: 15, deliveryMethod: method, fulfillmentStatus: status }), detailId ? getProductOrder(detailId) : Promise.resolve(null)])
      .then(([orders, detail]) => { if (active) { setList(orders); setSelected(detail); setError(""); } })
      .catch((failure: unknown) => { if (active) setError(deliveryErrorMessage(failure)); });
    return () => { active = false; };
  }, [page, method, status, detailId, refresh]);
  return <div className="delivery-page"><div className="delivery-card-heading"><h1>Gestión de pedidos y entregas</h1><button onClick={() => setRefresh((value) => value + 1)}>Actualizar</button></div>
    <PickupSettingsForm />
    <ShippingRates />
    {error && <p role="alert" className="delivery-error">{error}</p>}
    <div className="delivery-toolbar"><label>Método de entrega<select value={method} onChange={(event) => { setMethod(event.target.value); setPage(1); }}><option value="">Todos</option><option value="pickup">Recogida</option><option value="delivery">Domicilio</option></select></label>
      <label>Estado logístico<select value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }}><option value="">Todos</option>{Object.entries(fulfillmentLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label></div>
    {selected && selected.id === detailId && <section className="delivery-card"><button onClick={() => { setDetailId(null); setSelected(null); }}>Cerrar detalle</button><OrderDetails order={selected} admin />
      <FulfillmentEditor key={`${selected.id}-${selected.fulfillment?.status}`} order={selected} onUpdated={() => setRefresh((value) => value + 1)} /></section>}
    <section className="delivery-card"><div className="delivery-table-wrap"><table className="delivery-table"><thead><tr><th>Pedido / fecha</th><th>Cliente</th><th>Total / pago</th><th>Entrega</th><th>Acción</th></tr></thead><tbody>{list?.orders.map((order) => <tr key={order.id}>
      <td>{order.orderNumber}<br /><small>{dateTime(order.createdAt)}</small></td><td>{order.customer?.email}</td><td>{money(order.total)}<br />{paymentLabels[order.status] || order.status}</td>
      <td>{order.fulfillment ? <>{order.fulfillment.method === "pickup" ? "Recogida" : "Domicilio"}<br />{fulfillmentLabels[order.fulfillment.status] || order.fulfillment.status}</> : "Sin seguimiento registrado"}</td>
      <td><button onClick={() => { setSelected(null); setDetailId(order.id); }}>Gestionar</button></td></tr>)}</tbody></table></div>
      {list && !list.orders.length && <p>No hay pedidos con estos filtros.</p>}</section>
    <div className="delivery-pagination"><button disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>Anterior</button><span>Página {page} de {Math.max(1, list?.pagination.pages || 1)}</span><button disabled={!list || page >= list.pagination.pages} onClick={() => setPage((value) => value + 1)}>Siguiente</button></div>
  </div>;
}
