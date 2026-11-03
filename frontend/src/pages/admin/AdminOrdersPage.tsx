import { useEffect, useState, type FormEvent } from "react";
import OrderDetails from "../../components/cart/OrderDetails";
import PickupSettingsForm from "../../components/cart/PickupSettingsForm";
import { DeliveryEmpty, DeliveryHeader, DeliveryIcon, DeliveryLoading, MethodBadge, StatusBadge } from "../../components/cart/DeliveryUi";
import { dateTime, deliveryErrorMessage, fulfillmentLabels, getProductOrder, listProductOrders, listRates,
  money, saveRate, updateDelivery, type OrderList, type ProductOrder, type ShippingRate } from "../../services/deliveryService";
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
  return <form className="delivery-admin-form delivery-inset" onSubmit={submit}><span className="delivery-eyebrow">Control logístico</span><h3>Actualizar entrega</h3>
    <p className="delivery-muted">Selecciona uno de los cambios disponibles para este pedido.</p>
    {error && <p role="alert" className="delivery-error">{error}</p>}
    <fieldset className="delivery-details" disabled={busy}><legend className="delivery-sr-only">Cambiar estado de entrega</legend>
    <label>Nuevo estado<select value={status} onChange={(event) => setStatus(event.target.value)}>{allowed.map((next) => <option key={next} value={next}>{fulfillmentLabels[next] || next}</option>)}</select></label>
    {status === "shipped" && <div className="delivery-fields"><label>Paquetería<input required maxLength={120} value={carrier} onChange={(event) => setCarrier(event.target.value)} /></label>
      <label>Número de guía<input required maxLength={120} value={trackingNumber} onChange={(event) => setTrackingNumber(event.target.value)} /></label></div>}
    <label>Observaciones (visibles para el cliente)<textarea maxLength={1000} required={["incident", "delivery_failed", "cancelled"].includes(status)} value={notes} onChange={(event) => setNotes(event.target.value)} /></label>
    {status === "cancelled" && <p>Este cambio cancela la entrega. Los reembolsos se gestionan desde Pagos.</p>}
    <button className="delivery-primary" disabled={busy}><DeliveryIcon name="check" />{busy ? "Guardando…" : "Confirmar cambio de estado"}</button></fieldset>
  </form>;
}

