import { reject, exactObject } from "../utils/privacyValidation.js";

// These values must describe a document approved by the data controller.
// No built-in version/hash: an old UI notice is not evidence of approval.
export function getPrivacyNotice() {
  const version = process.env.PRIVACY_NOTICE_VERSION;
  const contentSha256 = process.env.PRIVACY_NOTICE_SHA256;
  const documentUrl = process.env.PRIVACY_NOTICE_URL;
  let url;
  try { url = new URL(documentUrl); } catch { /* handled below */ }
  if (!version || version.length > 80 || !/^[a-f0-9]{64}$/.test(contentSha256 || "") ||
      !url || url.protocol !== "https:" || url.username || url.password || url.hash) {
    reject(503, "PRIVACY_NOTICE_UNAVAILABLE", "El aviso aprobado aún no está disponible.");
  }
  return { noticeId: "privacy-notice", version, contentSha256, documentUrl,
    requiredForRegistration: process.env.PRIVACY_REQUIRE_REGISTRATION_CONSENT === "true" };
}

export function validateConsent(value, { registration = false } = {}) {
  if (value === undefined && registration && process.env.PRIVACY_REQUIRE_REGISTRATION_CONSENT !== "true") return null;
  if (!value || value.accepted !== true) {
    reject(422, "CONSENT_REQUIRED", "Se requiere aceptación explícita del aviso de privacidad.");
  }
  exactObject(value, ["noticeId", "version", "accepted"], ["noticeId", "version", "accepted"]);
  const notice = getPrivacyNotice();
  if (value.noticeId !== notice.noticeId || value.version !== notice.version) {
    reject(409, "NOTICE_VERSION_CHANGED", "Consulta y acepta la versión vigente del aviso.");
  }
  return notice;
}
