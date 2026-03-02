/* eslint-disable @typescript-eslint/no-explicit-any */
import { useForm } from "react-hook-form";
import { useLocation, useNavigate } from "react-router-dom";
import { API } from "../api/api";
import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";

export default function NewPassword() {
  const { register, handleSubmit, watch } = useForm();
  const navigate = useNavigate();
  const location = useLocation();

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const email = location.state?.email;
  const otp = location.state?.otp;

  // 🔍 Valores en tiempo real desde react-hook-form
  const passwordValue = watch("password", "");
  const confirmPasswordValue = watch("confirmPassword", "");

  // 🔐 misma política que en RegisterPage
  const passwordRegex =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;

  // Reglas individuales para el checklist
  const lengthOk = passwordValue.length >= 8;
  const hasUpper = /[A-Z]/.test(passwordValue);
  const hasLower = /[a-z]/.test(passwordValue);
  const hasNumber = /\d/.test(passwordValue);
  const hasSymbol = /[\W_]/.test(passwordValue);

  const ruleClass = (ok: boolean) =>
    "password-rule " + (ok ? "password-rule-ok" : "password-rule-bad");

  const onSubmit = async (data: any) => {
    try {
      const { password, confirmPassword } = data;

      // Validar fuerza de la contraseña
      if (!passwordRegex.test(password)) {
        alert(
          "La contraseña debe tener al menos 8 caracteres e incluir una mayúscula, una minúscula, un número y un símbolo."
        );
        return;
      }

      // Validar que coincidan
      if (password !== confirmPassword) {
        alert("Las contraseñas no coinciden");
        return;
      }

      // Validar que haya email y otp (por si alguien entra directo a la URL)
      if (!email || !otp) {
        alert(
          "Faltan datos de recuperación. Vuelve a iniciar el proceso de recuperación de contraseña."
        );
        return;
      }

      await API.post("/auth/reset-password", {
        email,
        otp,
        newPassword: password,
      });

      alert("Contraseña actualizada correctamente");
      navigate("/login");
    } catch (err: any) {
      console.error("Error al cambiar contraseña:", err?.response?.data || err);
      alert(
        err?.response?.data?.error || "Error al cambiar contraseña"
      );
    }
  };

  return (
    <main className="auth-page">
      {/* Sección izquierda con imagen */}
      <section className="auth-image-section">
        <div className="auth-image-overlay">
          <h1 className="auth-image-title">RECUPERA TU CUENTA</h1>
          <p className="auth-image-subtitle">
            Ingresa una nueva contraseña segura y vuelve a entrenar con nosotros.
          </p>
        </div>
      </section>

      {/* Sección derecha con formulario */}
      <section className="auth-form-section">
        <div className="auth-form-container">
          <h2 className="auth-title">Nueva Contraseña</h2>
          <p className="auth-subtitle">
            Introduce una contraseña nueva para acceder a tu cuenta Titanium Sport Gym
          </p>

          <form onSubmit={handleSubmit(onSubmit)} className="auth-form">
            {/* Nueva contraseña */}
            <div className="auth-input-group">
              <label className="auth-label" htmlFor="password">
                Nueva contraseña
              </label>
              <div className="auth-input-wrap">
                <span className="auth-input-icon">
                  <Eye className="auth-icon" />
                </span>
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  className="auth-input"
                  placeholder="********"
                  {...register("password", { required: true })}
                />
                <button
                  type="button"
                  className="auth-eye-btn"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff /> : <Eye />}
                </button>
              </div>

              {/* ✅ Checklist en tiempo real */}
              <ul className="password-rules-list">
                <li className={ruleClass(lengthOk)}>
                  {lengthOk ? "✔" : "•"} Mínimo 8 caracteres
                </li>
                <li className={ruleClass(hasUpper)}>
                  {hasUpper ? "✔" : "•"} Al menos una letra mayúscula
                </li>
                <li className={ruleClass(hasLower)}>
                  {hasLower ? "✔" : "•"} Al menos una letra minúscula
                </li>
                <li className={ruleClass(hasNumber)}>
                  {hasNumber ? "✔" : "•"} Al menos un número
                </li>
                <li className={ruleClass(hasSymbol)}>
                  {hasSymbol ? "✔" : "•"} Al menos un símbolo
                </li>
              </ul>
            </div>

            {/* Confirmar contraseña */}
            <div className="auth-input-group">
              <label className="auth-label" htmlFor="confirmPassword">
                Confirmar contraseña
              </label>
              <div className="auth-input-wrap">
                <span className="auth-input-icon">
                  <Eye className="auth-icon" />
                </span>
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  className="auth-input"
                  placeholder="********"
                  {...register("confirmPassword", { required: true })}
                />
                <button
                  type="button"
                  className="auth-eye-btn"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? <EyeOff /> : <Eye />}
                </button>
              </div>

              {/* Mensaje de coincidencia */}
              {confirmPasswordValue.length > 0 && (
                <p
                  className={
                    passwordValue === confirmPasswordValue
                      ? "password-match-ok"
                      : "password-match-bad"
                  }
                >
                  {passwordValue === confirmPasswordValue
                    ? "✅ Las contraseñas coinciden"
                    : "⚠️ Las contraseñas aún no coinciden"}
                </p>
              )}
            </div>

            <button type="submit" className="auth-btn-primary">
              Cambiar Contraseña
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}
