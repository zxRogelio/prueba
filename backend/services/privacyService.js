import { createHash } from "node:crypto";
import { sequelize } from "../config/sequelize.js";
import { User } from "../models/User.js";
import { TrainerProfile } from "../models/TrainerProfile.js";
import { UserPersonalData, PrivacyConsent, PrivacyPreference, PrivacyPreferenceEvent } from "../models/Privacy.js";
import { validateConsent } from "../config/privacyNotice.js";
import { exactObject, personalFields, reject } from "../utils/privacyValidation.js";

export const OPTIONAL_PURPOSES = ["promotional_communications", "satisfaction_surveys"];
export async function lockPrivacyUser(userId, transaction) {
  const user = await User.findByPk(userId, { transaction, lock: transaction.LOCK.UPDATE });
  if (!user) reject(401, "UNAUTHORIZED", "Usuario no disponible.");
  return user;
}

const receipt = (row) => ({ receiptId: row.id, noticeId: row.noticeId, version: row.version,
  contentSha256: row.contentSha256, documentUrl: row.documentUrl, acceptedAt: row.acceptedAt, revokedAt: row.revokedAt ?? null });

// Also used by registration, in the SAME transaction as User.create.
export async function persistConsent(userId, notice, source, transaction) {
  const where = { userId, noticeId: notice.noticeId, version: notice.version, contentSha256: notice.contentSha256 };
  const existing = await PrivacyConsent.findOne({ where, transaction });
  const row = existing || await PrivacyConsent.create({ ...where, documentUrl: notice.documentUrl,
    source, acceptedAt: new Date(), revokedAt: null }, { transaction });
  return receipt(row);
}

export async function acceptConsent(userId, body) {
  const notice = validateConsent(body);
  return sequelize.transaction(async (transaction) => {
    await lockPrivacyUser(userId, transaction);
    return persistConsent(userId, notice, "self_service", transaction);
  });
}
export async function listConsents(userId) {
  return { consents: (await PrivacyConsent.findAll({ where: { userId }, order: [["acceptedAt", "ASC"]] })).map(receipt) };
}

async function personalRow(user, transaction) {
  return user.role === "entrenador"
    ? TrainerProfile.findOne({ where: { trainerId: user.id }, transaction })
    : UserPersonalData.findOne({ where: { userId: user.id }, transaction });
}
function serializePersonal(user, row) {
  const fullName = row?.fullName ?? null;
  const phone = row?.phone ?? null;
  const updatedAt = row?.updatedAt ?? null;
  const version = createHash("sha256").update(JSON.stringify([user.id, row?.id ?? null, fullName, phone, updatedAt])).digest("hex");
  return { id: user.id, fullName, phone, updatedAt, version };
}
export async function getPersonalProfile(user, loginMethod) {
  return { email: user.email, rol: user.role, authMethod: user.authMethod, provider: user.provider,
    loginMethod: loginMethod || (user.provider === "google" ? "google" : "local"),
    ...serializePersonal(user, await personalRow(user)) };
}
export async function rectifyProfile(userId, body, ifMatch) {
  const fields = personalFields(body);
  if (typeof ifMatch !== "string" || !/^"[a-f0-9]{64}"$/.test(ifMatch)) {
    reject(428, "PRECONDITION_REQUIRED", "Envía el ETag del perfil en If-Match.");
  }
  return sequelize.transaction(async (transaction) => {
    const user = await lockPrivacyUser(userId, transaction);
    let row = await personalRow(user, transaction);
    if (ifMatch !== `"${serializePersonal(user, row).version}"`) {
      reject(412, "PROFILE_VERSION_CHANGED", "El perfil cambió. Consulta sus datos antes de guardar.");
    }
    if (row) await row.update(fields, { transaction });
    else if (user.role === "entrenador") row = await TrainerProfile.create({ trainerId: user.id, ...fields }, { transaction });
    else row = await UserPersonalData.create({ userId: user.id, ...fields }, { transaction });
    return serializePersonal(user, row);
  });
}

const preferenceView = (row) => ({ version: row?.version ?? 1, preferences: OPTIONAL_PURPOSES.map((purpose) => ({
  purpose, optOut: row?.choices?.[purpose]?.optOut ?? null, updatedAt: row?.choices?.[purpose]?.updatedAt ?? null,
})) });
export async function getPreferences(userId) {
  return preferenceView(await PrivacyPreference.findOne({ where: { userId } }));
}
export async function updatePreferences(userId, body) {
  exactObject(body, ["version", "preferences"], ["version", "preferences"]);
  if (!Number.isSafeInteger(body.version) || body.version < 1 || !Array.isArray(body.preferences) ||
      !body.preferences.length || body.preferences.length > OPTIONAL_PURPOSES.length) {
    reject(422, "INVALID_INPUT", "Versión o preferencias inválidas.");
  }
  const seen = new Set();
  for (const item of body.preferences) {
    exactObject(item, ["purpose", "optOut"], ["purpose", "optOut"]);
    if (!OPTIONAL_PURPOSES.includes(item.purpose) || seen.has(item.purpose) || typeof item.optOut !== "boolean") {
      reject(422, "INVALID_INPUT", "Finalidad desconocida, repetida o elección inválida.");
    }
    seen.add(item.purpose);
  }
  return sequelize.transaction(async (transaction) => {
    await lockPrivacyUser(userId, transaction);
    let row = await PrivacyPreference.findOne({ where: { userId }, transaction });
    if (body.version !== (row?.version ?? 1)) reject(409, "PREFERENCES_VERSION_CHANGED", "Consulta de nuevo tus preferencias.");
    const recordedAt = new Date();
    const choices = { ...(row?.choices ?? {}) };
    for (const item of body.preferences) choices[item.purpose] = { optOut: item.optOut, updatedAt: recordedAt.toISOString() };
    const version = body.version + 1;
    if (row) await row.update({ choices, version }, { transaction });
    else row = await PrivacyPreference.create({ userId, choices, version }, { transaction });
    await PrivacyPreferenceEvent.create({ userId, version, changes: body.preferences, recordedAt }, { transaction });
    return preferenceView(row);
  });
}

// This is an eligibility guard, NOT an advertising consent receipt. Optional
// senders must also supply their independently approved consent/legal basis.
export async function maySendOptionalCommunication(userId, purpose, { hasApprovedAuthorization = false } = {}) {
  if (!userId || !OPTIONAL_PURPOSES.includes(purpose) || hasApprovedAuthorization !== true) return false;
  const row = await PrivacyPreference.findOne({ where: { userId } });
  return row?.choices?.[purpose]?.optOut === false;
}
