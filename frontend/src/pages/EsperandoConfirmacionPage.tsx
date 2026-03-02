/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect } from "react";
import { useLocation, useSearchParams } from "react-router-dom";
import "../styles/auth.css";

export default function EsperandoConfirmacionPage() {
  const location = useLocation();
  const [searchParams] = useSearchParams();

  // 🔹 Email puede venir del estado (login normal) o de la query (?email=...&oauth=1)
  const emailFromState = (location.state as any)?.email;
  const emailFromQuery = searchParams.get("email");
  const email = emailFromState || emailFromQuery || "tu correo";

  useEffect(() => {
    const checkAccessConfirmed = () => {
      const user = localStorage.getItem("user");
      const token = localStorage.getItem("token");

      // Si ya se confirmó el acceso en otra pestaña, cerrar esta
      if (user && token) {
        alert("✅ Acceso confirmado. Ya puedes cerrar esta pestaña.");
        window.close();
      }
    };

    // Verifica cada 2 segundos si el usuario ya fue autenticado
    const interval = setInterval(checkAccessConfirmed, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="auth-layout">
      <main
        className="auth-main"
        style={{ textAlign: "center", padding: "3rem" }}
      >
        <h2>Esperando confirmación de acceso</h2>
        <p>
          Se ha enviado un correo a <strong>{email}</strong> con el enlace de
          confirmación.
        </p>
        <p>
          Por favor, revisa tu bandeja de entrada y haz clic en “Sí, soy yo”.
        </p>

        <div className="loading-spinner" style={{ marginTop: "2rem" }}>
          <div className="spinner" />
        </div>

        <p
          style={{
            marginTop: "2rem",
            fontSize: "1.1rem",
            color: "#333",
          }}
        >
          Puedes cerrar esta pestaña una vez terminado el inicio de sesión.
        </p>
      </main>
    </div>
  );
}
