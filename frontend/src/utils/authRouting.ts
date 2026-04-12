import type { User } from "../context/AuthContext";

export type AppRole = User["rol"];

interface AuthUserInput {
  id?: unknown;
  email?: unknown;
  role?: unknown;
  rol?: unknown;
  loginMethod?: User["loginMethod"];
  mustChangePassword?: unknown;
}

export function normalizeAppRole(role: unknown): AppRole | null {
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

export function buildAuthUser(
  input: AuthUserInput,
  fallbackEmail = ""
): User {
  return {
    id: input.id != null ? String(input.id) : undefined,
    email: String(input.email ?? fallbackEmail),
    rol: normalizeAppRole(input.role ?? input.rol) ?? "cliente",
    loginMethod: input.loginMethod,
    mustChangePassword: Boolean(input.mustChangePassword),
  };
}

export function getDefaultAuthenticatedRoute(role: unknown) {
  const normalizedRole = normalizeAppRole(role);

  if (normalizedRole === "administrador") {
    return "/admin";
  }

  if (normalizedRole === "entrenador") {
    return "/entrenador";
  }

  return "/";
}

export function getPortalRoute(role: unknown) {
  const normalizedRole = normalizeAppRole(role);

  if (normalizedRole === "administrador") {
    return "/admin";
  }

  if (normalizedRole === "entrenador") {
    return "/entrenador";
  }

  if (normalizedRole === "cliente") {
    return "/cliente";
  }

  return "/login";
}
