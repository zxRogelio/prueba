import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Eye, EyeOff, LockKeyhole } from "lucide-react";
import { API } from "../api/api";
import { useAuth } from "../context/AuthContext";
import { getDefaultAuthenticatedRoute } from "../utils/authRouting";
import styles from "./FirstLoginPasswordPage.module.css";

const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;

export default function FirstLoginPasswordPage() {
  const navigate = useNavigate();
  const { user, setUser } = useAuth();

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const lengthOk = newPassword.length >= 8;
  const hasUpper = /[A-Z]/.test(newPassword);
  const hasLower = /[a-z]/.test(newPassword);
  const hasNumber = /\d/.test(newPassword);
  const hasSymbol = /[\W_]/.test(newPassword);
  const passwordsMatch =
    confirmPassword.length > 0 && newPassword === confirmPassword;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage("");

    if (!passwordRegex.test(newPassword)) {
      setErrorMessage(
        "La contrasena debe tener al menos 8 caracteres, una mayuscula, una minuscula, un numero y un simbolo.",
      );
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage("Las contrasenas no coinciden.");
      return;
    }

    setLoading(true);

    try {
      await API.patch("/user/change-password", { newPassword });

      const nextUser = user
        ? { ...user, mustChangePassword: false }
        : null;

      setUser(nextUser);
      navigate(getDefaultAuthenticatedRoute(nextUser?.rol), {
        replace: true,
        state: { showLoginSuccess: true },
      });
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        setErrorMessage(
          String(
            error.response?.data?.error ||
              "No se pudo actualizar la contrasena.",
          ),
        );
      } else {
        setErrorMessage("No se pudo actualizar la contrasena.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className={styles.page}>
      <section className={styles.panel}>
        <div className={styles.badge}>Primer acceso</div>
        <h1 className={styles.title}>Define tu contrasena personal</h1>
        <p className={styles.subtitle}>
          Tu cuenta fue creada por un administrador. Antes de entrar al portal,
          necesitas reemplazar la clave temporal por una nueva.
        </p>

        {user?.email && (
          <div className={styles.accountBox}>
            <span className={styles.accountLabel}>Cuenta</span>
            <strong>{user.email}</strong>
          </div>
        )}

        <form className={styles.form} onSubmit={handleSubmit}>
          <label className={styles.field}>
            <span>Nueva contrasena</span>
            <div className={styles.inputWrap}>
              <LockKeyhole size={18} />
              <input
                type={showNewPassword ? "text" : "password"}
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                placeholder="Ingresa tu nueva contrasena"
                autoComplete="new-password"
                required
              />
              <button
                type="button"
                onClick={() => setShowNewPassword((value) => !value)}
                aria-label={
                  showNewPassword
                    ? "Ocultar nueva contrasena"
                    : "Mostrar nueva contrasena"
                }
              >
                {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </label>

          <ul className={styles.rules}>
            <li className={lengthOk ? styles.ruleOk : styles.rule}>
              Minimo 8 caracteres
            </li>
            <li className={hasUpper ? styles.ruleOk : styles.rule}>
              Al menos una mayuscula
            </li>
            <li className={hasLower ? styles.ruleOk : styles.rule}>
              Al menos una minuscula
            </li>
            <li className={hasNumber ? styles.ruleOk : styles.rule}>
              Al menos un numero
            </li>
            <li className={hasSymbol ? styles.ruleOk : styles.rule}>
              Al menos un simbolo
            </li>
          </ul>

          <label className={styles.field}>
            <span>Confirmar contrasena</span>
            <div className={styles.inputWrap}>
              <LockKeyhole size={18} />
              <input
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder="Repite la nueva contrasena"
                autoComplete="new-password"
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((value) => !value)}
                aria-label={
                  showConfirmPassword
                    ? "Ocultar confirmacion de contrasena"
                    : "Mostrar confirmacion de contrasena"
                }
              >
                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </label>

          {confirmPassword.length > 0 && (
            <p className={passwordsMatch ? styles.matchOk : styles.matchBad}>
              {passwordsMatch
                ? "Las contrasenas coinciden."
                : "Las contrasenas aun no coinciden."}
            </p>
          )}

          {errorMessage && <p className={styles.error}>{errorMessage}</p>}

          <button type="submit" className={styles.submitButton} disabled={loading}>
            {loading ? "Guardando..." : "Guardar y continuar"}
          </button>
        </form>
      </section>
    </main>
  );
}
