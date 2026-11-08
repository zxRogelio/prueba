import { PrivacyError } from "../utils/privacyValidation.js";
import { sequelize } from "../config/sequelize.js";
import { getPrivacyNotice } from "../config/privacyNotice.js";
import { acceptConsent, listConsents, getPersonalProfile, rectifyProfile, getPreferences, updatePreferences } from "../services/privacyService.js";
import { reauthenticate, verifyReauthentication, requestCancellation, getCancellation, listCancellations } from "../services/accountCancellationService.js";

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
// Read-only readiness check. A new route and a 401 without a JWT do not prove
// that the migration, open-request index and audit protection are installed.
export async function getCapabilities(req, res) {
  try {
    const [rows] = await sequelize.query(`
      WITH required(table_name, column_name) AS (VALUES
        ('Users','deletionCompletedAt'), ('AccountCancellationRequests','version'),
        ('AccountCancellationRequests','resolutionCode'),
        ('AccountCancellationEvents','id'), ('AccountCancellationEvents','requestId'),
        ('AccountCancellationEvents','actorId'), ('AccountCancellationEvents','idempotencyKey'),
        ('AccountCancellationEvents','commandHash'), ('AccountCancellationEvents','fromStatus'),
        ('AccountCancellationEvents','toStatus'), ('AccountCancellationEvents','reasonCode'),
        ('AccountCancellationEvents','policyId'), ('AccountCancellationEvents','policySha256'),
        ('AccountCancellationEvents','version'), ('AccountCancellationEvents','recordedAt')
      )
      SELECT NOT EXISTS (
        SELECT 1 FROM required r LEFT JOIN information_schema.columns c
          ON c.table_schema='core' AND c.table_name=r.table_name AND c.column_name=r.column_name
        WHERE c.column_name IS NULL
      ) AND EXISTS (
        SELECT 1 FROM pg_index i WHERE i.indexrelid=to_regclass('core.one_pending_cancellation_per_user')
          AND i.indrelid=to_regclass('core."AccountCancellationRequests"') AND i.indisunique AND i.indisvalid
          AND position('under_review' in pg_get_expr(i.indpred,i.indrelid)) > 0
          AND position('awaiting_policy' in pg_get_expr(i.indpred,i.indrelid)) > 0
      ) AND EXISTS (
        SELECT 1 FROM pg_trigger t WHERE t.tgrelid=to_regclass('core."AccountCancellationEvents"')
          AND t.tgname='cancellation_event_immutable' AND t.tgenabled IN ('O','A') AND NOT t.tgisinternal
      ) AS ready
    `);
    if (rows[0]?.ready !== true) throw new Error('Schema not ready');
    return res.json({ schemaVersion: 2, databaseReady: true, cancellationStatusLookup: true,
      googleEmailStepUp: true, deletionRequiresApprovedPolicy: true });
  } catch {
    return res.status(503).json({ code: 'PRIVACY_SCHEMA_NOT_READY', schemaVersion: 2, databaseReady: false,
      error: 'El servicio de privacidad todavía no está disponible.' });
  }
}
export const getConsents = endpoint((req) => listConsents(req.user.id));
export const postConsent = endpoint((req) => acceptConsent(req.user.id, req.body), 201);
export const getProfile = endpoint(async (req, res) => profileEtag(res, await getPersonalProfile(req.user, req.loginMethod)));
export const patchProfile = endpoint(async (req, res) => profileEtag(res, await rectifyProfile(req.user.id, req.body, req.headers["if-match"])));
export const getPrivacyPreferences = endpoint((req) => getPreferences(req.user.id));
export const patchPrivacyPreferences = endpoint((req) => updatePreferences(req.user.id, req.body));
export const postReauthentication = async (req, res) => {
  try {
    const result = await reauthenticate(req.user.id, req.authSession.id, req.body, req.loginMethod);
    return res.status(result.status).json(result.body);
  } catch (error) { return privacyFailure(error, res); }
};
export const verifyReauthenticationChallenge = endpoint((req) => verifyReauthentication(req.user.id, req.authSession.id, req.body));
export const postCancellation = endpoint((req) => requestCancellation(req.user.id, req.authSession.id, req.body, req.headers["idempotency-key"]), 202);
export const getCancellationRequest = endpoint((req) => getCancellation(req.user.id, req.params.requestId));
export const getCancellationRequests = endpoint((req) => listCancellations(req.user.id));
