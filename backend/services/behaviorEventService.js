import { sequelize } from "../config/sequelize.js";
import {
  BEHAVIOR_ENTITY_TYPES,
  BEHAVIOR_EVENT_TYPES,
  BehaviorEvent,
} from "../models/BehaviorEvent.js";

const MAX_METADATA_DEPTH = 4;
const MAX_ARRAY_ITEMS = 25;
const MAX_OBJECT_KEYS = 50;
const MAX_STRING_LENGTH = 500;

const sensitiveKeyPattern =
  /(token|secret|password|contrase(?:n|ñ)a|cvv|cvc|card|tarjeta|bank|banco|account|cuenta|clabe|ip|address|direccion|direcci(?:o|ó)n)/i;

function truncateString(value, maxLength) {
  const stringValue = String(value);
  return stringValue.length > maxLength
    ? stringValue.slice(0, maxLength)
    : stringValue;
}

function normalizeNullableString(value, maxLength) {
  if (value == null) return null;

  const normalized = truncateString(value, maxLength).trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizeQuantity(quantity) {
  if (quantity == null) return null;

  const normalized = Number(quantity);

  if (!Number.isInteger(normalized) || normalized < 0) {
    throw new Error("BehaviorEvent.quantity debe ser entero no negativo.");
  }

  return normalized;
}

function sanitizeMetadataValue(value, depth = 0) {
  if (value == null) return value;

  if (depth >= MAX_METADATA_DEPTH) {
    return null;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (Array.isArray(value)) {
    return value
      .slice(0, MAX_ARRAY_ITEMS)
      .map((item) => sanitizeMetadataValue(item, depth + 1))
      .filter((item) => item !== undefined);
  }

  if (typeof value === "object") {
    const sanitized = {};
    const entries = Object.entries(value).slice(0, MAX_OBJECT_KEYS);

    for (const [key, nestedValue] of entries) {
      if (sensitiveKeyPattern.test(key)) {
        continue;
      }

      const sanitizedValue = sanitizeMetadataValue(nestedValue, depth + 1);

      if (sanitizedValue !== undefined) {
        sanitized[key] = sanitizedValue;
      }
    }

    return sanitized;
  }

  if (typeof value === "string") {
    return truncateString(value, MAX_STRING_LENGTH);
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === "boolean") {
    return value;
  }

  return null;
}

export function sanitizeBehaviorMetadata(metadata) {
  if (metadata == null) return null;

  if (typeof metadata !== "object") {
    return null;
  }

  return sanitizeMetadataValue(metadata);
}

function buildPayload(event) {
  const eventType = normalizeNullableString(event.eventType, 80);
  const entityType = normalizeNullableString(event.entityType, 80);

  if (!BEHAVIOR_EVENT_TYPES.includes(eventType)) {
    throw new Error(`BehaviorEvent.eventType invalido: ${eventType}`);
  }

  if (entityType && !BEHAVIOR_ENTITY_TYPES.includes(entityType)) {
    throw new Error(`BehaviorEvent.entityType invalido: ${entityType}`);
  }

  return {
    userId: event.userId || null,
    sessionId: event.sessionId || null,
    eventType,
    entityType,
    entityId: normalizeNullableString(event.entityId, 160),
    source: normalizeNullableString(event.source, 80),
    quantity: normalizeQuantity(event.quantity),
    metadata: sanitizeBehaviorMetadata(event.metadata),
  };
}

async function createWithOptionalSavepoint(payload, transaction) {
  if (!transaction) {
    return BehaviorEvent.create(payload);
  }

  return sequelize.transaction({ transaction }, async (nestedTransaction) => {
    return BehaviorEvent.create(payload, {
      transaction: nestedTransaction,
    });
  });
}

function logBehaviorEventFailure(error) {
  console.warn("No se pudo registrar BehaviorEvent:", error.message);
}

export async function createBehaviorEventSafely(
  event,
  { transaction = null } = {}
) {
  try {
    const payload = buildPayload(event);
    return await createWithOptionalSavepoint(payload, transaction);
  } catch (error) {
    logBehaviorEventFailure(error);
    return null;
  }
}

export function recordBehaviorEvent(event) {
  setImmediate(() => {
    void createBehaviorEventSafely(event);
  });

  return true;
}
