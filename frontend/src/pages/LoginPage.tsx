/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";     // ✅ para axios.isAxiosError
import { API } from "../api/api"; // ✅ tu instancia

import { useAuth } from "../context/AuthContext";
import "../styles/auth.css";
import GoogleLogo from "../assets/google-logo.svg";

interface LoginLock {
  email: string;
  lockedUntil: number;
}

const LOGIN_LOCK_KEY = "loginLock";

type AppRol = "cliente" | "entrenador" | "administrador";

function normalizeRole(raw: unknown): AppRol {
  const r = String(raw ?? "").toLowerCase();

  // Backends suelen mandar "admin"
  if (r === "admin" || r === "administrador") return "administrador";
  if (r === "entrenador" || r === "trainer") return "entrenador";
  return "cliente";
}

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [errorMessage, setErrorMessage] = useState("");
  const [loading, setLoading] = useState(false);

  // 🔒 bloqueo
  const [lockSeconds, setLockSeconds] = useState<number | null>(null);
  const [lockedEmail, setLockedEmail] = useState<string | null>(null);

  const navigate = useNavigate();
  const { setUser } = useAuth();

  const isLocked =
    lockSeconds !== null && lockSeconds > 0 && lockedEmail === email;

  // 🔄 cargar bloqueo desde localStorage
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

  // ⏱️ contador
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

  // 🚀 LOGIN
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");

    if (isLocked) {
      setErrorMessage(`Cuenta bloqueada. Espera ${lockSeconds ?? 0} segundos.`);
      return;
    }

    setLoading(true);

    try {
      const res = await API.post("/auth/login", { email, password });

      // 🔐 2FA
      if (res.data?.twoFactorRequired) {
        const method = String(res.data?.method ?? "").toLowerCase();

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

      // 🟢 login normal
      const accessToken = res.data?.accessToken;
      const user = res.data?.user;

      if (!accessToken || !user) {
        setErrorMessage("Respuesta inválida del servidor.");
        return;
      }

      const role: AppRol = normalizeRole(user.role ?? user.rol);

      // ✅ userData ya coincide con tu AuthContext.User
      const userData = {
        id: user.id != null ? String(user.id) : undefined,
        email: String(user.email ?? email),
        rol: role,
        loginMethod: "local" as const, // ✅ "local" | "google" soportado
      };

      localStorage.setItem("token", String(accessToken));
      localStorage.setItem("user", JSON.stringify(userData));
      localStorage.removeItem(LOGIN_LOCK_KEY);

      setUser(userData);

      // 🎯 redirección por rol
      if (role === "administrador") {
        navigate("/admin");
      } else if (role === "entrenador") {
        navigate("/entrenador");
      } else {
        navigate("/cliente");
      }
    } catch (err: any) {
      if (axios.isAxiosError(err)) {
        const status = err.response?.status;

        if (status === 429) {
          const seconds = err.response?.data?.retryAfterSeconds ?? 60;

          const lock: LoginLock = {
            email,
            lockedUntil: Date.now() + Number(seconds) * 1000,
          };

          localStorage.setItem(LOGIN_LOCK_KEY, JSON.stringify(lock));

          setLockedEmail(email);
          setLockSeconds(Number(seconds));

          setErrorMessage(`Demasiados intentos. Espera ${seconds} segundos.`);
        } else if (status === 400 || status === 401) {
          setErrorMessage("Correo o contraseña incorrectos.");
        } else {
          setErrorMessage("Error al iniciar sesión.");
        }
      } else {
        setErrorMessage("Error inesperado.");
      }
    } finally {
      setLoading(false);
    }
  };

  // 🔵 Google
  const handleGoogleLogin = () => {
    const baseUrl = import.meta.env.VITE_API_URL;

    // ✅ esto NO rompe loginMethod: "google"
    // porque el backend (en el callback) debe guardar localStorage
    // o redirigir con token. Tu front aquí solo inicia OAuth.
    window.location.href = `${baseUrl}/auth/google`;
  };

  return (
    <div className="auth-layout">
      <main className="auth-main">
        <div className="auth-page">
          {/* Imagen */}
          <div className="auth-image-section">
            <div className="auth-image-overlay" />
          </div>

          {/* Formulario */}
          <div className="auth-form-section">
            <div className="auth-form-container">
              <h1 className="auth-title">Iniciar Sesión</h1>

              <form className="auth-form" onSubmit={handleLogin}>
                {errorMessage && (
                  <div className="auth-error">
                    {errorMessage}
                    {isLocked && <div>Tiempo restante: {lockSeconds}s</div>}
                  </div>
                )}

                {/* Email */}
                <div className="auth-input-group">
                  <label className="auth-label">Correo</label>
                  <input
                    type="email"
                    className="auth-input"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>

                {/* Password */}
                <div className="auth-input-group">
                  <label className="auth-label">Contraseña</label>
                  <div className="auth-input-wrap">
                    <input
                      type={showPassword ? "text" : "password"}
                      className="auth-input"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      disabled={isLocked}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                    >
                      {showPassword ? "🙈" : "👁️"}
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
                    : "Iniciar Sesión"}
                </button>

                {/* Google */}
                <button
                  type="button"
                  className="auth-btn-google"
                  onClick={handleGoogleLogin}
                >
                  <img src={GoogleLogo} alt="Google" />
                  Continuar con Google
                </button>

                <p className="auth-footer">
                  ¿No tienes cuenta? <Link to="/register">Regístrate</Link>
                </p>
              </form>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
