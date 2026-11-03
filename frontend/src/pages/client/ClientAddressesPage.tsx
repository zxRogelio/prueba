import { useEffect, useState, type FormEvent } from "react";
import AddressFields from "../../components/cart/AddressFields";
import { deleteAddress, deliveryErrorMessage, emptyAddress, getAddresses, saveAddress, type Address, type SavedAddress } from "../../services/deliveryService";
import "../../styles/delivery.css";

export default function ClientAddressesPage() {
  const [addresses, setAddresses] = useState<SavedAddress[]>([]);
  const [draft, setDraft] = useState<Address>({ ...emptyAddress });
  const [editingId, setEditingId] = useState<string | undefined>();
  const [isDefault, setIsDefault] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => { let active = true; getAddresses().then((rows) => { if (active) setAddresses(rows); }).catch((failure: unknown) => { if (active) setError(deliveryErrorMessage(failure)); }); return () => { active = false; }; }, []);
  const perform = async (callback: () => Promise<unknown>) => {
    setBusy(true); setError("");
    try { await callback(); setAddresses(await getAddresses()); }
    catch (failure) { setError(deliveryErrorMessage(failure)); }
    finally { setBusy(false); }
  };
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void perform(async () => { await saveAddress({ ...draft, isDefault }, editingId); setDraft({ ...emptyAddress }); setEditingId(undefined); setIsDefault(false); });
  };
  return <div className="delivery-page"><h1>Mis direcciones</h1>{error && <p role="alert" className="delivery-error">{error}</p>}
    {addresses.map((address) => <article className="delivery-card" key={address.id}><h2>{address.recipientName}{address.isDefault ? " · Predeterminada" : ""}</h2>
      <p>{address.street} {address.exteriorNumber} {address.interiorNumber}, {address.neighborhood}<br />{address.municipality}, {address.state}, CP {address.postalCode}<br />{address.phone}</p>
      <div className="delivery-address-actions"><button disabled={busy} onClick={() => { setDraft(address); setEditingId(address.id); setIsDefault(address.isDefault); }}>Editar</button>
        <button disabled={busy || address.isDefault} onClick={() => void perform(() => saveAddress({ ...address, isDefault: true }, address.id))}>Hacer predeterminada</button>
        <button disabled={busy} onClick={() => void perform(() => deleteAddress(address.id))}>Eliminar</button></div></article>)}
    <form className="delivery-card" onSubmit={submit}><h2>{editingId ? "Editar dirección" : "Agregar dirección"}</h2><fieldset disabled={busy} className="delivery-details">
      <AddressFields value={draft} onChange={setDraft} /><p><label><input type="checkbox" checked={isDefault} onChange={(event) => setIsDefault(event.target.checked)} /> Dirección predeterminada</label></p>
      <button type="submit" className="delivery-primary">{busy ? "Guardando…" : "Guardar dirección"}</button>{editingId && <button type="button" onClick={() => { setEditingId(undefined); setDraft({ ...emptyAddress }); setIsDefault(false); }}>Cancelar edición</button>}</fieldset></form>
  </div>;
}
