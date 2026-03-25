/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from "react";
import {
  FaCheckCircle,
  FaEnvelope,
  FaLock,
  FaMobileAlt,
  FaQrcode,
  FaShieldAlt,
} from "react-icons/fa";
import QRCode from "qrcode";
import { API } from "../api/api";
import styles from "./ClientSecurityPage.module.css";

interface StoredUser {
  id?: string;
  email?: string;
  rol?: string;
  loginMethod?: "local" | "google";
}

const methodOptions = [
  {
    value: "normal",
    label: "Solo contrasena",
    description: "Acceso directo con correo y contrasena.",
    icon: FaLock,
  },
  {
    value: "otp",
    label: "Codigo por correo",
    description: "Recibe un codigo temporal cada vez que inicies sesion.",
    icon: FaEnvelope,
  },
  {
    value: "confirm-link",
    label: "Confirmacion por enlace",
    description: "Aprueba el acceso desde un enlace enviado al correo.",
    icon: FaShieldAlt,
  },
  {
    value: "totp",
    label: "Aplicacion autenticadora",
    description: "Genera codigos desde Google Authenticator u otra app.",
    icon: FaMobileAlt,
  },
];

export default function Configuracion2FA() {
  const [selectedMethod, setSelectedMethod] = useState("normal");
  const [qr, setQR] = useState<string | null>(null);
  const [isGoogleSession, setIsGoogleSession] = useState(false);
  const [loading, setLoading] = useState(false);

  const fetchCurrentMethod = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      const response = await API.get("/user/profile", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.data?.authMethod) {
        setSelectedMethod(response.data.authMethod);
      }
    } catch (error: any) {
      console.error("Error al obtener metodo actual:", error);
    }
  };

  useEffect(() => {
    const rawUser = localStorage.getItem("user");

    if (rawUser) {
      try {
        const user: StoredUser = JSON.parse(rawUser);

        if (user.loginMethod === "google") {
          setIsGoogleSession(true);
          return;
        }
      } catch (error) {
        console.error("Error leyendo user de localStorage:", error);
      }
    }

    fetchCurrentMethod();
  }, []);

  const handleUpdateMethod = async () => {
    if (isGoogleSession) {
      alert(
        "No puedes cambiar el metodo de verificacion porque iniciaste sesion con Google.\n\n" +
          "Cierra sesion e inicia con tu correo y contrasena para modificar esta configuracion."
      );
      return;
    }

    try {
      setLoading(true);
      const token = localStorage.getItem("token");

      if (!token) {
        alert("No se encontro la sesion. Inicia sesion de nuevo.");
        return;
      }

      await API.patch(
        "/user/update-auth-method",
        { authMethod: selectedMethod },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (selectedMethod === "totp") {
        const response = await API.post(
          "/auth/generate-totp",
          {},
          { headers: { Authorization: `Bearer ${token}` } }
        );

        const qrImage = await QRCode.toDataURL(response.data.otpauth_url);
        setQR(qrImage);
      } else {
        setQR(null);
      }

      alert("Metodo actualizado correctamente");
    } catch (error: any) {
      console.error(error);
      alert(
        error.response?.data?.error ||
          "Error al actualizar metodo de autenticacion"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className={styles.page}>
      <div className={styles.hero}>
        <div className={styles.heroCopy}>
          <span className={styles.eyebrow}>Seguridad y acceso</span>
          <h2 className={styles.title}>Controla como se protege tu cuenta</h2>
          <p className={styles.subtitle}>
            Elige el metodo de verificacion que mejor se adapte a tu flujo de
            acceso. Si usas Google como inicio de sesion, esta configuracion se
            mantiene bloqueada por seguridad.
          </p>
        </div>

        <div className={styles.heroCard}>
          <span className={styles.heroCardLabel}>Estado actual</span>
          <strong className={styles.heroCardValue}>
            {isGoogleSession ? "Gestionado por Google" : "Editable"}
          </strong>
          <p className={styles.heroCardText}>
            {isGoogleSession
              ? "Tu sesion inicio con Google y por eso no puedes modificar el metodo desde aqui."
              : "Puedes cambiar tu metodo y guardar la configuracion desde este panel."}
          </p>
        </div>
      </div>

      {isGoogleSession && (
        <div className={styles.warning}>
          <FaShieldAlt />
          <div>
            <strong>Sesion con Google detectada</strong>
            <span>
              Cierra sesion e inicia con correo y contrasena si quieres editar
              el metodo de verificacion.
            </span>
          </div>
        </div>
      )}

      <div className={styles.grid}>
        <article className={styles.panel}>
          <div className={styles.panelHeader}>
            <div>
              <h3 className={styles.panelTitle}>Metodo de acceso</h3>
              <p className={styles.panelText}>
                Selecciona una opcion y guarda el cambio cuando estes listo.
              </p>
            </div>
            <span className={styles.badge}>
              <FaCheckCircle />
              Seguridad activa
            </span>
          </div>

          <div className={styles.options}>
            {methodOptions.map((option) => {
              const Icon = option.icon;
              const isActive = selectedMethod === option.value;

              return (
                <button
                  key={option.value}
                  type="button"
                  className={`${styles.option} ${isActive ? styles.optionActive : ""}`}
                  onClick={() => setSelectedMethod(option.value)}
                  disabled={isGoogleSession || loading}
                >
                  <span className={styles.optionIcon}>
                    <Icon />
                  </span>
                  <span className={styles.optionCopy}>
                    <strong>{option.label}</strong>
                    <span>{option.description}</span>
                  </span>
                </button>
              );
            })}
          </div>

          <button
            type="button"
            className={styles.primaryButton}
            onClick={handleUpdateMethod}
            disabled={isGoogleSession || loading}
          >
            {isGoogleSession
              ? "Bloqueado por sesion Google"
              : loading
              ? "Guardando..."
              : "Guardar metodo"}
          </button>
        </article>

        <article className={styles.panel}>
          <div className={styles.panelHeader}>
            <div>
              <h3 className={styles.panelTitle}>Resumen del metodo</h3>
              <p className={styles.panelText}>
                Asi funcionara tu acceso con la opcion elegida.
              </p>
            </div>
          </div>

          <div className={styles.summaryCard}>
            <span className={styles.summaryLabel}>Seleccion actual</span>
            <strong className={styles.summaryValue}>
              {methodOptions.find((option) => option.value === selectedMethod)?.label}
            </strong>
            <p className={styles.summaryText}>
              {methodOptions.find((option) => option.value === selectedMethod)?.description}
            </p>
          </div>

          {selectedMethod === "totp" && qr ? (
            <div className={styles.qrCard}>
              <div className={styles.qrHeader}>
                <FaQrcode />
                <strong>Escanea este codigo QR</strong>
              </div>
              <p className={styles.qrText}>
                Usa Google Authenticator o cualquier app compatible con TOTP.
              </p>
              <div className={styles.qrFrame}>
                <img src={qr} alt="Codigo QR para TOTP" />
              </div>
            </div>
          ) : (
            <div className={styles.emptyCard}>
              <FaShieldAlt />
              <strong>Sin QR pendiente</strong>
              <span>
                Si eliges la aplicacion autenticadora y guardas, el codigo QR
                aparecera aqui.
              </span>
            </div>
          )}
        </article>
      </div>
    </section>
  );
}
