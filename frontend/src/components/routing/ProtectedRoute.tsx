import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth, type User } from "../../context/AuthContext";
import { normalizeAppRole } from "../../utils/authRouting";

type AppRole = User["rol"];

interface ProtectedRouteProps {
  allowedRoles: AppRole[];
}

export default function ProtectedRoute({ allowedRoles }: ProtectedRouteProps) {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  const currentRole = normalizeAppRole(user.rol);

  if (!currentRole || !allowedRoles.includes(currentRole)) {
    return <Navigate to="/400" replace />;
  }

  return <Outlet />;
}
