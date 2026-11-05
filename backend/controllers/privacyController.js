import { PrivacyError } from "../utils/privacyValidation.js";
import { getPrivacyNotice } from "../config/privacyNotice.js";
import { acceptConsent, listConsents, getPersonalProfile, rectifyProfile, getPreferences, updatePreferences } from "../services/privacyService.js";
import { reauthenticate, verifyReauthentication, requestCancellation, getCancellation } from "../services/accountCancellationService.js";

export function privacyFailure(error, res) {
  if (error instanceof PrivacyError) return res.status(error.status).json({ code: error.code, error: error.message,
    ...(error.fields ? { fields: error.fields } : {}) });
  // Driver/provider errors can contain SQL, credentials and personal data.
  return res.status(503).json({ code: "PRIVACY_SERVICE_UNAVAILABLE", error: "El servicio de privacidad no está disponible. Intenta más tarde." });
}
const endpoint = (run, status = 200) => async (req, res) => {
  try { return res.status(status).json(await run(req, res)); }
  catch (error) { return privacyFailure(error, res); }
};
const profileEtag = (res, body) => { res.set("ETag", `"${body.version}"`); return body; };

export const getNotice = endpoint(() => getPrivacyNotice());
export const getConsents = endpoint((req) => listConsents(req.user.id));
export const postConsent = endpoint((req) => acceptConsent(req.user.id, req.body), 201);
export const getProfile = endpoint(async (req, res) => profileEtag(res, await getPersonalProfile(req.user, req.loginMethod)));
export const patchProfile = endpoint(async (req, res) => profileEtag(res, await rectifyProfile(req.user.id, req.body, req.headers["if-match"])));
export const getPrivacyPreferences = endpoint((req) => getPreferences(req.user.id));
export const patchPrivacyPreferences = endpoint((req) => updatePreferences(req.user.id, req.body));
export const postReauthentication = async (req, res) => {
  try {
    const result = await reauthenticate(req.user.id, req.authSession.id, req.body);
    return res.status(result.status).json(result.body);
  } catch (error) { return privacyFailure(error, res); }
};
export const verifyReauthenticationChallenge = endpoint((req) => verifyReauthentication(req.user.id, req.authSession.id, req.body));
export const postCancellation = endpoint((req) => requestCancellation(req.user.id, req.authSession.id, req.body, req.headers["idempotency-key"]), 202);
export const getCancellationRequest = endpoint((req) => getCancellation(req.user.id, req.params.requestId));
