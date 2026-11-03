import type { Address } from "../../services/deliveryService";

const fields: Array<{ key: keyof Address; label: string; max: number; auto?: string }> = [
  { key: "recipientName", label: "Nombre del destinatario", max: 120, auto: "name" },
  { key: "phone", label: "Teléfono", max: 25, auto: "tel" },
  { key: "postalCode", label: "Código postal", max: 5, auto: "postal-code" },
  { key: "state", label: "Estado", max: 100, auto: "address-level1" },
  { key: "municipality", label: "Municipio", max: 100, auto: "address-level2" },
  { key: "neighborhood", label: "Colonia", max: 120, auto: "address-level3" },
  { key: "street", label: "Calle", max: 160, auto: "address-line1" },
  { key: "exteriorNumber", label: "Número exterior", max: 30 },
  { key: "interiorNumber", label: "Número interior (opcional)", max: 30 },
  { key: "references", label: "Referencias", max: 500 },
];

export default function AddressFields({ value, onChange, contactOnly = false }: {
  value: Address; onChange: (value: Address) => void; contactOnly?: boolean;
}) {
  return <div className="delivery-fields">{fields.filter((field) => !contactOnly || ["recipientName", "phone"].includes(field.key)).map(({ key, label, max, auto }) => (
    <label key={key}>{label}<input name={key} value={value[key] || ""} required={key !== "interiorNumber"}
      maxLength={max} autoComplete={auto} type={key === "phone" ? "tel" : "text"}
      inputMode={key === "postalCode" ? "numeric" : undefined}
      pattern={key === "postalCode" ? "[0-9]{5}" : key === "phone" ? "\\+?[0-9 \\(\\)\\-]{10,24}" : undefined}
      onChange={(event) => onChange({ ...value, [key]: event.target.value })} /></label>
  ))}</div>;
}
