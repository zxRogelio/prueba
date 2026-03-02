/* eslint-disable @typescript-eslint/no-explicit-any */
// src/pages/VerificarOTP.tsx
import { useState, useEffect } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { API } from "../api/api";
import { useAuth } from "../context/AuthContext";

export default function VerificarOTP() {
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);

  // 🔁 Estados para reenviar código
  const [resendLoading, setResendLoading] = useState(false);
  const [cooldown, setCooldown] = useState(30); // segundos
  const [canResend, setCanResend] = useState(false);

  const location = useLocation();
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const [searchParams] = useSearchParams();

  // 🟣 Email puede venir del state (login normal) o de la query (?email=...&oauth=1)
  const emailFromState = (location.state as any)?.email;
  const emailFromQuery = searchParams.get("email");
  const email = emailFromState || emailFromQuery || "";

  // ⏱️ Manejo del temporizador de 30s
  useEffect(() => {
    // al montar, empezamos el cooldown en 30s
    setCooldown(30);
    setCanResend(false);

    const interval = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setCanResend(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (!email) {
      alert("No se detectó el correo del usuario. Intenta iniciar sesión de nuevo.");
      setLoading(false);
      navigate("/login");
      return;
    }

    try {
      const res = await API.post("/auth/verify-otp", { email, otp });

      const { accessToken, user } = res.data;
      localStorage.setItem("token", accessToken);
      localStorage.setItem("user", JSON.stringify(user));
      setUser(user);

      switch (user.rol) {
        case "cliente":
          navigate("/cliente");
          break;
        case "entrenador":
          navigate("/entrenador");
          break;
        case "admin":
        case "administrador":
          navigate("/admin");
          break;
        default:
          navigate("/");
      }
    } catch (err) {
      console.error("❌ Error verificando OTP:", err);
      alert("Código incorrecto o expirado.");
    } finally {
      setLoading(false);
    }
  };

  // 🔁 Reenviar código OTP (login)
  const handleResendOTP = async () => {
    if (!email) {
      alert("No se detectó el correo del usuario. Intenta iniciar sesión de nuevo.");
      navigate("/login");
      return;
    }

    if (!canResend) return;

    try {
      setResendLoading(true);
      setCanResend(false);
      setCooldown(30);

      // 🔴 IMPORTANTE: este endpoint lo definimos en el backend (abajo)
      await API.post("/auth/resend-login-otp", { email });

      alert(`Se ha enviado un nuevo código a: ${email}`);

      // Reinicia el temporizador
      const interval = setInterval(() => {
        setCooldown((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            setCanResend(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (err) {
      console.error("❌ Error reenviando OTP:", err);
      alert("No se pudo reenviar el código. Inténtalo de nuevo más tarde.");
      setCanResend(true);
      setCooldown(0);
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(to bottom, white, #FFF9E6)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        padding: "20px",
      }}
    >
      <div
        style={{
          background: "white",
          padding: "40px 30px",
          borderRadius: "15px",
          boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
          width: "100%",
          maxWidth: "400px",
        }}
      >
        <h2
          style={{
            textAlign: "center",
            marginBottom: "10px",
            fontSize: "22px",
            color: "#333",
          }}
        >
          Verificación por Código (OTP)
        </h2>

        {email && (
          <p
            style={{
              textAlign: "center",
              marginBottom: "10px",
              fontSize: "14px",
              color: "#555",
            }}
          >
            Se envió un código a: <strong>{email}</strong>
          </p>
        )}

        <form
          onSubmit={handleSubmit}
          style={{ display: "flex", flexDirection: "column" }}
        >
          <label
            style={{ marginBottom: "8px", fontSize: "15px", color: "#333" }}
          >
            Ingresa el código que recibiste por correo:
          </label>
          <input
            type="text"
            maxLength={6}
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            required
            style={{
              padding: "10px",
              fontSize: "16px",
              marginBottom: "20px",
              borderRadius: "8px",
              border: "1px solid #ccc",
              outline: "none",
              textAlign: "center",
              letterSpacing: "3px",
            }}
          />

          <button
            type="submit"
            disabled={loading}
            style={{
              backgroundColor: "#EC5DBB",
              color: "white",
              padding: "12px",
              border: "none",
              borderRadius: "8px",
              fontSize: "16px",
              cursor: "pointer",
              transition: "background 0.3s",
              marginBottom: "15px",
            }}
          >
            {loading ? "Verificando..." : "Verificar"}
          </button>
        </form>

        {/* 🔁 Sección de reenvío */}
        <div style={{ textAlign: "center", marginTop: "10px" }}>
          <button
            type="button"
            onClick={handleResendOTP}
            disabled={!canResend || resendLoading}
            style={{
              backgroundColor: canResend ? "#ffffff" : "#f3f3f3",
              color: "#EC5DBB",
              border: "1px solid #EC5DBB",
              padding: "8px 12px",
              borderRadius: "8px",
              fontSize: "14px",
              cursor: canResend && !resendLoading ? "pointer" : "not-allowed",
              opacity: canResend && !resendLoading ? 1 : 0.6,
            }}
          >
            {resendLoading
              ? "Reenviando..."
              : canResend
              ? "Reenviar código"
              : `Reenviar en ${cooldown}s`}
          </button>

          <p
            style={{
              marginTop: "8px",
              fontSize: "12px",
              color: "#777",
            }}
          >
            Solo puedes solicitar un nuevo código cada 30 segundos.
          </p>
        </div>
      </div>
    </div>
  );
}
