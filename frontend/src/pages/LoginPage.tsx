/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { API } from "../api/api";
import { useAuth } from "../context/AuthContext";
import {
  buildAuthUser,
  getDefaultAuthenticatedRoute,
} from "../utils/authRouting";
import "../styles/auth.css";
import GoogleLogo from "../assets/google-logo.svg";

interface LoginLock {
  email: string;
  lockedUntil: number;
}

const LOGIN_LOCK_KEY = "loginLock";

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
        const remaining = Math.ceil((lock.lockedUntil - now) / 1000);
        setLockedEmail(lock.email);
        setLockSeconds(remaining);
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
      setLockSeconds((prev) => {
        if (!prev || prev <= 1) {
          localStorage.removeItem(LOGIN_LOCK_KEY);
          return null;
        }

        return prev - 1;
      });
    }, 1000);

    return () => window.clearInterval(interval);
  }, [lockSeconds]);

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setErrorMessage("");

    if (isLocked) {
      setErrorMessage(`Cuenta bloqueada. Espera ${lockSeconds ?? 0} segundos.`);
      return;
    }

    setLoading(true);

    try {
      const response = await API.post("/auth/login", { email, password });

      if (response.data?.twoFactorRequired) {
        const method = String(response.data?.method ?? "").toLowerCase();

        if (method === "totp") {
          navigate("/login-totp", { state: { email } });
          return;
        }

        if (method === "confirm-link") {
          navigate("/esperando-confirmacion", { state: { email } });
          return;
        }

        if (method === "otp") {
          navigate("/verificar-otp", { state: { email } });
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
        },
        email
      );

      localStorage.setItem("token", String(accessToken));
      localStorage.setItem("user", JSON.stringify(userData));
      localStorage.removeItem(LOGIN_LOCK_KEY);

      setUser(userData);
      navigate(getDefaultAuthenticatedRoute(userData.rol));
    } catch (error: any) {
      if (axios.isAxiosError(error)) {
        const status = error.response?.status;

        if (status === 429) {
          const seconds = error.response?.data?.retryAfterSeconds ?? 60;
          const lock: LoginLock = {
            email,
            lockedUntil: Date.now() + Number(seconds) * 1000,
          };

          localStorage.setItem(LOGIN_LOCK_KEY, JSON.stringify(lock));
          setLockedEmail(email);
          setLockSeconds(Number(seconds));
          setErrorMessage(`Demasiados intentos. Espera ${seconds} segundos.`);
        } else if (status === 400 || status === 401) {
          setErrorMessage("Correo o contrasena incorrectos.");
        } else {
          setErrorMessage("Error al iniciar sesion.");
        }
      } else {
        setErrorMessage("Error inesperado.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    const baseUrl = import.meta.env.VITE_API_URL;
    window.location.href = `${baseUrl}/auth/google`;
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

              <form className="auth-form" onSubmit={handleLogin}>
                {errorMessage && (
                  <div className="auth-error">
                    {errorMessage}
                    {isLocked && <div>Tiempo restante: {lockSeconds}s</div>}
                  </div>
                )}

                <div className="auth-input-group">
                  <label className="auth-label">Correo</label>
                  <input
                    type="email"
                    className="auth-input"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    required
                  />
                </div>

                <div className="auth-input-group">
                  <label className="auth-label">Contrasena</label>
                  <div className="auth-input-wrap">
                    <input
                      type={showPassword ? "text" : "password"}
                      className="auth-input"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      required
                      disabled={isLocked}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((value) => !value)}
                    >
                      {showPassword ? "Ocultar" : "Mostrar"}
                    </button>
                  </div>
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
                    : "Iniciar Sesion"}
                </button>

                <button
                  type="button"
                  className="auth-btn-google"
                  onClick={handleGoogleLogin}
                >
                  <img src={GoogleLogo} alt="Google" />
                  Continuar con Google
                </button>

                <p className="auth-footer">
                  No tienes cuenta? <Link to="/register">Registrate</Link>
                </p>
              </form>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
