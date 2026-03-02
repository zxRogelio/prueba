/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from "react";
import QRCode from "qrcode";
import { API } from "../api/api";
import "../styles/configuracion.css";

interface StoredUser {
  id?: string;
  email?: string;
  rol?: string;
  loginMethod?: "local" | "google";
}

export default function Configuracion2FA() {
  const [selectedMethod, setSelectedMethod] = useState("normal");
  const [qr, setQR] = useState<string | null>(null);
  const [isGoogleSession, setIsGoogleSession] = useState(false);
  const [loading, setLoading] = useState(false);

  // 🔹 Traer método actual desde el backend
  const fetchCurrentMethod = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      const res = await API.get("/user/profile", {
        headers: { Authorization: `Bearer ${token}` },
      });

      console.log("🔍 Perfil recibido en Configuracion2FA:", res.data);

      if (res.data?.authMethod) {
        setSelectedMethod(res.data.authMethod);
      }
    } catch (err: any) {
      console.error(" Error al obtener método actual:", err);
    }
  };

  // Al montar: revisamos si la sesión es Google o local
  useEffect(() => {
    const raw = localStorage.getItem("user");

    if (raw) {
      try {
        const u: StoredUser = JSON.parse(raw);

        if (u.loginMethod === "google") {
          setIsGoogleSession(true);
          return; // no consultamos perfil
        }
      } catch (err) {
        console.error("Error leyendo user de localStorage:", err);
      }
    }

    // Solo si NO es sesión Google consultamos al backend
    fetchCurrentMethod();
  }, []);

  const handleUpdateMethod = async () => {
    if (isGoogleSession) {
      alert(
        "No puedes cambiar el método de verificación porque iniciaste sesión con Google.\n\n" +
          "Cierra sesión e inicia con tu correo y contraseña para modificar esta configuración."
      );
      return;
    }

    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      if (!token) {
        alert("No se encontró la sesión. Inicia sesión de nuevo.");
        return;
      }

      // 1) Actualizar método en el backend
      await API.patch(
        "/user/update-auth-method",
        { authMethod: selectedMethod },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // 2) Si es TOTP, generar QR
      if (selectedMethod === "totp") {
        const res = await API.post(
          "/auth/generate-totp",
          {},
          { headers: { Authorization: `Bearer ${token}` } }
        );

        const qrImage = await QRCode.toDataURL(res.data.otpauth_url);
        setQR(qrImage);
      } else {
        setQR(null);
      }

      alert("Método actualizado correctamente");
    } catch (err: any) {
      console.error(err);
      alert(
        err.response?.data?.error ||
          "Error al actualizar método de autenticación"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="config-container">
      <h2>Configurar Verificación en Dos Pasos</h2>

      {isGoogleSession && (
        <p className="config-warning">
          ⚠️ Has iniciado sesión con <strong>Google</strong>. Para cambiar tu
          método de verificación, cierra sesión e inicia con tu{" "}
          <strong>correo y contraseña</strong>.
        </p>
      )}

      <div className="config-options">
        <label>
          <select
            value={selectedMethod}
            onChange={(e) => setSelectedMethod(e.target.value)}
            disabled={isGoogleSession || loading}
          >
            <option value="normal">🔓 Solo contraseña</option>
            <option value="otp">📩 Código por correo</option>
            <option value="confirm-link">🔐 ¿Eres tú? por link</option>
            <option value="totp">📱 TOTP con QR</option>
          </select>
        </label>
      </div>

      <button
        className="btn-disable"
        onClick={handleUpdateMethod}
        disabled={isGoogleSession || loading}
      >
        {isGoogleSession
          ? "Bloqueado (sesión con Google)"
          : loading
          ? "Guardando..."
          : "Guardar método"}
      </button>

      {selectedMethod === "totp" && qr && (
        <div className="qr-container">
          <p>Escanea este código QR en Google Authenticator:</p>
          <img src={qr} alt="QR Code" />
        </div>
      )}
    </div>
  );
}
