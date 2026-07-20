import {
  createMercadoPagoCheckout,
  processMercadoPagoWebhook,
} from "../services/mercadoPagoCheckoutService.js";

function handleControllerError(res, error, fallbackMessage) {
  const statusCode = error.statusCode || 500;

  if (statusCode >= 500) {
    console.error(fallbackMessage, error);
  }

  return res.status(statusCode).json({
    ok: false,
    error: error.message || fallbackMessage,
  });
}

export async function createMercadoPagoCheckoutPreference(req, res) {
  try {
    const result = await createMercadoPagoCheckout({
      userId: req.user.id,
      payload: req.body || {},
    });

    return res.status(201).json({
      ok: true,
      ...result,
    });
  } catch (error) {
    return handleControllerError(
      res,
      error,
      "Error creando checkout de Mercado Pago"
    );
  }
}

export async function receiveMercadoPagoWebhook(req, res) {
  try {
    const result = await processMercadoPagoWebhook({
      headers: req.headers,
      query: req.query,
      body: req.body || {},
    });

    return res.status(200).json({
      ok: true,
      processed: Boolean(result.ok),
      duplicate: Boolean(result.duplicate),
      ignored: Boolean(result.ignored),
      processingStatus: result.event?.processingStatus || null,
      error: result.error?.message || null,
    });
  } catch (error) {
    return handleControllerError(
      res,
      error,
      "Error procesando webhook de Mercado Pago"
    );
  }
}
