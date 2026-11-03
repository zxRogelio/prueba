import { dateTime, fulfillmentLabels, money, paymentLabels, type ProductOrder } from "../../services/deliveryService";
import PickupLocationDetails from "./PickupLocationDetails";

export default function OrderDetails({ order, admin = false }: { order: ProductOrder; admin?: boolean }) {
  const fulfillment = order.fulfillment;
  return <>
    <div className="delivery-card-heading"><h2>{order.orderNumber}</h2><span className="delivery-badge">Pago: {paymentLabels[order.status] || order.status}</span></div>
    <p>Compra: {dateTime(order.createdAt)}{admin && order.customer ? ` · ${order.customer.email}` : ""}</p>
    <div className="delivery-table-wrap"><table className="delivery-table"><thead><tr><th>Producto</th><th>Cantidad</th><th>Precio</th><th>Descuento</th><th>Importe</th></tr></thead>
      <tbody>{order.items.map((item) => <tr key={item.id}><td>{item.itemNameSnapshot}</td><td>{item.quantity}</td><td>{money(item.unitPrice)}</td><td>{money(item.discountAmount)}</td><td>{money(item.subtotal)}</td></tr>)}</tbody></table></div>
    <dl className="delivery-totals"><dt>Subtotal</dt><dd>{money(order.subtotal)}</dd><dt>Descuentos</dt><dd>−{money(order.discountTotal)}</dd>
      <dt>Envío</dt><dd>{money(order.shippingTotal)}</dd>{Number(order.taxTotal) > 0 && <><dt>Impuestos</dt><dd>{money(order.taxTotal)}</dd></>}
      <dt><strong>Total</strong></dt><dd><strong>{money(order.total)}</strong></dd></dl>
    <p>Pago confirmado: {dateTime(order.paidAt)}</p>
    {admin && <ul>{order.payments.map((payment) => <li key={payment.id}>Pago {payment.id}: {paymentLabels[payment.status] || payment.status} · {money(payment.amount)} · {dateTime(payment.paidAt)}</li>)}</ul>}
    {!fulfillment ? <p className="delivery-notice">Esta orden no tiene seguimiento de entrega registrado.</p> : <>
      <div className="delivery-detail-grid"><section><h3>{fulfillment.method === "pickup" ? "Recogida en gimnasio" : "Envío a domicilio"}</h3>
        <p><strong>{fulfillmentLabels[fulfillment.status] || fulfillment.status}</strong></p>
        <p>{fulfillment.recipientName}<br />Tel. {fulfillment.phone}</p>
        {fulfillment.addressSnapshot && <p>{fulfillment.addressSnapshot.street} {fulfillment.addressSnapshot.exteriorNumber} {fulfillment.addressSnapshot.interiorNumber && `Int. ${fulfillment.addressSnapshot.interiorNumber}`}<br />
          {fulfillment.addressSnapshot.neighborhood}, CP {fulfillment.addressSnapshot.postalCode}<br />{fulfillment.addressSnapshot.municipality}, {fulfillment.addressSnapshot.state}<br />Referencias: {fulfillment.addressSnapshot.references}</p>}
        {fulfillment.pickupLocationSnapshot && <PickupLocationDetails location={fulfillment.pickupLocationSnapshot} />}
        {fulfillment.trackingNumber && <p>Paquetería: {fulfillment.carrier}<br />Guía: <strong>{fulfillment.trackingNumber}</strong></p>}
        {([
          ["Preparación", fulfillment.preparedAt], ["Listo para recoger", fulfillment.readyAt], ["Empaquetado", fulfillment.packedAt],
          ["Enviado", fulfillment.shippedAt], ["Entregado", fulfillment.deliveredAt], ["Recogido", fulfillment.pickedUpAt], ["Cancelado", fulfillment.cancelledAt],
        ] as const).filter(([, value]) => value).map(([label, value]) => <p key={label}>{label}: {dateTime(value)}</p>)}
        {admin && fulfillment.confirmedBy && <p>Entrega confirmada por: {fulfillment.confirmedBy}</p>}
      </section><section><h3>Historial del pedido</h3><ol className="delivery-timeline">{fulfillment.events.map((event) => <li key={event.id}>
        <strong>{fulfillmentLabels[event.toStatus] || event.toStatus}</strong><time dateTime={event.createdAt}>{dateTime(event.createdAt)}</time>
        {event.notes && <p>{event.notes}</p>}{event.details && <p>{event.details.carrier} · Guía: {event.details.trackingNumber}</p>}
        {admin && <small>{event.actorId ? `Responsable: ${event.actorId}` : "Sistema"}</small>}
      </li>)}</ol></section></div>
    </>}
  </>;
}
