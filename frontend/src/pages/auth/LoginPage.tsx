import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import {
  FaClock,
  FaExclamationCircle,
  FaGoogle,
  FaEnvelope,
  FaLock,
} from "react-icons/fa";
import { API } from "../../api/api";
import { useAuth } from "../../context/AuthContext";
import {
  buildAuthUser,
  getDefaultAuthenticatedRoute,
} from "../../utils/authRouting";
import "../../styles/auth.css";
import AuthInputField from "./AuthInputField";

interface LoginLock {
  email: string;
  lockedUntil: number;
}

const LOGIN_LOCK_KEY = "loginLock";

function getLoginErrorMessage(error: unknown) {
  if (!axios.isAxiosError(error)) {
    return "Error inesperado.";
  }

  const status = error.response?.status;

  if (status === 400 || status === 401) {
    return "Correo o contrasena incorrectos.";
  }

  return "Error al iniciar sesion.";
}

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [lockSeconds, setLockSeconds] = useState<number | null>(null);
  const [lockedEmail, setLockedEmail] = useState<string | null>(null);

  const navigate = useNavigate();
  const { setUser } = useAuth();
  const isLocked =
    lockSeconds !== null && lockSeconds > 0 && lockedEmail === email;

  useEffect(() => {
    const raw = localStorage.getItem(LOGIN_LOCK_KEY);
    if (!raw) return;

    try {
      const lock: LoginLock = JSON.parse(raw);
      const now = Date.now();

      if (lock.lockedUntil > now) {
        setLockedEmail(lock.email);
        setLockSeconds(Math.ceil((lock.lockedUntil - now) / 1000));
      } else {
        localStorage.removeItem(LOGIN_LOCK_KEY);
      }
    } catch {
      localStorage.removeItem(LOGIN_LOCK_KEY);
    }
  }, []);

  useEffect(() => {
    if (!lockSeconds || lockSeconds <= 0) return;

    const interval = window.setInterval(() => {
      setLockSeconds((previous) => {
        if (!previous || previous <= 1) {
          localStorage.removeItem(LOGIN_LOCK_KEY);
          return null;
        }

        return previous - 1;
      });
    }, 1000);

    return () => window.clearInterval(interval);
  }, [lockSeconds]);

  const handleGoogleLogin = () => {
    const baseUrl = import.meta.env.VITE_API_URL;
    window.location.href = `${baseUrl}/auth/google`;
  };

  const handleLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage("");

    if (isLocked) {
      setErrorMessage(`Cuenta bloqueada. Espera ${lockSeconds ?? 0} segundos.`);
      return;
    }

    setLoading(true);

    try {
      const normalizedEmail = email.trim().toLowerCase();
      const response = await API.post("/auth/login", {
        email: normalizedEmail,
        password,
      });

      if (response.data?.twoFactorRequired) {
        const method = String(response.data?.method ?? "").toLowerCase();

        if (method === "totp") {
          navigate("/login-totp", { state: { email: normalizedEmail } });
          return;
        }

        if (method === "confirm-link") {
          navigate("/esperando-confirmacion", { state: { email: normalizedEmail } });
          return;
        }

        if (method === "otp") {
          navigate("/verificar-otp", { state: { email: normalizedEmail } });
          return;
        }
      }

      const accessToken = response.data?.accessToken;
      const user = response.data?.user;

      if (!accessToken || !user) {
        setErrorMessage("Respuesta invalida del servidor.");
        return;
      }

      const userData = buildAuthUser(
        {
          id: user.id,
          email: user.email,
          role: user.role ?? user.rol,
          loginMethod: "local",
          mustChangePassword: user.mustChangePassword,
        },
        normalizedEmail,
      );

      localStorage.setItem("token", String(accessToken));
      localStorage.setItem("user", JSON.stringify(userData));
      localStorage.removeItem(LOGIN_LOCK_KEY);

      setUser(userData);

      if (userData.mustChangePassword) {
        navigate("/primer-acceso", { replace: true });
        return;
      }

      navigate(getDefaultAuthenticatedRoute(userData.rol), {
        state: { showLoginSuccess: true },
      });
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 429) {
        const seconds = error.response?.data?.retryAfterSeconds ?? 60;
        const lock: LoginLock = {
          email,
          lockedUntil: Date.now() + Number(seconds) * 1000,
        };

        localStorage.setItem(LOGIN_LOCK_KEY, JSON.stringify(lock));
        setLockedEmail(email);
        setLockSeconds(Number(seconds));
        setErrorMessage(`Demasiados intentos. Espera ${seconds} segundos.`);
      } else {
        setErrorMessage(getLoginErrorMessage(error));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-layout">
      <main className="auth-main">
        <div className="auth-page">
          <div className="auth-image-section">
            <div className="auth-image-overlay" />
          </div>

          <div className="auth-form-section">
            <div className="auth-form-container">
              <h1 className="auth-title">Iniciar Sesion</h1>
              <p className="auth-subtitle">
                Inicia sesion para poder disfrutar a nuestros servicios y
                productos exclusivos.
              </p>

              <form className="auth-form" onSubmit={handleLogin}>
                {errorMessage && (
                  <div className="auth-error">
                    <FaExclamationCircle />
                    <div>
                      <div>{errorMessage}</div>
                      {isLocked && <div>Tiempo restante: {lockSeconds}s</div>}
                    </div>
                  </div>
                )}

                {isLocked && (
                  <div className="auth-error">
                    <FaClock />
                    <div>
                      El acceso de este correo esta temporalmente bloqueado.
                    </div>
                  </div>
                )}

                <AuthInputField
                  id="login-email"
                  label="Correo Electronico"
                  type="email"
                  icon={FaEnvelope}
                  placeholder="cliente@titanium.com"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                />

                <AuthInputField
                  id="login-password"
                  label="Contrasena"
                  type="password"
                  icon={FaLock}
                  placeholder="Ingresa tu contrasena"
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  disabled={isLocked}
                  isPasswordToggle
                  revealed={showPassword}
                  onToggleReveal={() => setShowPassword((value) => !value)}
                />

                <div className="auth-row">
                  <Link to="/forgot-password" className="auth-link">
                    Recuperar Contraseña
                  </Link>
                </div>

                <button
                  type="submit"
                  className="auth-btn-primary"
                  disabled={loading || isLocked}
                >
                  {loading
                    ? "Iniciando..."
                    : isLocked
                      ? "Bloqueado"
                      : "Entrar a mi cuenta"}
                </button>

                <button
                  type="button"
                  className="auth-btn-google"
                  onClick={handleGoogleLogin}
                >
                  <FaGoogle className="auth-icon" />
                  Continuar con Google
                </button>

                <p className="auth-footer">
                  No tienes cuenta?{" "}
                  <Link to="/register" className="auth-link-strong">
                    Registrate aqui
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
