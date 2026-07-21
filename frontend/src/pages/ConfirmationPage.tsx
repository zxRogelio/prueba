import { Link, useLocation } from "react-router-dom";
import "./../styles/payment.css";

type ConfirmationLocationState = {
  orderId?: string;
};

export default function ConfirmationPage() {
  const location = useLocation();
  const state = location.state as ConfirmationLocationState | null;
  const orderId = state?.orderId || "";
  const resultPath = orderId
    ? `/pago/resultado?orderId=${orderId}`
    : "/pago/resultado";

  return (
    <div className="page-container">
      <div className="bg-animation">
        <div className="bg-grid" />
        <div className="bg-glow bg-glow-1" />
        <div className="bg-glow bg-glow-2" />
      </div>

      <section className="payment-hero">
        <div className="payment-hero-content">
          <h1 className="payment-title brush-text">CONFIRMACION</h1>
          <p className="payment-subtitle">
            La confirmacion real del pago se consulta desde el backend.
          </p>
        </div>
      </section>

      <div className="payment-container">
        <div className="payment-form-card">
          <h3 className="summary-title">ESTADO VERIFICADO</h3>
          <div className="membership-summary">
            <p className="summary-feature">
              Para compras en linea, revisa el resultado de la orden procesado
              por Mercado Pago.
            </p>
          </div>

          <div className="form-actions">
            <Link to={resultPath} className="btn-primary">
              VER RESULTADO
            </Link>
            <Link to="/cliente/pagos" className="btn-secondary">
              MIS PAGOS
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
