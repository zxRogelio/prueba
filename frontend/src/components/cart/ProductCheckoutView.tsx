import type { FormEvent } from "react";
import { Link } from "react-router-dom";
import type { CartItem } from "../../context/cartContextCore";
import { money, type Address, type PickupLocation, type ProductQuote, type SavedAddress } from "../../services/deliveryService";
import AddressFields from "./AddressFields";
import PickupLocationDetails from "./PickupLocationDetails";
import { DeliveryIcon } from "./DeliveryUi";

type Props = {
  items: CartItem[]; subtotal: number; token: string | null; method: "pickup" | "delivery";
  setMethod: (value: "pickup" | "delivery") => void; address: Address; setAddress: (value: Address) => void;
  addresses: SavedAddress[]; addressId: string; setAddressId: (value: string) => void;
  saveForLater: boolean; setSaveForLater: (value: boolean) => void; pickupLocation: PickupLocation | null;
  currentQuote: ProductQuote | null; confirmedQuote: string; setConfirmedQuote: (value: string) => void;
  isCreatingCheckout: boolean; isQuoting: boolean; errorMessage: string | null;
  handleSubmit: (event: FormEvent<HTMLFormElement>) => void; handleQuote: (event: FormEvent<HTMLFormElement>) => void;
  onRequote: () => void;
};

