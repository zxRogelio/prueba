const LOCALHOST_IPV4 = "127.0.0.1";
const LOCALHOST_LABEL = `${LOCALHOST_IPV4} (localhost)`;

const toFirstValue = (value) => {
  if (Array.isArray(value)) {
    return value.find(Boolean) ?? null;
  }

  if (typeof value !== "string") {
    return value ?? null;
  }

  return value.split(",")[0]?.trim() || null;
};

const isLoopback = (value) =>
  value === "::1" ||
  value === "0:0:0:0:0:0:0:1" ||
  value === LOCALHOST_IPV4 ||
  value === `::ffff:${LOCALHOST_IPV4}`;

export const normalizeIp = (value) => {
  const rawValue = toFirstValue(value);
  if (!rawValue) return null;

  let normalized = String(rawValue).trim();
  if (!normalized) return null;

  if (normalized.startsWith("::ffff:")) {
    normalized = normalized.slice(7);
  }

  if (isLoopback(normalized)) {
    return LOCALHOST_LABEL;
  }

  return normalized;
};

export const getClientIp = (req) => {
  // Express resuelve la cadena de proxies conforme a "trust proxy".
  // Sin Express, solo se acepta la dirección del socket, nunca encabezados.
  return normalizeIp(
    req.ip || req.socket?.remoteAddress || req.connection?.remoteAddress,
  );
};
