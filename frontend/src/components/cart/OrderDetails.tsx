import { dateTime, fulfillmentLabels, money, paymentLabels, type ProductOrder } from "../../services/deliveryService";
import { deliveryProgress } from "../../utils/deliveryProgress";
import PickupLocationDetails from "./PickupLocationDetails";
import { DeliveryIcon, MethodBadge, StatusBadge } from "./DeliveryUi";

export default function OrderDetails({ order, admin = false }: { order: ProductOrder; admin?: boolean }) {
  const fulfillment = order.fulfillment;
  return <div className="delivery-order-detail">
    <div className="delivery-card-heading"><div><span className="delivery-eyebrow">Detalle de tu compra</span><h2>{order.orderNumber}</h2>
      <p className="delivery-muted">Compra: {dateTime(order.createdAt)}{admin && order.customer ? ` · ${order.customer.email}` : ""}</p></div><StatusBadge status={order.status} payment /></div>
    <section aria-label="Productos del pedido" className="delivery-products">{order.items.map((item) => <div className="delivery-product-row" key={item.id}>
      <span className="delivery-icon-tile"><DeliveryIcon name="package" /></span><div><strong>{item.itemNameSnapshot}</strong><small>{item.quantity} × {money(item.unitPrice)}{Number(item.discountAmount) > 0 && ` · Descuento ${money(item.discountAmount)}`}</small></div><strong>{money(item.subtotal)}</strong>
    </div>)}</section>
    <div className="delivery-detail-grid"><section className="delivery-inset"><h3>Resumen de compra</h3>
      <dl className="delivery-totals"><dt>Subtotal</dt><dd>{money(order.subtotal)}</dd><dt>Descuentos</dt><dd>−{money(order.discountTotal)}</dd>
        <dt>Envío</dt><dd>{money(order.shippingTotal)}</dd>{Number(order.taxTotal) > 0 && <><dt>Impuestos</dt><dd>{money(order.taxTotal)}</dd></>}
        <dt className="delivery-total-final">Total</dt><dd className="delivery-total-final">{money(order.total)}</dd></dl>
      <p className="delivery-muted">Pago confirmado: {dateTime(order.paidAt)}</p>
      {admin && <ul className="delivery-payment-list">{order.payments.map((payment) => <li key={payment.id}>{paymentLabels[payment.status] || payment.status} · {money(payment.amount)}<small>{dateTime(payment.paidAt)} · {payment.id}</small></li>)}</ul>}
    </section>{fulfillment && <section className="delivery-inset"><h3>Datos de entrega</h3><MethodBadge method={fulfillment.method} />
      <p><strong>{fulfillment.recipientName}</strong><br />Tel. {fulfillment.phone}</p>
      {fulfillment.addressSnapshot && <p>{fulfillment.addressSnapshot.street} {fulfillment.addressSnapshot.exteriorNumber} {fulfillment.addressSnapshot.interiorNumber && `Int. ${fulfillment.addressSnapshot.interiorNumber}`}<br />
        {fulfillment.addressSnapshot.neighborhood}, CP {fulfillment.addressSnapshot.postalCode}<br />{fulfillment.addressSnapshot.municipality}, {fulfillment.addressSnapshot.state}<br />Referencias: {fulfillment.addressSnapshot.references}</p>}
      {fulfillment.pickupLocationSnapshot && <PickupLocationDetails location={fulfillment.pickupLocationSnapshot} />}
      {(fulfillment.carrier || fulfillment.trackingNumber) && <div className="delivery-tracking"><DeliveryIcon name="delivery" /><div><span>Paquetería: {fulfillment.carrier || "Sin registrar"}</span><strong>Guía: {fulfillment.trackingNumber || "Sin registrar"}</strong></div></div>}
      {admin && fulfillment.confirmedBy && <p className="delivery-muted">Entrega confirmada por: {fulfillment.confirmedBy}</p>}
    </section>}</div>
    {!fulfillment ? <p className="delivery-notice">Esta orden no tiene seguimiento de entrega registrado.</p> : <>
      <section className="delivery-tracking-section"><div className="delivery-card-heading"><h3>Seguimiento de entrega</h3><StatusBadge status={fulfillment.status} /></div>
        {["incident", "delivery_failed", "cancelled"].includes(fulfillment.status) && <p className="delivery-error"><DeliveryIcon name="alert" />{fulfillmentLabels[fulfillment.status]}. Consulta el historial para conocer los detalles.</p>}
        {fulfillment.cancelledAt && <p className="delivery-muted">Cancelación confirmada: {dateTime(fulfillment.cancelledAt)}</p>}
        {fulfillment.status === "awaiting_payment" && <p className="delivery-notice">La preparación comenzará cuando el pago esté confirmado.</p>}
        <ol className="delivery-progress" aria-label="Progreso confirmado por el gimnasio">{deliveryProgress(fulfillment).map((step) => <li key={step.status}
          className={step.current ? "is-current" : step.confirmed ? "is-complete" : "is-pending"} aria-current={step.current ? "step" : undefined}>
          <span className="delivery-progress-dot"><DeliveryIcon name={step.confirmed && !step.current ? "check" : "clock"} /></span><div><strong>{fulfillmentLabels[step.status]}</strong>
            <small>{step.current ? "Estado actual" : step.confirmed ? "Confirmado" : "Pendiente"}{step.at && ` · ${dateTime(step.at)}`}</small></div>
        </li>)}</ol>
      </section>
      <section className="delivery-history"><h3>Historial del pedido</h3>{!fulfillment.events.length && <p className="delivery-muted">Aún no hay movimientos registrados.</p>}
        <ol className="delivery-timeline">{fulfillment.events.map((event) => <li key={event.id}>
          <div><strong>{fulfillmentLabels[event.toStatus] || event.toStatus}</strong><time dateTime={event.createdAt}>{dateTime(event.createdAt)}</time></div>
          {event.notes && <p>{event.notes}</p>}{event.details && <p>{event.details.carrier} · Guía: {event.details.trackingNumber}</p>}
          {admin && <small>{event.actorId ? `Responsable: ${event.actorId}` : "Sistema"}</small>}
        </li>)}</ol>
      </section>
    </>}
  </div>;
}
