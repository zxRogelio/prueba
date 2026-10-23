// Only the static public shell is aliased; never cache API or rendered user data.
export const publicPagePaths = [
  "/", "/catalogue", "/suscripciones", "/about", "/terms", "/aviso-privacidad",
] as const;

export const publicNavigationAllowlist = [
  /^\/(?:\?.*)?$/,
  /^\/catalogue(?:\/[^/?]+)?\/?(?:\?.*)?$/,
  /^\/(?:suscripciones|about|AboutPage|AboutePage|terms|aviso-privacidad)\/?(?:\?.*)?$/,
];

export function publicPagePath(url: URL) {
  const pathname = url.pathname.replace(/\/$/, "") || "/";
  return publicNavigationAllowlist.some((pattern) => pattern.test(pathname)) ? pathname : undefined;
}
