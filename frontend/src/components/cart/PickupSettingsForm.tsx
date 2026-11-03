import { useEffect, useState, type FormEvent } from "react";
import { deliveryErrorMessage, getPickupSettings, savePickupSettings, type PickupSettings } from "../../services/deliveryService";

const blank: PickupSettings = { name: "", address: "", municipality: "", state: "", postalCode: "", phone: "", hours: "", instructions: "", enabled: true };
const fields: Array<{ key: Exclude<keyof PickupSettings, "enabled">; label: string; max: number }> = [
  { key: "name", label: "Nombre del gimnasio", max: 120 }, { key: "address", label: "Dirección física completa", max: 255 },
  { key: "municipality", label: "Municipio", max: 100 }, { key: "state", label: "Estado", max: 100 },
  { key: "postalCode", label: "Código postal del gimnasio", max: 5 }, { key: "phone", label: "Teléfono de contacto", max: 25 },
  { key: "hours", label: "Horarios de recogida", max: 300 }, { key: "instructions", label: "Instrucciones para recoger", max: 1000 },
];

export default function PickupSettingsForm() {
  const [draft, setDraft] = useState({ ...blank });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [configured, setConfigured] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  useEffect(() => { let active = true;
    getPickupSettings().then((data) => { if (active) { setDraft(data.settings); setConfigured(data.configured); } })
      .catch((failure: unknown) => { if (active) setError(deliveryErrorMessage(failure)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); if (busy) return;
    setBusy(true); setError(""); setSaved(false);
    try { const data = await savePickupSettings(draft); setDraft(data.settings); setConfigured(true); setSaved(true); }
    catch (failure) { setError(deliveryErrorMessage(failure)); }
    finally { setBusy(false); }
  };
  return <details className="delivery-card delivery-rates"><summary>Configuración de recogida en gimnasio</summary>
    <p>Guarda únicamente la ubicación y horarios reales del gimnasio. Estos datos se muestran al comprar y se conservan en cada pedido.</p>
    {!configured && !loading && <p className="delivery-notice">Completa la configuración de recogida. Los datos de contacto anteriores se conservan.</p>}
    {error && <p role="alert" className="delivery-error">{error}</p>}{saved && <p role="status">Configuración de recogida guardada.</p>}
    <form onSubmit={submit}><fieldset className="delivery-details" disabled={loading || busy}><div className="delivery-fields">
      {fields.map(({ key, label, max }) => <label key={key}>{label}<input required maxLength={max} value={draft[key]}
        type={key === "phone" ? "tel" : "text"} inputMode={key === "postalCode" ? "numeric" : undefined}
        pattern={key === "postalCode" ? "[0-9]{5}" : undefined}
        onChange={(event) => { setDraft({ ...draft, [key]: event.target.value }); setSaved(false); }} /></label>)}
    </div><p><label className="delivery-check"><input type="checkbox" checked={draft.enabled} onChange={(event) => setDraft({ ...draft, enabled: event.target.checked })} /> Ofrecer recogida en gimnasio</label></p>
      <button className="delivery-primary" disabled={loading || busy}>{busy ? "Guardando…" : "Guardar configuración de recogida"}</button>
    </fieldset></form>
  </details>;
}
