import { useEffect, useMemo, useState, type FormEvent } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import "../styles/checkout.css";
import { useCart } from "../context/useCart";
import { createMercadoPagoCheckout } from "../services/checkoutService";
import { checkoutAttemptSignature } from "../utils/productCheckoutAttempt";
import AddressFields from "../components/cart/AddressFields";
import PickupLocationDetails from "../components/cart/PickupLocationDetails";
import { emptyAddress, getAddresses, getDeliveryOptions, quoteProducts, saveAddress, deliveryErrorMessage,
  type Address, type DeliveryInput, type PickupLocation, type ProductQuote, type SavedAddress } from "../services/deliveryService";
import "../styles/delivery.css";

const ATTEMPT_STORAGE_KEY = "titanium_mp_checkout_attempt";

function formatMoney(value: number) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
  }).format(value);
}

function createUuid() {
  if (window.crypto?.randomUUID) {
    return window.crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function getStoredAttemptKey(signature: string) {
  try {
    const stored = localStorage.getItem(ATTEMPT_STORAGE_KEY);
    const parsed = stored ? JSON.parse(stored) : null;

    if (parsed?.signature === signature && parsed?.idempotencyKey) {
      return parsed.idempotencyKey as string;
    }
  } catch {
    localStorage.removeItem(ATTEMPT_STORAGE_KEY);
  }

  const idempotencyKey = createUuid();
  localStorage.setItem(
    ATTEMPT_STORAGE_KEY,
    JSON.stringify({ signature, idempotencyKey })
  );

  return idempotencyKey;
}

function getErrorMessage(error: unknown) {
  if (axios.isAxiosError(error)) {
    return (
      (error.response?.data as { error?: string } | undefined)?.error ||
      "No se pudo crear el checkout."
    );
  }

  return "No se pudo crear el checkout.";
}

export default function CheckoutPage() {
  const { items } = useCart();
  const [isCreatingCheckout, setIsCreatingCheckout] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [method, setMethod] = useState<"pickup" | "delivery">("pickup");
  const [address, setAddress] = useState<Address>({ ...emptyAddress });
  const [addresses, setAddresses] = useState<SavedAddress[]>([]);
  const [addressId, setAddressId] = useState("");
  const [saveForLater, setSaveForLater] = useState(false);
  const [pickupLocation, setPickupLocation] = useState<PickupLocation | null>(null);
  const [quote, setQuote] = useState<{ signature: string; data: ProductQuote } | null>(null);
  const [confirmedQuote, setConfirmedQuote] = useState("");
  const [isQuoting, setIsQuoting] = useState(false);
  const token = localStorage.getItem("token");
  useEffect(() => {
    let active = true;
    Promise.all([getAddresses(), getDeliveryOptions()]).then(([saved, options]) => {
      if (active) { setAddresses(saved); setPickupLocation(options.pickupLocation); }
    }).catch((error: unknown) => { if (active) setErrorMessage(deliveryErrorMessage(error)); });
    return () => { active = false; };
  }, []);
  const fulfillment: DeliveryInput = method === "pickup" ? { method, recipientName: address.recipientName, phone: address.phone }
    : addressId ? { method, addressId } : { method, address };
  const subtotal = useMemo(
    () => items.reduce((sum, item) => sum + Number(item.price) * item.quantity, 0),
    [items]
  );
  const cartSignature = useMemo(
    () =>
      JSON.stringify(
        items
          .map((item) => ({
            productId: String(item.id),
            quantity: item.quantity,
          }))
          .sort((left, right) => left.productId.localeCompare(right.productId))
      ),
    [items]
  );
  const deliverySignature = JSON.stringify({ cartSignature, fulfillment });
  const currentQuote = quote?.signature === deliverySignature ? quote.data : null;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (items.length === 0 || isCreatingCheckout) return;

    setErrorMessage(null);
    setIsCreatingCheckout(true);

    try {
      if (!currentQuote || confirmedQuote !== currentQuote.quoteToken) throw new Error("Consulta y confirma el total antes de pagar.");
      if (Date.parse(currentQuote.expiresAt) <= Date.now()) throw new Error("La cotización venció. Consulta de nuevo el total.");
      if (method === "delivery" && !addressId && saveForLater) {
        const saved = await saveAddress(address);
        setAddresses((previous) => [...previous, saved]);
        setSaveForLater(false);
      }
      // Persist only a hash, never the customer's address or phone.
      const signature = await checkoutAttemptSignature(token || "", deliverySignature, currentQuote.quoteToken);
      const idempotencyKey = getStoredAttemptKey(signature);
      const response = await createMercadoPagoCheckout({
        idempotencyKey,
        fulfillment,
        quoteToken: currentQuote.quoteToken,
        items: items.map((item) => ({
          productId: item.id,
          quantity: item.quantity,
        })),
      });

      if (!response.checkoutUrl) {
        throw new Error("Mercado Pago no devolvio una URL de checkout.");
      }

      window.location.assign(response.checkoutUrl);
    } catch (error) {
      setErrorMessage(error instanceof Error && !axios.isAxiosError(error) ? error.message : getErrorMessage(error));
      setIsCreatingCheckout(false);
    }
  };

  const handleQuote = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!items.length || isQuoting || isCreatingCheckout) return;
    setIsQuoting(true); setErrorMessage(null); setConfirmedQuote("");
    try {
      const data = await quoteProducts(items.map((item) => ({ productId: item.id, quantity: item.quantity })), fulfillment);
      setQuote({ signature: deliverySignature, data });
    } catch (error) { setErrorMessage(deliveryErrorMessage(error)); }
    finally { setIsQuoting(false); }
  };

  return (
    <div className="page-container">
      <div className="bg-animation">
        <div className="bg-grid" />
        <div className="bg-glow bg-glow-1" />
        <div className="bg-glow bg-glow-2" />
      </div>

      <nav className="breadcrumbs">
        <ol className="breadcrumb-list">
          <li className="breadcrumb-item">
            <Link to="/" className="breadcrumb-link">
              INICIO
            </Link>
          </li>
          <li className="breadcrumb-separator">/</li>
          <li className="breadcrumb-item">
            <Link to="/catalogue" className="breadcrumb-link">
              PRODUCTOS
            </Link>
          </li>
          <li className="breadcrumb-separator">/</li>
          <li className="breadcrumb-item">
            <span className="breadcrumb-current">PAGO</span>
          </li>
        </ol>
      </nav>

      <section className="checkout-hero">
        <div className="checkout-hero-content">
          <h1 className="checkout-title brush-text">PROCESAR PAGO</h1>
          <p className="checkout-subtitle">
            Finaliza tu compra con Mercado Pago Checkout Pro.
          </p>
        </div>
      </section>

      <div className="checkout-container">
        <div className="checkout-content">
          <div className="checkout-form-section">
            <form onSubmit={currentQuote ? handleSubmit : handleQuote} className="checkout-form">
              <div className="form-section">
                <h3 className="section-title">Método de entrega</h3>
                <fieldset className="delivery-methods" disabled={isCreatingCheckout || isQuoting}>
                  <legend>Selecciona cómo recibir tu compra</legend>
                  <label><input type="radio" name="deliveryMethod" checked={method === "pickup"} onChange={() => setMethod("pickup")} /> Recoger en Titanium Sport Gym · Gratis</label>
                  <label><input type="radio" name="deliveryMethod" checked={method === "delivery"} onChange={() => setMethod("delivery")} /> Envío a domicilio</label>
                </fieldset>
                <fieldset className="delivery-details" disabled={isCreatingCheckout || isQuoting}>
                  <legend>{method === "pickup" ? "Contacto para recogida" : "Dirección de entrega"}</legend>
                  {method === "pickup" ? <>
                    {pickupLocation ? <><PickupLocationDetails location={pickupLocation} /><p>Recogida gratuita. Espera la confirmación de que tu pedido está listo.</p></>
                      : <p role="status">La recogida requiere que el gimnasio configure su dirección y teléfono.</p>}
                    <AddressFields value={address} onChange={setAddress} contactOnly />
                  </> : <>
                    <label>Dirección guardada<select value={addressId} onChange={(event) => setAddressId(event.target.value)}>
                      <option value="">Usar una dirección nueva</option>
                      {addresses.map((saved) => <option key={saved.id} value={saved.id}>{saved.isDefault ? "Predeterminada · " : ""}{saved.recipientName} · {saved.street} {saved.exteriorNumber}, {saved.postalCode}</option>)}
                    </select></label>
                    {addressId ? (() => { const saved = addresses.find((item) => item.id === addressId); return saved ? <p>{saved.recipientName} · {saved.phone}<br />{saved.street} {saved.exteriorNumber} {saved.interiorNumber}, {saved.neighborhood}<br />{saved.municipality}, {saved.state}, CP {saved.postalCode}<br />{saved.references}</p> : null; })()
                      : <><AddressFields value={address} onChange={setAddress} />
                        <label className="delivery-check"><input type="checkbox" checked={saveForLater} onChange={(event) => setSaveForLater(event.target.checked)} /> Guardar dirección para futuras compras</label></>}
                  </>}
                </fieldset>

                {!token ? (
                  <div className="shipping-notice">
                    Inicia sesion para continuar con tu compra.
                  </div>
                ) : null}

                {items.length === 0 ? (
                  <div className="shipping-notice">
                    Tu carrito esta vacio. Agrega productos desde el catalogo.
                  </div>
                ) : (
                  <div className="shipping-options">
                    <div className="shipping-option">
                      <div className="shipping-option-content">
                        <span className="shipping-name">Mercado Pago</span>
                        <span className="shipping-price">
                          Checkout Pro seguro
                        </span>
                        <span className="shipping-time">
                          Seras redirigido para completar el pago.
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {errorMessage ? (
                  <div className="shipping-notice" role="alert">{errorMessage}</div>
                ) : null}
              </div>

              {currentQuote && <label className="delivery-check"><input type="checkbox" required
                checked={confirmedQuote === currentQuote.quoteToken} onChange={(event) => setConfirmedQuote(event.target.checked ? currentQuote.quoteToken : "")} />
                Confirmo el método de entrega, el envío de {formatMoney(Number(currentQuote.shippingTotal))} y el total de {formatMoney(Number(currentQuote.total))}.</label>}
              {currentQuote && <button type="button" className="delivery-secondary" disabled={isCreatingCheckout} onClick={() => { setQuote(null); setConfirmedQuote(""); }}>Volver a consultar el total</button>}
              <button
                type="submit"
                className="checkout-submit-btn"
                disabled={!token || items.length === 0 || isCreatingCheckout || isQuoting || (method === "pickup" && !pickupLocation)}
              >
                {isCreatingCheckout ? "CREANDO CHECKOUT..." : isQuoting ? "CONSULTANDO TOTAL..." : currentQuote ? "PAGAR CON MERCADO PAGO" : "CONSULTAR TOTAL Y ENVÍO"}
              </button>

              {!token ? (
                <Link to="/login" className="checkout-submit-btn">
                  INICIAR SESION
                </Link>
              ) : null}
            </form>
          </div>

          <div className="order-summary-section">
            <div className="order-summary-card">
              <h3 className="summary-title">RESUMEN DEL PEDIDO</h3>

              <div className="order-items">
                {items.map((item) => (
                  <div key={item.id} className="order-item">
                    <img
                      src={item.image}
                      alt={item.name}
                      className="order-item-image"
                    />
                    <div className="order-item-details">
                      <h4>{item.name}</h4>
                      <div className="order-item-meta">
                        <span>Cantidad: {item.quantity}</span>
                        <span>{formatMoney(Number(item.price))} c/u</span>
                      </div>
                    </div>
                    <div className="order-item-total">
                      {formatMoney(Number(currentQuote?.items.find((quoted) => String(quoted.productId) === String(item.id))?.subtotal ?? Number(item.price) * item.quantity))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="order-totals">
                <div className="order-line">
                  <span>{currentQuote ? "Subtotal" : "Subtotal estimado"}</span>
                  <span>{formatMoney(Number(currentQuote?.subtotal ?? subtotal))}</span>
                </div>
                <div className="order-line"><span>Descuentos aplicados</span><span>{currentQuote ? `−${formatMoney(Number(currentQuote.discountTotal))}` : "Por confirmar"}</span></div>
                <div className="order-line"><span>{method === "pickup" ? "Recogida" : "Envío"}</span><span>{currentQuote ? formatMoney(Number(currentQuote.shippingTotal)) : method === "pickup" ? "Gratis" : "Por cotizar"}</span></div>
                <div className="order-total">
                  <span>Total final</span>
                  <span>{currentQuote ? formatMoney(Number(currentQuote.total)) : "Por confirmar"}</span>
                </div>
              </div>

              <div className="security-badges">
                <div className="security-badge">Checkout Pro de Mercado Pago</div>
                <div className="security-badge">Sin datos de tarjeta en Titanium</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
