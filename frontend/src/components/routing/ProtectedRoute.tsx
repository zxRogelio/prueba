import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth, type User } from "../../context/AuthContext";

type AppRole = User["rol"];

interface ProtectedRouteProps {
  allowedRoles: AppRole[];
}

function normalizeRole(role: unknown): AppRole | null {
  const normalizedRole = String(role ?? "").toLowerCase();

  if (normalizedRole === "admin" || normalizedRole === "administrador") {
    return "administrador";
  }

  if (normalizedRole === "entrenador" || normalizedRole === "trainer") {
    return "entrenador";
  }

  if (normalizedRole === "cliente") {
    return "cliente";
  }

  return null;
}

export default function ProtectedRoute({ allowedRoles }: ProtectedRouteProps) {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  const currentRole = normalizeRole(user.rol);

  if (!currentRole || !allowedRoles.includes(currentRole)) {
    return <Navigate to="/400" replace />;
  }

  return <Outlet />;
}
