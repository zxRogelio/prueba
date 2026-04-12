/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../context/AuthContext";
import {
  buildAuthUser,
  getDefaultAuthenticatedRoute,
} from "../utils/authRouting";

export default function ConfirmAccessPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const token = new URLSearchParams(location.search).get("token");

  useEffect(() => {
    const confirmAccess = async () => {
      if (!token) {
        alert("Token invalido");
        navigate("/login", { replace: true });
        return;
      }

      try {
        const response = await axios.post(
          `${import.meta.env.VITE_API_URL}/auth/confirm-access`,
          { token }
        );

        const accessToken = response.data.token;
        const responseUser = response.data.user;
        if (!accessToken) {
          throw new Error("Token invalido");
        }

        localStorage.setItem("token", accessToken);

        const user = buildAuthUser({
          id: responseUser?.id,
          email: responseUser?.email,
          role: responseUser?.role ?? responseUser?.rol,
          loginMethod: "local",
          mustChangePassword: responseUser?.mustChangePassword,
        });

        localStorage.setItem("user", JSON.stringify(user));
        setUser(user);

        alert("Acceso confirmado correctamente");

        setTimeout(() => {
          navigate(
            user.mustChangePassword
              ? "/primer-acceso"
              : getDefaultAuthenticatedRoute(user.rol),
            { replace: true }
          );
        }, 1000);
      } catch (error: any) {
        console.error(
          "Error al confirmar acceso (frontend):",
          error.response?.data || error
        );

        const message: string = error?.response?.data?.error || "";

        if (message.toLowerCase().includes("expirado")) {
          alert("El enlace expiro, vuelve a iniciar sesion.");
        } else if (message) {
          alert(`Error al confirmar acceso: ${message}`);
        } else {
          alert("El enlace es invalido o ya fue utilizado.");
        }

        navigate("/login", { replace: true });
      }
    };

    confirmAccess();
  }, [navigate, setUser, token]);

  return (
    <div style={{ padding: "3rem", textAlign: "center" }}>
      <h2>Verificando acceso...</h2>
      <div
        className="spinner"
        style={{
          marginTop: "2rem",
          width: "40px",
          height: "40px",
          border: "5px solid #ccc",
          borderTop: "5px solid #4CAF50",
          borderRadius: "50%",
          animation: "spin 1s linear infinite",
          margin: "auto",
        }}
      />
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