export default function ProductCheckoutView(props: Props) {
  const { items, subtotal, token, method, setMethod, address, setAddress, addresses, addressId, setAddressId,
    saveForLater, setSaveForLater, pickupLocation, currentQuote, confirmedQuote, setConfirmedQuote,
    isCreatingCheckout, isQuoting, errorMessage, handleSubmit, handleQuote, onRequote } = props;
  const busy = isCreatingCheckout || isQuoting;
  const saved = addresses.find((item) => item.id === addressId);
  return <div className="delivery-checkout">
    <div className="delivery-checkout-shell">
      <nav aria-label="Ruta de navegación" className="delivery-breadcrumbs"><Link to="/">Inicio</Link><span aria-hidden="true">/</span><Link to="/catalogue">Productos</Link><span aria-hidden="true">/</span><span aria-current="page">Checkout</span></nav>
      <header className="delivery-checkout-heading"><span className="delivery-eyebrow">Titanium / Tu siguiente paso</span><h1>PREPARA TU COMPRA<span>.</span></h1><p>Elige cómo recibir tus productos. Nosotros nos encargamos del resto.</p></header>
      <ol className="delivery-checkout-steps" aria-label="Pasos de compra"><li aria-current={!currentQuote ? "step" : undefined}><span>01</span>Entrega</li><li aria-current={currentQuote ? "step" : undefined}><span>02</span>Confirmación</li><li><span>03</span>Pago seguro</li></ol>
      <div className="delivery-checkout-grid">
        <form onSubmit={currentQuote ? handleSubmit : handleQuote} className="delivery-checkout-form" aria-busy={busy}>
          <section className="delivery-card"><div className="delivery-section-heading"><span className="delivery-step-number">01</span><div><h2>¿Cómo quieres recibirlo?</h2><p className="delivery-muted">Selecciona la modalidad de entrega de tu compra.</p></div></div>
            <fieldset className="delivery-methods" disabled={busy}><legend className="delivery-sr-only">Selecciona cómo recibir tu compra</legend>
              <label className={`delivery-method-option ${method === "pickup" ? "is-selected" : ""}`}><input type="radio" aria-label="Recoger en gimnasio" name="deliveryMethod" checked={method === "pickup"} onChange={() => setMethod("pickup")} /><DeliveryIcon name="pickup" /><span><strong>Recoger en gimnasio</strong><small>Recoge cuando tu pedido esté listo.</small></span><span className="delivery-method-price">Gratis</span></label>
              <label className={`delivery-method-option ${method === "delivery" ? "is-selected" : ""}`}><input type="radio" aria-label="Envío a domicilio" name="deliveryMethod" checked={method === "delivery"} onChange={() => setMethod("delivery")} /><DeliveryIcon name="delivery" /><span><strong>Envío a domicilio</strong><small>Consulta la cobertura de tu código postal.</small></span></label>
            </fieldset>
          </section>
          <section className="delivery-card"><div className="delivery-section-heading"><span className="delivery-step-number">02</span><div><h2>{method === "pickup" ? "Tu punto de recogida" : "Tu dirección de entrega"}</h2><p className="delivery-muted">{method === "pickup" ? "Déjanos tus datos para identificar tu pedido." : "Utiliza una dirección guardada o agrega un nuevo destino."}</p></div></div>
            <fieldset className="delivery-details" disabled={busy}><legend className="delivery-sr-only">{method === "pickup" ? "Contacto para recogida" : "Dirección de entrega"}</legend>
              {method === "pickup" ? <>
                {pickupLocation ? <><PickupLocationDetails location={pickupLocation} /><p className="delivery-notice"><DeliveryIcon name="clock" />Recogida gratuita. Espera la confirmación de que tu pedido está listo.</p></> : <p role="status" className="delivery-notice">La recogida requiere que el gimnasio configure su dirección y teléfono.</p>}
                <AddressFields value={address} onChange={setAddress} contactOnly />
              </> : <>
                <label>Dirección guardada<select value={addressId} onChange={(event) => setAddressId(event.target.value)}><option value="">Usar una dirección nueva</option>{addresses.map((item) => <option key={item.id} value={item.id}>{item.isDefault ? "Predeterminada · " : ""}{item.recipientName} · {item.street} {item.exteriorNumber}, {item.postalCode}</option>)}</select></label>
                {addressId ? saved && <div className="delivery-saved-preview"><DeliveryIcon name="pickup" /><p><strong>{saved.recipientName}</strong> · {saved.phone}<br />{saved.street} {saved.exteriorNumber} {saved.interiorNumber}, {saved.neighborhood}<br />{saved.municipality}, {saved.state}, CP {saved.postalCode}<br />{saved.references}</p></div> : <><AddressFields value={address} onChange={setAddress} /><label className="delivery-check"><input type="checkbox" checked={saveForLater} onChange={(event) => setSaveForLater(event.target.checked)} />Guardar dirección para futuras compras</label></>}
              </>}
            </fieldset>
          </section>
          <section className="delivery-card delivery-payment-panel"><div className="delivery-section-heading"><span className="delivery-step-number">03</span><div><h2>Confirma y continúa</h2><p className="delivery-muted">Revisa el total antes de ir a Mercado Pago.</p></div></div>
            {!token && <p className="delivery-notice">Inicia sesión para continuar con tu compra.</p>}
            {!items.length && <p className="delivery-notice">Tu carrito está vacío. Agrega productos desde el catálogo.</p>}
            {errorMessage && <p className="delivery-error" role="alert">{errorMessage}</p>}
            {currentQuote ? <div className="delivery-confirmation"><span className="delivery-eyebrow">Total de tu compra</span><strong>{money(currentQuote.total)}</strong><label className="delivery-check"><input type="checkbox" required disabled={busy}
              checked={confirmedQuote === currentQuote.quoteToken} onChange={(event) => setConfirmedQuote(event.target.checked ? currentQuote.quoteToken : "")} />Confirmo el método de entrega, el envío de {money(currentQuote.shippingTotal)} y el total de {money(currentQuote.total)}.</label></div>
              : <p className="delivery-notice">Consulta el total para confirmar descuentos y el importe de envío de tu compra.</p>}
            <button type="submit" className="delivery-primary delivery-pay-button" disabled={!token || !items.length || busy || (method === "pickup" && !pickupLocation)}><DeliveryIcon name={busy ? "clock" : "arrow"} />{isCreatingCheckout ? "CREANDO CHECKOUT..." : isQuoting ? "CONSULTANDO TOTAL..." : currentQuote ? "PAGAR CON MERCADO PAGO" : "CONSULTAR TOTAL Y ENVÍO"}</button>
            {currentQuote && <button type="button" className="delivery-secondary" disabled={busy} onClick={onRequote}>Volver a consultar el total</button>}
            {!token && <Link to="/login" className="delivery-primary">Iniciar sesión</Link>}
            <p className="delivery-payment-trust"><DeliveryIcon name="check" />Pago seguro con Mercado Pago. Completarás el pago en su plataforma.</p>
          </section>
        </form>
        <aside className="delivery-card delivery-checkout-summary" aria-label="Resumen del pedido"><div className="delivery-summary-heading"><DeliveryIcon name="package" /><h2>Tu pedido</h2><span>{items.reduce((sum, item) => sum + item.quantity, 0)} artículos</span></div>
          <div className="delivery-checkout-products">{items.map((item) => <div key={item.id} className="delivery-checkout-product"><img src={item.image} alt={item.name} /><div><strong>{item.name}</strong><small>{item.quantity} × {money(item.price)}</small></div><strong>{money(Number(currentQuote?.items.find((quoted) => String(quoted.productId) === String(item.id))?.subtotal ?? Number(item.price) * item.quantity))}</strong></div>)}</div>
          <dl className="delivery-totals"><dt>{currentQuote ? "Subtotal" : "Subtotal estimado"}</dt><dd>{money(currentQuote?.subtotal ?? subtotal)}</dd><dt>Descuentos aplicados</dt><dd>{currentQuote ? `−${money(currentQuote.discountTotal)}` : "Por confirmar"}</dd>
            <dt>{method === "pickup" ? "Recogida" : "Envío"}</dt><dd>{currentQuote ? money(currentQuote.shippingTotal) : method === "pickup" ? "Gratis" : "Por cotizar"}</dd><dt className="delivery-total-final">Total final</dt><dd className="delivery-total-final">{currentQuote ? money(currentQuote.total) : "Por confirmar"}</dd></dl>
          <p className="delivery-payment-trust"><DeliveryIcon name="check" />Sin datos de tarjeta en Titanium.</p><Link to="/catalogue" className="delivery-back-link">Seguir explorando productos<DeliveryIcon name="arrow" /></Link>
        </aside>
      </div>
    </div>
  </div>;
}
