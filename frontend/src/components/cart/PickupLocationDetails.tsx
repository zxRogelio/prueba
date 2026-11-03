import type { PickupLocation } from "../../services/deliveryService";

export default function PickupLocationDetails({ location }: { location: PickupLocation }) {
  return <div className="delivery-pickup-location"><p><strong>{location.name}</strong><br />{location.address}
    {(location.municipality || location.state) && <><br />{[location.municipality, location.state].filter(Boolean).join(", ")}</>}
    {location.postalCode && <><br />CP {location.postalCode}</>}<br />Tel. {location.phone}</p>
    {location.hours && <p><strong>Horarios de recogida:</strong> {location.hours}</p>}
    {location.instructions && <p><strong>Instrucciones:</strong> {location.instructions}</p>}
  </div>;
}
