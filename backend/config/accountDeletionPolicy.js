import { createHash } from "node:crypto";
import { reject } from "../utils/privacyValidation.js";

// This executor ONLY anonymizes login identity and erases name/phone. Every
// remaining domain needs an explicit, approved retention rule. Other policies
// require a separately reviewed executor; arbitrary SQL/actions are never read.
export const RETAINED_CATEGORIES = Object.freeze([
  "payment_records", "orders_and_receipts", "memberships_and_history", "security_and_audit", "backups",
  "health_and_training", "addresses_and_delivery", "analytics_and_exports", "media_and_provider_data",
]);
export function approvedDeletionPolicy() {
  const raw = process.env.ACCOUNT_DELETION_POLICY_JSON;
  if (!raw) reject(409, "RETENTION_POLICY_PENDING_APPROVAL", "La conservación y eliminación todavía requieren aprobación.");
  let policy;
  try { policy = JSON.parse(raw); } catch { /* fail closed */ }
  const validDate = (value) => typeof value === "string" && Number.isFinite(Date.parse(value));
  const ruleValid = (rule) => rule?.action === "retain" && typeof rule.reason === "string" && rule.reason.trim().length >= 10 &&
    validDate(rule.retainUntil) && Date.parse(rule.retainUntil) > Date.now();
  if (createHash("sha256").update(raw).digest("hex") !== process.env.ACCOUNT_DELETION_POLICY_SHA256 ||
      policy?.status !== "approved" || policy.executor !== "identity-profile-v1" ||
      typeof policy.id !== "string" || !/^[A-Za-z0-9._-]{1,100}$/.test(policy.id) ||
      typeof policy.approvedBy !== "string" || !policy.approvedBy.trim() ||
      !validDate(policy.approvedAt) || Date.parse(policy.approvedAt) > Date.now() ||
      !validDate(policy.validUntil) || Date.parse(policy.validUntil) <= Date.now() ||
      policy.identity !== "pseudonymize" || policy.personalData !== "erase" ||
      !policy.retention || Object.keys(policy.retention).length !== RETAINED_CATEGORIES.length ||
      !RETAINED_CATEGORIES.every((category) => ruleValid(policy.retention[category]))) {
    reject(409, "DELETION_POLICY_UNSUPPORTED", "La política no está aprobada, vigente o soportada por este ejecutor.");
  }
  if (process.env.ACCOUNT_DELETION_EXECUTION_ENABLED !== 'true') {
    reject(409, 'DELETION_EXECUTION_DISABLED', 'La ejecución de eliminaciones permanece deshabilitada hasta validar el procedimiento operativo.');
  }
  return policy;
}
