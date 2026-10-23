// Only the static public shell is aliased; never cache API or rendered user data.
export const publicPagePaths = [
  "/", "/catalogue", "/suscripciones", "/about", "/terms", "/aviso-privacidad",
  "/login", "/register", "/forgot-password",
] as const;

export const publicNavigationAllowlist = [
  /^\/(?:\?.*)?$/,
  /^\/catalogue(?:\/[^/?]+)?\/?(?:\?.*)?$/,
  /^\/(?:suscripciones|about|AboutPage|AboutePage|terms|aviso-privacidad|login|register|forgot-password)\/?(?:\?.*)?$/,
];

export function publicPagePath(url: URL) {
  const pathname = url.pathname.replace(/\/$/, "") || "/";
  return publicNavigationAllowlist.some((pattern) => pattern.test(pathname)) ? pathname : undefined;
}
