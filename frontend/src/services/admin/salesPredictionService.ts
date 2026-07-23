import { API } from "../../api/api";

export type DemandStatus = "Alta demanda" | "Demanda media" | "Baja demanda";

export type SalesPredictionProduct = {
  id: number;
  productPk: number;
  name: string;
  category: string;
  brand: string;
  type: string;
  productType?: string | null;
  price: number;
  stock: number;
  history: number[];
  viewsHistory: number[];
  ventasMesAnterior: number;
  promedioVentas3Meses: number;
  promedioVentas6Meses: number;
  promedioVentas12Meses: number;
  vistasMesAnterior: number;
  promedioVistas3Meses: number;
  monthlyPrediction: number;
  predictionDecimal: number;
  status: DemandStatus;
  stockRisk: boolean;
  action: string;
  trendPercent: number;
  insufficientHistory: boolean;
  warnings: string[];
};

export type SalesPredictionsResponse = {
  predictionMonth: string;
  cutoffMonth: string;
  generatedAt: string;
  model: string | null;
  modelVersion: string | null;
  products: SalesPredictionProduct[];
  cache?: {
    hit: boolean;
    expiresAt: string | null;
  };
};

export async function fetchSalesPredictions(
  refresh = false,
): Promise<SalesPredictionsResponse> {
  const { data } = await API.get<SalesPredictionsResponse>(
    "/admin/sales-predictions",
    {
      params: refresh ? { refresh: true } : undefined,
    },
  );

  return data;
}
