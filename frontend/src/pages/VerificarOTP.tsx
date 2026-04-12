/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { API } from "../api/api";
import { useAuth } from "../context/AuthContext";
import {
  buildAuthUser,
  getDefaultAuthenticatedRoute,
} from "../utils/authRouting";

export default function VerificarOTP() {
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [cooldown, setCooldown] = useState(30);
  const [canResend, setCanResend] = useState(false);

  const location = useLocation();
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const [searchParams] = useSearchParams();

  const emailFromState = (location.state as any)?.email;
  const emailFromQuery = searchParams.get("email");
  const email = emailFromState || emailFromQuery || "";

  useEffect(() => {
    setCooldown(30);
    setCanResend(false);

    const interval = window.setInterval(() => {
      setCooldown((previous) => {
        if (previous <= 1) {
          window.clearInterval(interval);
          setCanResend(true);
          return 0;
        }

        return previous - 1;
      });
    }, 1000);

    return () => window.clearInterval(interval);
  }, []);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);

    if (!email) {
      alert("No se detecto el correo del usuario. Intenta iniciar sesion de nuevo.");
      setLoading(false);
      navigate("/login");
      return;
    }

    try {
      const response = await API.post("/auth/verify-otp", { email, otp });
      const { accessToken, user } = response.data;
      const authUser = buildAuthUser(
        {
          id: user?.id,
          email: user?.email,
          role: user?.role ?? user?.rol,
          loginMethod: user?.loginMethod,
          mustChangePassword: user?.mustChangePassword,
        },
        email
      );

      localStorage.setItem("token", accessToken);
      localStorage.setItem("user", JSON.stringify(authUser));
      setUser(authUser);

      if (authUser.mustChangePassword) {
        navigate("/primer-acceso", { replace: true });
        return;
      }

      navigate(getDefaultAuthenticatedRoute(authUser.rol));
    } catch (error) {
      console.error("Error verificando OTP:", error);
      alert("Codigo incorrecto o expirado.");
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (!email) {
      alert("No se detecto el correo del usuario. Intenta iniciar sesion de nuevo.");
      navigate("/login");
      return;
    }

    if (!canResend) return;

    try {
      setResendLoading(true);
      setCanResend(false);
      setCooldown(30);

      await API.post("/auth/resend-login-otp", { email });
      alert(`Se ha enviado un nuevo codigo a: ${email}`);

      const interval = window.setInterval(() => {
        setCooldown((previous) => {
          if (previous <= 1) {
            window.clearInterval(interval);
            setCanResend(true);
            return 0;
          }

          return previous - 1;
        });
      }, 1000);
    } catch (error) {
      console.error("Error reenviando OTP:", error);
      alert("No se pudo reenviar el codigo. Intentalo de nuevo mas tarde.");
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
          Verificacion por Codigo (OTP)
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
            Se envio un codigo a: <strong>{email}</strong>
          </p>
        )}

        <form
          onSubmit={handleSubmit}
          style={{ display: "flex", flexDirection: "column" }}
        >
          <label
            style={{ marginBottom: "8px", fontSize: "15px", color: "#333" }}
          >
            Ingresa el codigo que recibiste por correo:
          </label>
          <input
            type="text"
            maxLength={6}
            value={otp}
            onChange={(event) => setOtp(event.target.value)}
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
              ? "Reenviar codigo"
              : `Reenviar en ${cooldown}s`}
          </button>

          <p
            style={{
              marginTop: "8px",
              fontSize: "12px",
              color: "#777",
            }}
          >
            Solo puedes solicitar un nuevo codigo cada 30 segundos.
          </p>
        </div>
      </div>
    </div>
  );
}
