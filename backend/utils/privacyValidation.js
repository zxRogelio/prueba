export class PrivacyError extends Error {
  constructor(status, code, message, fields) {
    super(message);
    Object.assign(this, { status, code, fields });
  }
}

export function reject(status, code, message, fields) {
  throw new PrivacyError(status, code, message, fields);
}

export function exactObject(value, allowed, required = []) {
  if (!value || typeof value !== "object" || Array.isArray(value) ||
      Object.keys(value).some((key) => !allowed.includes(key)) ||
      required.some((key) => !Object.hasOwn(value, key))) {
    reject(422, "INVALID_INPUT", "El cuerpo contiene campos inválidos o incompletos.");
  }
  return value;
}

export function personalFields(body) {
  exactObject(body, ["fullName", "phone"]);
  if (!Object.keys(body).length) reject(422, "INVALID_INPUT", "Indica un campo para rectificar.");
  const result = {};
  const fields = {};
  for (const [key, value] of Object.entries(body)) {
    const max = key === "fullName" ? 160 : 30;
    if (value !== null && typeof value !== "string") {
      fields[key] = "Debe ser texto o null.";
      continue;
    }
    const clean = value === null ? null : value.trim() || null;
    if (clean && (clean.length > max || /[\x00-\x1f\x7f<>]/u.test(clean) ||
        (key === "phone" && (!/^\+?[\d ().-]+$/.test(clean) || !/\d/.test(clean))))) {
      fields[key] = `Formato inválido; máximo ${max} caracteres.`;
    } else result[key] = clean;
  }
  if (Object.keys(fields).length) reject(422, "INVALID_INPUT", "Revisa los campos personales.", fields);
  return result;
}

export const isUuid = (value) => typeof value === "string" &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
