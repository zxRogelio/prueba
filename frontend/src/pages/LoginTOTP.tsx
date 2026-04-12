/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { API } from "../api/api";
import { useAuth } from "../context/AuthContext";
import {
  buildAuthUser,
  getDefaultAuthenticatedRoute,
} from "../utils/authRouting";

export default function LoginTOTP() {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { setUser } = useAuth();

  const emailFromState = (location.state as any)?.email;
  const emailFromQuery = searchParams.get("email");
  const email = emailFromState || emailFromQuery || "";

  useEffect(() => {
    if (!email) {
      navigate("/login");
    }
  }, [email, navigate]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!email) return;

    setLoading(true);

    try {
      const response = await API.post("/auth/verify-totp", { email, code });
      const token = response.data.token;
      const responseUser = response.data.user;

      if (!token) {
        throw new Error("Token no recibido");
      }

      const user = buildAuthUser(
        {
          id: responseUser?.id,
          email: responseUser?.email ?? email,
          role: responseUser?.role ?? responseUser?.rol,
          loginMethod: "local",
          mustChangePassword: responseUser?.mustChangePassword,
        },
        email
      );

      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(user));
      setUser(user);

      if (user.mustChangePassword) {
        navigate("/primer-acceso", { replace: true });
        return;
      }

      navigate(getDefaultAuthenticatedRoute(user.rol));
    } catch (error) {
      console.error(error);
      alert("Codigo incorrecto o expirado.");
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
          Verificacion por Codigo TOTP
        </h2>
        <form
          onSubmit={handleSubmit}
          style={{ display: "flex", flexDirection: "column" }}
        >
          <label
            style={{ marginBottom: "8px", fontSize: "15px", color: "#333" }}
          >
            Ingresa el codigo de 6 digitos:
          </label>
          <input
            type="text"
            maxLength={6}
            value={code}
            onChange={(event) => setCode(event.target.value)}
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
