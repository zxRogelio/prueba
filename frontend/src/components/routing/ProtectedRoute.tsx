import { useEffect } from "react";
import { Navigate, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth, type User } from "../../context/AuthContext";
import { getPortalRoute, normalizeAppRole } from "../../utils/authRouting";
import { showLoginSuccessAlert } from "../../utils/feedback";

type AppRole = User["rol"];

interface ProtectedRouteProps {
  allowedRoles: AppRole[];
}

interface ProtectedRouteState {
  showLoginSuccess?: boolean;
}

export default function ProtectedRoute({ allowedRoles }: ProtectedRouteProps) {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const currentRole = user ? normalizeAppRole(user.rol) : null;

  useEffect(() => {
    if (!user) return;

    const state = (location.state as ProtectedRouteState | null) ?? null;

    if (!state?.showLoginSuccess) return;

    const handledKey = `login-success:${location.key}`;
    if (sessionStorage.getItem(handledKey)) return;

    sessionStorage.setItem(handledKey, "1");

    navigate(`${location.pathname}${location.search}${location.hash}`, {
      replace: true,
    });

    void showLoginSuccessAlert(user.rol);
  }, [location, navigate, user]);

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (!currentRole || !allowedRoles.includes(currentRole)) {
    return <Navigate to="/400" replace />;
  }

  if (user.mustChangePassword && location.pathname !== "/primer-acceso") {
    return <Navigate to="/primer-acceso" replace />;
  }

  if (!user.mustChangePassword && location.pathname === "/primer-acceso") {
    return <Navigate to={getPortalRoute(user.rol)} replace />;
  }

  return <Outlet />;
}
