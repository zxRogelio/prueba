/* eslint-disable @typescript-eslint/no-explicit-any */
// src/pages/LoginTOTP.tsx
import { useState, useEffect } from "react";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { API } from "../api/api";
import { useAuth } from "../context/AuthContext";

export default function LoginTOTP() {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { setUser } = useAuth();

  // 🔹 Email puede venir del estado (login normal) o de la query (?email=...&oauth=1)
  const emailFromState = (location.state as any)?.email;
  const emailFromQuery = searchParams.get("email");
  const email = emailFromState || emailFromQuery || "";

  // 🔹 Si no tenemos email de ningún lado, regresamos al login
  useEffect(() => {
    if (!email) {
      navigate("/login");
    }
  }, [email, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return; // seguridad extra

    setLoading(true);
    try {
      const res = await API.post("/auth/verify-totp", { email, code });

      const token = res.data.token;
      if (!token) throw new Error("Token no recibido");

      const payload = JSON.parse(atob(token.split(".")[1]));

      const user = {
        id: payload.id,
        rol: payload.role,
        email,
        // Si el backend manda loginMethod en el JWT, lo usamos; si no, asumimos "local"
        loginMethod: (payload.loginMethod as "local" | "google") || "local",
      };

      localStorage.setItem("token", token);
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
      console.error(err);
      alert("Código incorrecto o expirado.");
    } finally {
      setLoading(false);
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
            marginBottom: "25px",
            fontSize: "22px",
            color: "#333",
          }}
        >
          Verificación por Código TOTP
        </h2>
        <form
          onSubmit={handleSubmit}
          style={{ display: "flex", flexDirection: "column" }}
        >
          <label
            style={{ marginBottom: "8px", fontSize: "15px", color: "#333" }}
          >
            Ingresa el código de 6 dígitos:
          </label>
          <input
            type="text"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value)}
            required
            style={{
              padding: "10px",
              fontSize: "16px",
              marginBottom: "20px",
              borderRadius: "8px",
              border: "1px solid #ccc",
              outline: "none",
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
            }}
          >
            {loading ? "Verificando..." : "Verificar"}
          </button>
        </form>
      </div>
    </div>
  );
}
