import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  buildAuthUser,
  getDefaultAuthenticatedRoute,
} from "../utils/authRouting";

export default function OAuthCallbackPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { setUser } = useAuth();

  useEffect(() => {
    const token = searchParams.get("token");
    const email = searchParams.get("email");
    const role = searchParams.get("role");

    if (!token || !email) {
      navigate("/login", { replace: true });
      return;
    }

    const userData = buildAuthUser({
      email,
      role,
      loginMethod: "google",
    });

    try {
      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(userData));
      setUser(userData);
      navigate(getDefaultAuthenticatedRoute(userData.rol), { replace: true });
    } catch {
      navigate("/login", { replace: true });
    }
  }, [navigate, searchParams, setUser]);

  return (
    <div className="auth-layout">
      <main className="auth-main">
        <div className="auth-page">
          <div className="auth-form-section">
            <div className="auth-form-container">
              <h1 className="auth-title">Procesando inicio de sesion...</h1>
              <p className="auth-subtitle">
                Estamos validando tu cuenta de Google. Esto tomara solo un
                momento.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
