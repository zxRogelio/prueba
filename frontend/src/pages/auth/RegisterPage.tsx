import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import {
  FaCheckCircle,
  FaEnvelope,
  FaExclamationCircle,
  FaLock,
  FaRegCircle,
} from "react-icons/fa";
import { API } from "../../api/api";
import "../../styles/auth.css";
import AuthInputField from "./AuthInputField";
import { useOnline } from "../../hooks/useOnline";
import { OfflineOperationNotice } from "../../components/pwa/OfflineOperationNotice";

type PasswordChecks = {
  length: boolean;
  upper: boolean;
  lower: boolean;
  number: boolean;
  symbol: boolean;
};

const defaultChecks: PasswordChecks = {
  length: false,
  upper: false,
  lower: false,
  number: false,
  symbol: false,
};

function extractRegisterErrorMessage(error: unknown) {
  if (!axios.isAxiosError(error)) {
    return "Error inesperado al registrar";
  }

  const data = error.response?.data;

  if (typeof data === "object" && data !== null) {
    if ("error" in data && typeof data.error === "string") {
      return data.error;
    }

    if ("message" in data && typeof data.message === "string") {
      return data.message;
    }
  }

  return error.message || "Error al registrar";
}

export default function RegisterPage() {
  const online = useOnline();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [passwordChecks, setPasswordChecks] =
    useState<PasswordChecks>(defaultChecks);

  const validateEmail = (value: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

  const passwordRegex =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;

  const handlePasswordChange = (value: string) => {
    setPassword(value);
    setPasswordChecks({
      length: value.length >= 8,
      upper: /[A-Z]/.test(value),
      lower: /[a-z]/.test(value),
      number: /\d/.test(value),
      symbol: /[\W_]/.test(value),
    });
  };

  const requirements = useMemo(
    () => [
      { key: "length", label: "Al menos 8 caracteres", ok: passwordChecks.length },
      { key: "upper", label: "Incluye una letra mayuscula", ok: passwordChecks.upper },
      { key: "lower", label: "Incluye una letra minuscula", ok: passwordChecks.lower },
      { key: "number", label: "Incluye un numero", ok: passwordChecks.number },
      { key: "symbol", label: "Incluye un simbolo", ok: passwordChecks.symbol },
    ],
    [passwordChecks]
  );

  const handleRegister = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!navigator.onLine) return;
    setErrorMessage("");

    if (!validateEmail(email)) {
      setErrorMessage("Correo no valido");
      return;
    }

    if (!passwordRegex.test(password)) {
      setErrorMessage(
        "La contrasena debe tener al menos 8 caracteres e incluir mayuscula, minuscula, numero y simbolo."
      );
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage("Las contrasenas no coinciden");
      return;
    }

    if (!termsAccepted) {
      setErrorMessage("Debes aceptar los terminos y condiciones");
      return;
    }

    try {
      setLoading(true);

      await API.post("/auth/register", {
        email,
        password,
        role: "cliente",
      });

      alert("Registro exitoso. Revisa tu correo para confirmar tu cuenta.");
      navigate("/login");
    } catch (error) {
      console.error("Error al registrar:", error);
      setErrorMessage(extractRegisterErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-layout">
      <main className="auth-main">
        <div className="auth-page">
          <div className="auth-image-section">
            <div className="auth-image-overlay">
              <h1 className="auth-image-title"></h1>
              <p className="auth-image-subtitle"></p>
            </div>
          </div>

          <div className="auth-form-section">
            <div className="auth-form-container">
              <h1 className="auth-title">Crear Cuenta</h1>
              <p className="auth-subtitle">
                Registrate en Titanium Sport Gym y comienza tu transformacion
              </p>

              <OfflineOperationNotice online={online} />
              <form className="auth-form" onSubmit={handleRegister}>
                {errorMessage && (
                  <div className="auth-error">
                    <FaExclamationCircle />
                    <div>{errorMessage}</div>
                  </div>
                )}

                <AuthInputField
                  id="register-email"
                  label="Correo Electronico"
                  type="email"
                  icon={FaEnvelope}
                  placeholder="tu@email.com"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />

                <div className="auth-input-group">
                  <AuthInputField
                    id="register-password"
                    label="Contrasena"
                    type="password"
                    icon={FaLock}
                    placeholder="Crea tu contrasena"
                    autoComplete="new-password"
                    required
                    value={password}
                    onChange={(event) => handlePasswordChange(event.target.value)}
                    isPasswordToggle
                    revealed={showPassword}
                    onToggleReveal={() => setShowPassword((value) => !value)}
                  />

                  <ul className="auth-check-list">
                    {requirements.map((item) => (
                      <li
                        key={item.key}
                        className={`auth-check-item ${
                          item.ok ? "auth-check-item-ok" : "auth-check-item-pending"
                        }`}
                      >
                        {item.ok ? (
                          <FaCheckCircle className="auth-icon" />
                        ) : (
                          <FaRegCircle className="auth-icon" />
                        )}
                        <span>{item.label}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <AuthInputField
                  id="register-confirm-password"
                  label="Confirmar Contrasena"
                  type="password"
                  icon={FaLock}
                  placeholder="Repite tu contrasena"
                  autoComplete="new-password"
                  required
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  isPasswordToggle
                  revealed={showConfirmPassword}
                  onToggleReveal={() =>
                    setShowConfirmPassword((value) => !value)
                  }
                />

                <div className="auth-row">
                  <label className="auth-remember">
                    <input
                      type="checkbox"
                      checked={termsAccepted}
                      onChange={(event) =>
                        setTermsAccepted(event.target.checked)
                      }
                      required
                    />
                    <span>
                      Acepto los{" "}
                      <Link
                        to="/terms"
                        className="auth-link"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        terminos y condiciones
                      </Link>
                    </span>
                  </label>
                </div>

                <button
                  type="submit"
                  className="auth-btn-primary"
                  disabled={loading || !online}
                >
                  {loading ? "Registrando..." : "Crear Cuenta"}
                </button>

                <p className="auth-footer">
                  Ya tienes una cuenta?{" "}
                  <Link to="/login" className="auth-link-strong">
                    Inicia sesion aqui
                  </Link>
                </p>
              </form>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
