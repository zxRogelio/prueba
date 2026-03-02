import React, { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext, type User } from "./AuthContext";

const INACTIVITY_LIMIT_MS = 15 * 60_000; // 15 minutos

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUserState] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const inactivityTimerRef = useRef<number | null>(null);
  const navigate = useNavigate();

  const clearInactivityTimer = useCallback(() => {
    if (inactivityTimerRef.current !== null) {
      window.clearTimeout(inactivityTimerRef.current);
      inactivityTimerRef.current = null;
    }
  }, []);

  const setUser = useCallback((next: User | null) => {
    setUserState(next);
    if (next) localStorage.setItem("user", JSON.stringify(next));
    else {
      localStorage.removeItem("user");
      localStorage.removeItem("token");
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    setUserState(null);
    clearInactivityTimer();
    navigate("/login", { replace: true });
  }, [clearInactivityTimer, navigate]);

  const startInactivityTimer = useCallback(() => {
    clearInactivityTimer();
    inactivityTimerRef.current = window.setTimeout(() => {
      alert("Por seguridad, tu sesión se cerró por inactividad.");
      logout();
    }, INACTIVITY_LIMIT_MS);
  }, [clearInactivityTimer, logout]);

  // cargar sesión al iniciar
  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      try {
        setUserState(JSON.parse(storedUser));
      } catch {
        localStorage.removeItem("user");
        setUserState(null);
      }
    }
    setIsLoading(false);
  }, []);

  // timer de inactividad
  useEffect(() => {
    if (!user) {
      clearInactivityTimer();
      return;
    }

    startInactivityTimer();

    const resetTimer = () => startInactivityTimer();
    const events = ["click", "mousemove", "keydown", "scroll", "touchstart"] as const;

    events.forEach((eventName) => window.addEventListener(eventName, resetTimer));

    return () => {
      events.forEach((eventName) => window.removeEventListener(eventName, resetTimer));
      clearInactivityTimer();
    };
  }, [user, startInactivityTimer, clearInactivityTimer]);

  if (isLoading) return null;

  return (
    <AuthContext.Provider value={{ user, setUser, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
