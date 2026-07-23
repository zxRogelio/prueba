import {
  getSalesPredictions,
  SalesPredictionServiceError,
} from "../../services/salesPredictionService.js";

export async function getAdminSalesPredictions(req, res) {
  const refresh = String(req.query.refresh || "").toLowerCase() === "true";

  try {
    const predictions = await getSalesPredictions({ refresh });
    return res.json(predictions);
  } catch (error) {
    if (error instanceof SalesPredictionServiceError) {
      return res.status(error.statusCode).json({ error: error.message });
    }

    console.error("Error en prediccion administrativa de ventas:", error);
    return res.status(500).json({
      error: "No se pudieron calcular las predicciones de ventas.",
    });
  }
}
