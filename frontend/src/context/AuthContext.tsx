import { createContext, useContext } from "react";

export interface User {
  id?: string;
  email: string;
  rol: "cliente" | "entrenador" | "administrador";
  loginMethod?: "local" | "google";
}

export interface AuthContextType {
  user: User | null;
  setUser: (user: User | null) => void;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth debe usarse dentro de un AuthProvider");
  return context;
};
