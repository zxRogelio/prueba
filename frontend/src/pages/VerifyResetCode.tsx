/* eslint-disable @typescript-eslint/no-explicit-any */
import { useForm } from "react-hook-form";
import { useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { API } from "../api/api";

export default function VerifyResetCodePage() {
  const { register, handleSubmit } = useForm();
  const navigate = useNavigate();
  const location = useLocation();
  const email = location.state?.email as string | undefined;

  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(0); // segundos restantes

  // 🔹 Si no hay email, regresamos al inicio del flujo
  useEffect(() => {
    if (!email) {
      alert("Faltan datos de recuperación. Vuelve a iniciar el proceso.");
      navigate("/forgot-password", { replace: true });
    }
  }, [email, navigate]);

  // ⏱️ Manejo del contador regresivo para reenvío
  useEffect(() => {
    if (cooldown <= 0) return;

    const interval = setInterval(() => {
      setCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(interval);
  }, [cooldown]);

  const onSubmit = async (data: any) => {
    if (!email) return;

    try {
      await API.post("/auth/verify-reset-otp", {
        email,
        otp: data.otp,
      });

      navigate("/new-password", { state: { email, otp: data.otp } });
    } catch (err: any) {
      console.error("Error al verificar OTP:", err?.response?.data || err);
      alert("Código inválido o expirado");
    }
  };

  const handleResend = async () => {
    if (!email) return;

    // si está en cooldown, no hacemos nada (el botón ya estará deshabilitado)
    if (cooldown > 0) return;

    try {
      setResending(true);

      // reutilizamos el endpoint de forgot-password
      const res = await API.post("/auth/forgot-password", { email });

      const message =
        res.data?.message ||
        "Si el correo está registrado, se ha enviado un nuevo código de recuperación";

      alert(message);

      // ⏱️ arrancamos cooldown de 30 segundos
      setCooldown(30);
    } catch (err: any) {
      console.error("Error al reenviar código:", err?.response?.data || err);
      alert("No se pudo reenviar el código. Intenta de nuevo en unos momentos.");
    } finally {
      setResending(false);
    }
  };

  return (
    <main className="auth-page">
      <section className="auth-image-section">
        <div className="auth-image-overlay">
          <h1 className="auth-image-title">VERIFICACIÓN</h1>
          <p className="auth-image-subtitle">
            Escribe el código de 6 dígitos que enviamos a tu correo
          </p>
        </div>
      </section>

      <section className="auth-form-section">
        <div className="auth-form-container">
          <h2 className="auth-title">Código de Verificación</h2>
          <p className="auth-subtitle">
            Verifica tu identidad para continuar con el cambio de contraseña
          </p>

          {email && (
            <p
              style={{
                textAlign: "center",
                marginBottom: "10px",
                fontSize: "14px",
                color: "#555",
              }}
            >
              Código enviado a: <strong>{email}</strong>
            </p>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="auth-form">
            <div className="auth-input-group">
              <label className="auth-label" htmlFor="otp">
                Código de 6 dígitos
              </label>
              <input
                type="text"
                className="auth-input"
                placeholder="123456"
                maxLength={6}
                {...register("otp", { required: true })}
              />
            </div>

            <button type="submit" className="auth-btn-primary">
              Verificar código
            </button>
          </form>

          {/* 🔁 Reenviar código con cooldown */}
          <div style={{ marginTop: "16px", textAlign: "center" }}>
            <button
              type="button"
              onClick={handleResend}
              disabled={resending || cooldown > 0}
              style={{
                backgroundColor:
                  resending || cooldown > 0 ? "#ccc" : "#EC5DBB",
                color: "white",
                padding: "8px 16px",
                border: "none",
                borderRadius: "8px",
                fontSize: "14px",
                cursor:
                  resending || cooldown > 0 ? "not-allowed" : "pointer",
                transition: "background 0.3s",
              }}
            >
              {cooldown > 0
                ? `Reenviar código (${cooldown}s)`
                : resending
                ? "Reenviando..."
                : "Reenviar código"}
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}
