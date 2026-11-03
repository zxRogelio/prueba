import { useEffect, useRef, useState, type FormEvent } from "react";
import AddressFields from "../../components/cart/AddressFields";
import { DeliveryEmpty, DeliveryHeader, DeliveryIcon, DeliveryLoading } from "../../components/cart/DeliveryUi";
import { deleteAddress, deliveryErrorMessage, emptyAddress, getAddresses, saveAddress, type Address, type SavedAddress } from "../../services/deliveryService";
import "../../styles/delivery.css";

export default function ClientAddressesPage() {
  const [addresses, setAddresses] = useState<SavedAddress[]>([]);
  const [draft, setDraft] = useState<Address>({ ...emptyAddress });
  const [editingId, setEditingId] = useState<string | undefined>();
  const [isDefault, setIsDefault] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState("");
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => { let active = true; getAddresses().then((rows) => { if (active) setAddresses(rows); }).catch((failure: unknown) => { if (active) setError(deliveryErrorMessage(failure)); }).finally(() => { if (active) setLoading(false); }); return () => { active = false; }; }, []);
  const perform = async (callback: () => Promise<unknown>) => {
    if (busy) return;
    setBusy(true); setError(""); setSaved("");
    try { await callback(); setAddresses(await getAddresses()); }
    catch (failure) { setError(deliveryErrorMessage(failure)); }
    finally { setBusy(false); }
  };
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void perform(async () => { await saveAddress({ ...draft, isDefault }, editingId); setDraft({ ...emptyAddress }); setEditingId(undefined); setIsDefault(false); setSaved("Dirección guardada correctamente."); });
  };
  const focusForm = () => { formRef.current?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth", block: "start" }); formRef.current?.querySelector<HTMLInputElement>("input")?.focus({ preventScroll: true }); };
  return <div className="delivery-page"><DeliveryHeader eyebrow="Titanium / Tus datos de entrega" title="Mis direcciones" description="Tus destinos, siempre a la mano. Guarda tus direcciones para agilizar tu próxima compra.">
    <button type="button" disabled={busy} onClick={() => { setEditingId(undefined); setDraft({ ...emptyAddress }); setIsDefault(false); setSaved(""); setError(""); focusForm(); }}><DeliveryIcon name="pickup" />Agregar dirección</button></DeliveryHeader>
    {error && <p role="alert" className="delivery-error">{error}</p>}{saved && <p role="status" className="delivery-success">{saved}</p>}
    {loading && <DeliveryLoading>Consultando direcciones…</DeliveryLoading>}
    {!loading && !addresses.length && !error && <DeliveryEmpty title="Un lugar para tus próximas entregas"><p>Aún no tienes direcciones guardadas. Agrega tu primer destino abajo.</p></DeliveryEmpty>}
    <div className="delivery-address-grid">{addresses.map((address) => <article className={`delivery-card delivery-address-card ${address.isDefault ? "is-default" : ""}`} key={address.id}>
      <div className="delivery-card-heading"><span className="delivery-icon-tile"><DeliveryIcon name="pickup" /></span>{address.isDefault && <span className="delivery-badge delivery-badge--neutral"><DeliveryIcon name="check" />Predeterminada</span>}</div><h2>{address.recipientName}</h2>
      <p>{address.street} {address.exteriorNumber} {address.interiorNumber}, {address.neighborhood}<br />{address.municipality}, {address.state}, CP {address.postalCode}<br />{address.phone}</p>
      <div className="delivery-address-actions"><button disabled={busy} aria-label={`Editar dirección de ${address.recipientName}`} onClick={() => { setDraft(address); setEditingId(address.id); setIsDefault(address.isDefault); focusForm(); }}>Editar</button>
        <button disabled={busy || address.isDefault} onClick={() => void perform(() => saveAddress({ ...address, isDefault: true }, address.id))}>Hacer predeterminada</button>
        <button className="delivery-danger-button" disabled={busy} aria-label={`Eliminar dirección de ${address.recipientName}`} onClick={() => {
          if (window.confirm(`¿Eliminar la dirección de ${address.recipientName}? Esta acción no se puede deshacer.`)) void perform(async () => { await deleteAddress(address.id); if (editingId === address.id) { setEditingId(undefined); setDraft({ ...emptyAddress }); setIsDefault(false); } setSaved("Dirección eliminada."); });
        }}>Eliminar</button></div></article>)}</div>
    <form className="delivery-card delivery-address-form" ref={formRef} onSubmit={submit}><span className="delivery-eyebrow">Datos del destinatario</span><h2>{editingId ? "Editar dirección" : "Agregar dirección"}</h2><p className="delivery-muted">Completa los datos obligatorios. El número interior es opcional.</p><fieldset disabled={busy || loading} className="delivery-details">
      <legend className="delivery-sr-only">Dirección completa</legend>
      <AddressFields value={draft} onChange={setDraft} /><p><label><input type="checkbox" checked={isDefault} onChange={(event) => setIsDefault(event.target.checked)} /> Dirección predeterminada</label></p>
      <div className="delivery-address-actions"><button type="submit" className="delivery-primary">{busy ? "Guardando…" : "Guardar dirección"}</button>{editingId && <button type="button" onClick={() => { setEditingId(undefined); setDraft({ ...emptyAddress }); setIsDefault(false); }}>Cancelar edición</button>}</div></fieldset></form>
  </div>;
}
