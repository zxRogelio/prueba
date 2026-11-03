import { useEffect, useMemo, useState, type FormEvent } from "react";
import axios from "axios";
import { useCart } from "../context/useCart";
import { createMercadoPagoCheckout } from "../services/checkoutService";
import { checkoutAttemptSignature } from "../utils/productCheckoutAttempt";
import ProductCheckoutView from "../components/cart/ProductCheckoutView";
import { emptyAddress, getAddresses, getDeliveryOptions, quoteProducts, saveAddress, deliveryErrorMessage,
  type Address, type DeliveryInput, type PickupLocation, type ProductQuote, type SavedAddress } from "../services/deliveryService";
import "../styles/delivery.css";

const ATTEMPT_STORAGE_KEY = "titanium_mp_checkout_attempt";

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

  return <ProductCheckoutView items={items} subtotal={subtotal} token={token} method={method} setMethod={setMethod}
    address={address} setAddress={setAddress} addresses={addresses} addressId={addressId} setAddressId={setAddressId}
    saveForLater={saveForLater} setSaveForLater={setSaveForLater} pickupLocation={pickupLocation} currentQuote={currentQuote}
    confirmedQuote={confirmedQuote} setConfirmedQuote={setConfirmedQuote} isCreatingCheckout={isCreatingCheckout}
    isQuoting={isQuoting} errorMessage={errorMessage} handleSubmit={handleSubmit} handleQuote={handleQuote}
    onRequote={() => { setQuote(null); setConfirmedQuote(""); }} />;
}
