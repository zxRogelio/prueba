/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
// src/pages/VerifyAccountPage.tsx
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import { CheckCircle2, XCircle } from "lucide-react";

export default function VerifyAccountPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("Verificando tu cuenta...");

  useEffect(() => {
    const verify = async () => {
      const token = new URLSearchParams(location.search).get("token");
      if (!token) {
        setStatus("error");
        setMessage("Token no proporcionado.");
        return;
      }

      try {
        const res = await axios.get(
          `${import.meta.env.VITE_API_URL}/auth/verify-account?token=${token}`
        );
        setStatus("success");
        setMessage(res.data.message || "Cuenta verificada correctamente.");
        setTimeout(() => navigate("/login"), 4000);
      } catch (err: any) {
        setStatus("error");
        setMessage("Token inválido o expirado.");
      }
    };

    verify();
  }, [location, navigate]);

  return (
    <div
      style={{
        minHeight: "100vh",
        paddingTop: "100px",
        display: "flex",
        justifyContent: "center",
        alignItems: "flex-start",
        background: "#f9f9f9",
      }}
    >
      <div
        style={{
          background: "white",
          borderRadius: "12px",
          padding: "2rem",
          boxShadow: "0 8px 16px rgba(0,0,0,0.1)",
          textAlign: "center",
          maxWidth: "420px",
          width: "100%",
        }}
      >
        <h2 style={{ fontSize: "1.5rem", marginBottom: "1.5rem" }}>Verificación de cuenta</h2>

        {status === "loading" && <p style={{ fontSize: "1.1rem" }}>{message}</p>}

        {status === "success" && (
          <>
            <CheckCircle2 size={80} color="#4caf50" />
            <p
              style={{
                color: "#4caf50",
                fontWeight: "bold",
                fontSize: "1.2rem",
                marginTop: "1rem",
              }}
            >
              {message}
            </p>
            <p>Redirigiendo al inicio de sesión...</p>
          </>
        )}

        {status === "error" && (
          <>
            <XCircle size={80} color="#f44336" />
            <p
              style={{
                color: "#f44336",
                fontWeight: "bold",
                fontSize: "1.2rem",
                marginTop: "1rem",
              }}
            >
              {message}
            </p>
            <p>Solicita un nuevo enlace de verificación.</p>
          </>
        )}
      </div>
    </div>
  );
}
