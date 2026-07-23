import { Product } from "../models/index.js";
import { createBehaviorEventSafely } from "../services/behaviorEventService.js";

const PRODUCT_VIEW_EVENT_TYPE = "product_view";
const PRODUCT_ENTITY_TYPE = "product";
const PRODUCT_VIEW_SOURCE = "catalog_product_detail";
const VISITOR_ID_MAX_LENGTH = 160;
const PATH_MAX_LENGTH = 500;

function normalizeProductId(value) {
  if (typeof value === "number") {
    return Number.isSafeInteger(value) && value > 0 ? value : null;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!/^\d+$/.test(trimmed)) return null;

    const numericValue = Number(trimmed);
    return Number.isSafeInteger(numericValue) && numericValue > 0
      ? numericValue
      : null;
  }

  return null;
}

function normalizeRequiredString(value, fieldName, maxLength) {
  if (typeof value !== "string") {
    return { error: `${fieldName} es obligatorio.` };
  }

  const normalized = value.trim();

  if (!normalized) {
    return { error: `${fieldName} es obligatorio.` };
  }

  if (normalized.length > maxLength) {
    return {
      error: `${fieldName} no debe superar ${maxLength} caracteres.`,
    };
  }

  return { value: normalized };
}

export const recordProductView = async (req, res) => {
  try {
    const productId = normalizeProductId(req.body?.productId);

    if (!productId) {
      return res.status(400).json({ error: "productId invalido." });
    }

    const visitorId = normalizeRequiredString(
      req.body?.visitorId,
      "visitorId",
      VISITOR_ID_MAX_LENGTH
    );

    if (visitorId.error) {
      return res.status(400).json({ error: visitorId.error });
    }

    const path = normalizeRequiredString(
      req.body?.path,
      "path",
      PATH_MAX_LENGTH
    );

    if (path.error) {
      return res.status(400).json({ error: path.error });
    }

    const product = await Product.findOne({
      attributes: ["id_producto"],
      where: { id_producto: productId, status: "Activo" },
    });

    if (!product) {
      return res.status(404).json({ error: "Producto no encontrado." });
    }

    const event = await createBehaviorEventSafely({
      userId: req.user?.id || null,
      sessionId: req.authSession?.id || null,
      eventType: PRODUCT_VIEW_EVENT_TYPE,
      entityType: PRODUCT_ENTITY_TYPE,
      entityId: product.id_producto,
      source: PRODUCT_VIEW_SOURCE,
      metadata: {
        visitorId: visitorId.value,
        path: path.value,
        platform: "web",
      },
    });

    if (!event) {
      return res
        .status(500)
        .json({ error: "No se pudo registrar la vista del producto." });
    }

    return res.status(201).json({ ok: true, eventId: event.id });
  } catch (error) {
    console.error("recordProductView error:", error);
    return res.status(500).json({
      error: "Error registrando vista de producto.",
      details: error.message,
    });
  }
};