function ShippingRates() {
  const [rates, setRates] = useState<ShippingRate[]>([]);
  const [draft, setDraft] = useState<Omit<ShippingRate, "id">>({ name: "", postalCodeFrom: "", postalCodeTo: "", amount: "", active: true });
  const [editingId, setEditingId] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  useEffect(() => { let active = true; listRates().then((data) => { if (active) setRates(data); }).catch((failure: unknown) => { if (active) setError(deliveryErrorMessage(failure)); }).finally(() => { if (active) setLoading(false); }); return () => { active = false; }; }, []);
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); if (busy) return; setBusy(true); setError(""); setSaved(false);
    try { await saveRate(draft, editingId); setRates(await listRates()); setEditingId(undefined); setDraft({ name: "", postalCodeFrom: "", postalCodeTo: "", amount: "", active: true }); setSaved(true); }
    catch (failure) { setError(deliveryErrorMessage(failure)); }
    finally { setBusy(false); }
  };
  return <details className="delivery-card delivery-rates"><summary><span className="delivery-summary-icon"><DeliveryIcon name="delivery" /></span><span><strong>Tarifas y cobertura de envíos</strong><small>Administra zonas postales e importes</small></span></summary>
    <div className="delivery-settings-body">
    <p>Configura importes reales en MXN y rangos de códigos postales. Sin tarifa válida no se permite pagar un envío. El rango más específico tiene prioridad; rangos de igual amplitud que coincidan bloquean la cotización.</p>
    <p className="delivery-notice">Para una tarifa fija nacional, usa el nombre «Envío nacional», CP inicial 00000 y CP final 99999. Introduce el importe que decidas en MXN. Si ya existe ese rango, edita su tarifa, incluso si está inactiva; no crees otra. Las tarifas regionales más específicas conservan su prioridad.</p>
    <p className="delivery-muted">Solo se valida el formato de cinco dígitos y la pertenencia al rango. Esto no acredita que el código postal exista ni que una paquetería preste servicio en esa dirección.</p>
    {error && <p role="alert" className="delivery-error">{error}</p>}
    {loading && <DeliveryLoading>Consultando tarifas…</DeliveryLoading>}
    {saved && <p role="status" className="delivery-success">Tarifa guardada correctamente.</p>}
    {!loading && rates.length === 0 && <p>No hay tarifas registradas.</p>}
    <div className="delivery-table-wrap"><table className="delivery-table"><caption className="delivery-sr-only">Tarifas de envío registradas</caption><thead><tr><th scope="col">Tarifa</th><th scope="col">Códigos postales</th><th scope="col">Importe</th><th scope="col">Estado</th><th scope="col">Acción</th></tr></thead><tbody>{rates.map((rate) => <tr key={rate.id}>
      <td data-label="Tarifa">{rate.name}</td><td data-label="Códigos postales">{rate.postalCodeFrom}–{rate.postalCodeTo}</td><td data-label="Importe">{money(rate.amount)}</td><td data-label="Estado"><span className={`delivery-badge delivery-badge--${rate.active ? "success" : "neutral"}`}>{rate.active ? "Activa" : "Inactiva"}</span></td><td data-label="Acción"><button disabled={busy} type="button" aria-label={`Editar tarifa ${rate.name}`} onClick={() => { setEditingId(rate.id); setDraft(rate); }}>Editar</button></td>
    </tr>)}</tbody></table></div>
    <form onSubmit={submit} className="delivery-inset"><h3>{editingId ? "Editar tarifa" : "Agregar tarifa"}</h3><fieldset disabled={busy} className="delivery-details"><legend className="delivery-sr-only">Datos de la tarifa</legend><div className="delivery-fields">
      <label>Nombre<input required maxLength={120} value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} /></label>
      <label>Importe MXN<input type="number" min="0" max="9999999999.99" step="0.01" required value={draft.amount} onChange={(event) => setDraft({ ...draft, amount: event.target.value })} /></label>
      <label>CP inicial<input inputMode="numeric" pattern="[0-9]{5}" maxLength={5} required value={draft.postalCodeFrom} onChange={(event) => setDraft({ ...draft, postalCodeFrom: event.target.value })} /></label>
      <label>CP final<input inputMode="numeric" pattern="[0-9]{5}" maxLength={5} required value={draft.postalCodeTo} onChange={(event) => setDraft({ ...draft, postalCodeTo: event.target.value })} /></label>
    </div><label className="delivery-check"><input type="checkbox" checked={draft.active} onChange={(event) => setDraft({ ...draft, active: event.target.checked })} /> Activa</label>
      <div className="delivery-address-actions"><button disabled={busy} className="delivery-primary">{busy ? "Guardando…" : "Guardar tarifa"}</button>{editingId && <button type="button" onClick={() => { setEditingId(undefined); setDraft({ name: "", postalCodeFrom: "", postalCodeTo: "", amount: "", active: true }); }}>Cancelar edición</button>}</div></fieldset>
    </form></div>
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
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    Promise.all([listProductOrders(true, { page, limit: 15, deliveryMethod: method, fulfillmentStatus: status }), detailId ? getProductOrder(detailId) : Promise.resolve(null)])
      .then(([orders, detail]) => { if (active) { setList(orders); setSelected(detail); setError(""); } })
      .catch((failure: unknown) => { if (active) setError(deliveryErrorMessage(failure)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [page, method, status, detailId, refresh]);
  return <div className="delivery-page delivery-admin-page"><DeliveryHeader eyebrow="Titanium / Operación de tienda" title="Pedidos y entregas" description="Cada pedido, en movimiento. Gestiona compras, recogidas y envíos desde un mismo lugar.">
    <button onClick={() => setRefresh((value) => value + 1)}><DeliveryIcon name="refresh" />Actualizar</button></DeliveryHeader>
    <div className="delivery-stats" aria-label="Resumen de pedidos consultados">
      <article><span className="delivery-icon-tile"><DeliveryIcon name="package" /></span><div><span>Pedidos con estos filtros</span><strong>{list?.pagination.total ?? "—"}</strong></div></article>
      <article><span className="delivery-icon-tile"><DeliveryIcon name="pickup" /></span><div><span>Recogidas en esta página</span><strong>{list ? list.orders.filter((order) => order.fulfillment?.method === "pickup").length : "—"}</strong></div></article>
      <article><span className="delivery-icon-tile"><DeliveryIcon name="delivery" /></span><div><span>Envíos en esta página</span><strong>{list ? list.orders.filter((order) => order.fulfillment?.method === "delivery").length : "—"}</strong></div></article>
    </div>
    {error && <p role="alert" className="delivery-error">{error}</p>}
    <div className="delivery-toolbar"><label>Método de entrega<select value={method} onChange={(event) => { setMethod(event.target.value); setPage(1); }}><option value="">Todos</option><option value="pickup">Recogida</option><option value="delivery">Domicilio</option></select></label>
      <label>Estado logístico<select value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }}><option value="">Todos</option>{Object.entries(fulfillmentLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label></div>
    {loading && <DeliveryLoading>Consultando pedidos…</DeliveryLoading>}
    {detailId && !selected && !error && !loading && <DeliveryLoading>Consultando detalle del pedido…</DeliveryLoading>}
    {selected && selected.id === detailId && <section className="delivery-card delivery-selected-detail"><div className="delivery-detail-close"><button onClick={() => { setDetailId(null); setSelected(null); }}>Cerrar detalle</button></div><OrderDetails order={selected} admin />
      <FulfillmentEditor key={`${selected.id}-${selected.fulfillment?.status}`} order={selected} onUpdated={() => setRefresh((value) => value + 1)} /></section>}
    <section className="delivery-card"><div className="delivery-card-heading"><h2>Pedidos de productos</h2><span className="delivery-muted">{list ? `${list.orders.length} en esta página` : "Cargando…"}</span></div>
      <div className="delivery-table-wrap"><table className="delivery-table delivery-orders-table"><caption className="delivery-sr-only">Pedidos de productos y su estado de pago y entrega</caption><thead><tr><th scope="col">Pedido / fecha</th><th scope="col">Cliente</th><th scope="col">Total / pago</th><th scope="col">Entrega</th><th scope="col">Acción</th></tr></thead><tbody>{list?.orders.map((order) => <tr key={order.id}>
      <td data-label="Pedido / fecha"><strong>{order.orderNumber}</strong><br /><small>{dateTime(order.createdAt)}</small></td><td data-label="Cliente">{order.customer?.email || "Sin datos"}</td><td data-label="Total / pago"><strong>{money(order.total)}</strong><br /><StatusBadge status={order.status} payment /></td>
      <td data-label="Entrega">{order.fulfillment ? <div className="delivery-cell-status"><MethodBadge method={order.fulfillment.method} /><StatusBadge status={order.fulfillment.status} /></div> : "Sin seguimiento registrado"}</td>
      <td data-label="Acción"><button aria-label={`Gestionar ${order.orderNumber}`} onClick={() => { if (detailId === order.id) setRefresh((value) => value + 1); else { setSelected(null); setDetailId(order.id); } }}>Gestionar<DeliveryIcon name="arrow" /></button></td></tr>)}</tbody></table></div>
      {list && !list.orders.length && <DeliveryEmpty title="Sin pedidos con estos filtros"><p>Prueba con otra modalidad o estado de entrega.</p></DeliveryEmpty>}</section>
    <nav aria-label="Paginación de pedidos" className="delivery-pagination"><button disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>Anterior</button><span>Página {page} de {Math.max(1, list?.pagination.pages || 1)}</span><button disabled={!list || page >= list.pagination.pages} onClick={() => setPage((value) => value + 1)}>Siguiente</button></nav>
    <section className="delivery-configuration"><div><span className="delivery-eyebrow">Configuración de la tienda</span><h2>Prepara cada entrega</h2><p className="delivery-muted">Ubicación de recogida, horarios y cobertura de envíos.</p></div><PickupSettingsForm /><ShippingRates /></section>
  </div>;
}
