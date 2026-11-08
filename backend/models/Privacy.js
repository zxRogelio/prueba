import { DataTypes } from "sequelize";
import { sequelize } from "../config/sequelize.js";

const uuid = () => ({ type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true });
const userId = (primaryKey = false) => ({ type: DataTypes.UUID, allowNull: false, primaryKey,
  references: { model: { schema: "core", tableName: "Users" }, key: "id" }, onDelete: "RESTRICT", onUpdate: "CASCADE" });
const define = (name, fields, timestamps = true) => sequelize.define(name, fields, { schema: "core", tableName: `${name}s`, timestamps });

export const UserPersonalData = define("UserPersonalData", {
  userId: userId(true), fullName: DataTypes.STRING(160), phone: DataTypes.STRING(30),
});
export const PrivacyConsent = define("PrivacyConsent", {
  id: uuid(), userId: userId(), noticeId: { type: DataTypes.STRING(80), allowNull: false },
  version: { type: DataTypes.STRING(80), allowNull: false }, contentSha256: { type: DataTypes.STRING(64), allowNull: false },
  documentUrl: { type: DataTypes.TEXT, allowNull: false }, source: { type: DataTypes.STRING(30), allowNull: false },
  acceptedAt: { type: DataTypes.DATE, allowNull: false }, revokedAt: DataTypes.DATE,
}, false);
export const PrivacyPreference = define("PrivacyPreference", {
  userId: userId(true), version: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
  choices: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
});
export const PrivacyPreferenceEvent = define("PrivacyPreferenceEvent", {
  id: uuid(), userId: userId(), version: { type: DataTypes.INTEGER, allowNull: false },
  changes: { type: DataTypes.JSONB, allowNull: false }, recordedAt: { type: DataTypes.DATE, allowNull: false },
}, false);
const reauthFields = () => ({
  id: uuid(), userId: userId(), sessionId: { type: DataTypes.UUID, allowNull: false,
    references: { model: { schema: "core", tableName: "sessions" }, key: "id" }, onDelete: "RESTRICT" },
  purpose: { type: DataTypes.STRING(40), allowNull: false },
  credentialHash: { type: DataTypes.STRING(64), allowNull: false },
  expiresAt: { type: DataTypes.DATE, allowNull: false }, consumedAt: DataTypes.DATE,
  createdAt: { type: DataTypes.DATE, allowNull: false },
});
export const ReauthenticationChallenge = define("ReauthenticationChallenge", {
  ...reauthFields(), method: { type: DataTypes.STRING(20), allowNull: false },
  codeHash: DataTypes.STRING(64), attempts: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
}, false);
export const ReauthenticationProof = define("ReauthenticationProof", {
  ...reauthFields(), tokenHash: { type: DataTypes.STRING(64), allowNull: false, unique: true },
}, false);
export const AccountCancellationRequest = define("AccountCancellationRequest", {
  id: uuid(), userId: userId(), idempotencyKey: { type: DataTypes.UUID, allowNull: false },
  requestHash: { type: DataTypes.STRING(64), allowNull: false },
  status: { type: DataTypes.STRING(30), allowNull: false, defaultValue: "pending_review" },
  membershipImpact: { type: DataTypes.JSONB, allowNull: false }, retentionSummary: { type: DataTypes.JSONB, allowNull: false },
  createdAt: { type: DataTypes.DATE, allowNull: false }, resolvedAt: DataTypes.DATE,
  version: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 }, resolutionCode: DataTypes.STRING(80),
}, false);
export const AccountCancellationEvent = define("AccountCancellationEvent", {
  id: uuid(), requestId: { type: DataTypes.UUID, allowNull: false }, actorId: userId(),
  idempotencyKey: { type: DataTypes.UUID, allowNull: false }, commandHash: { type: DataTypes.STRING(64), allowNull: false },
  fromStatus: { type: DataTypes.STRING(30), allowNull: false }, toStatus: { type: DataTypes.STRING(30), allowNull: false },
  reasonCode: { type: DataTypes.STRING(80), allowNull: false }, policyId: DataTypes.STRING(100),
  policySha256: DataTypes.STRING(64),
  version: { type: DataTypes.INTEGER, allowNull: false }, recordedAt: { type: DataTypes.DATE, allowNull: false },
}, false);
