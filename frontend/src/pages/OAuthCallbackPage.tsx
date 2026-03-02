// src/pages/OAuthCallbackPage.tsx
import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

type AppRol = "cliente" | "entrenador" | "administrador";

function normalizeRole(raw: unknown): AppRol {
  const r = String(raw ?? "").toLowerCase();

  if (r === "admin" || r === "administrador") return "administrador";
  if (r === "entrenador" || r === "trainer") return "entrenador";
  return "cliente";
}

export default function OAuthCallbackPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { setUser } = useAuth();

  useEffect(() => {
    const token = searchParams.get("token");
    const email = searchParams.get("email");
    const roleParam = searchParams.get("role");

    if (!token || !email) {
      navigate("/login", { replace: true });
      return;
    }

    const rol: AppRol = normalizeRole(roleParam);

    const userData = {
      email,
      rol,
      loginMethod: "google" as const, // ✅ soportado
    };

    try {
      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(userData));
      setUser(userData);

      // ✅ redirección por rol normalizado
      if (rol === "administrador") {
        navigate("/admin", { replace: true });
      } else if (rol === "entrenador") {
        navigate("/entrenador", { replace: true });
      } else {
        navigate("/cliente", { replace: true });
      }
    } catch {
      navigate("/login", { replace: true });
    }
  }, [searchParams, navigate, setUser]);

  return (
    <div className="auth-layout">
      <main className="auth-main">
        <div className="auth-page">
          <div className="auth-form-section">
            <div className="auth-form-container">
              <h1 className="auth-title">Procesando inicio de sesión...</h1>
              <p className="auth-subtitle">
                Estamos validando tu cuenta de Google. Esto tomará solo un momento.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
