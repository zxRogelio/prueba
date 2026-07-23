import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  FaArrowTrendUp,
  FaArrowsRotate,
  FaBoxesStacked,
  FaChartLine,
  FaCircleInfo,
  FaEye,
  FaFilter,
  FaTableList,
  FaXmark,
  FaTriangleExclamation,
} from "react-icons/fa6";
import {
  fetchSalesPredictions,
  type DemandStatus,
  type SalesPredictionProduct,
  type SalesPredictionsResponse,
} from "../../services/admin/salesPredictionService";
import styles from "./AdminSalesPredictionPage.module.css";

type HistoryWindow = "4" | "8" | "12";
type DetailChartView = "sales" | "views" | "stock";

const MONTHLY_FORECAST_LABEL = "Proximo mes";
const DETAIL_FORECAST_LABEL = "Por mes";

const historyOptions: Array<{ value: HistoryWindow; label: string }> = [
  { value: "4", label: "Ultimos 4 meses" },
  { value: "8", label: "Ultimos 8 meses" },
  { value: "12", label: "Ultimos 12 meses" },
];

const currencyFormatter = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  maximumFractionDigits: 0,
});

function statusClassName(status: DemandStatus) {
  if (status === "Alta demanda") return styles.statusHigh;
  if (status === "Demanda media") return styles.statusMedium;
  return styles.statusLow;
}

function getErrorMessage(error: unknown) {
  if (typeof error === "object" && error !== null && "response" in error) {
    const responseError = error as {
      response?: { data?: { error?: string } };
      message?: string;
    };
    return (
      responseError.response?.data?.error ||
      responseError.message ||
      "No se pudieron cargar las predicciones."
    );
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "No se pudieron cargar las predicciones.";
}

function addMonths(month: string, offset: number) {
  const [year, monthNumber] = month.split("-").map(Number);
  const date = new Date(Date.UTC(year, monthNumber - 1 + offset, 1));
  return date.toISOString().slice(0, 7);
}

function buildMonthLabels(cutoffMonth: string | undefined, count: number) {
  if (!cutoffMonth) {
    return Array.from({ length: count }, (_value, index) => `Mes ${index + 1}`);
  }

  const firstMonth = addMonths(cutoffMonth, -(count - 1));
  return Array.from({ length: count }, (_value, index) =>
    addMonths(firstMonth, index),
  );
}

function buildTrendChartData(
  product: SalesPredictionProduct | null,
  historyLength: number,
  cutoffMonth?: string,
  predictionMonth?: string,
) {
  if (!product) return [];

  const history = product.history.slice(-historyLength);
  const labels = buildMonthLabels(cutoffMonth, history.length);
  const data: Array<{
    period: string;
    ventas: number | null;
    prediccion: number | null;
  }> = history.map((value, index) => ({
    period: labels[index],
    ventas: value,
    prediccion: null,
  }));

  data.push({
    period: predictionMonth ? `Pred. ${predictionMonth}` : "Prediccion",
    ventas: null,
    prediccion: product.monthlyPrediction,
  });

  return data;
}

function buildMonthlySalesChartData(
  product: SalesPredictionProduct,
  historyLength: number,
  cutoffMonth?: string,
) {
  const history = product.history.slice(-historyLength);
  const labels = buildMonthLabels(cutoffMonth, history.length);

  return history.map((value, index) => ({
    month: labels[index],
    ventas: value,
  }));
}

function buildMonthlyViewsChartData(
  product: SalesPredictionProduct,
  cutoffMonth?: string,
) {
  const labels = buildMonthLabels(cutoffMonth, product.viewsHistory.length);

  return product.viewsHistory.map((value, index) => ({
    month: labels[index],
    vistas: value,
  }));
}

export default function AdminSalesPredictionPage() {
  const [historyWindow, setHistoryWindow] = useState<HistoryWindow>("8");
  const [categoryFilter, setCategoryFilter] = useState("Todas");
  const [brandFilter, setBrandFilter] = useState("Todas");
  const [selectedProductId, setSelectedProductId] = useState("");
  const [detailProductId, setDetailProductId] = useState<number | null>(null);
  const [detailChartView, setDetailChartView] =
    useState<DetailChartView>("sales");
  const [data, setData] = useState<SalesPredictionsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPredictions = useCallback(async (refresh = false) => {
    if (refresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError(null);

    try {
      const response = await fetchSalesPredictions(refresh);
      setData(response);
    } catch (loadError) {
      setError(getErrorMessage(loadError));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadPredictions(false);
  }, [loadPredictions]);

  const rows = useMemo(() => data?.products ?? [], [data]);
  const historyLength = Number(historyWindow);

  useEffect(() => {
    if (rows.length === 0) {
      if (selectedProductId) setSelectedProductId("");
      return;
    }

    const selectedStillExists = rows.some(
      (row) => String(row.id) === selectedProductId,
    );

    if (!selectedStillExists) {
      setSelectedProductId(String(rows[0].id));
    }
  }, [rows, selectedProductId]);

  const categories = useMemo(
    () => ["Todas", ...Array.from(new Set(rows.map((item) => item.category)))],
    [rows],
  );
  const brands = useMemo(
    () => ["Todas", ...Array.from(new Set(rows.map((item) => item.brand)))],
    [rows],
  );

  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      const matchesCategory =
        categoryFilter === "Todas" || row.category === categoryFilter;
      const matchesBrand = brandFilter === "Todas" || row.brand === brandFilter;

      return matchesCategory && matchesBrand;
    });
  }, [brandFilter, categoryFilter, rows]);

  const selectedProduct =
    rows.find((product) => String(product.id) === selectedProductId) ??
    rows[0] ??
    null;
  const detailProduct = detailProductId
    ? rows.find((product) => product.id === detailProductId) ?? null
    : null;
  const detailPrediction = detailProduct ? detailProduct.monthlyPrediction : 0;
  const detailStockRisk = detailProduct
    ? detailPrediction > detailProduct.stock
    : false;

  const trendChartData = buildTrendChartData(
    selectedProduct,
    historyLength,
    data?.cutoffMonth,
    data?.predictionMonth,
  );

  const topDemandData = [...filteredRows]
    .sort((left, right) => right.monthlyPrediction - left.monthlyPrediction)
    .slice(0, 6)
    .map((row) => ({
      product: row.name.length > 18 ? `${row.name.slice(0, 18)}...` : row.name,
      prediccion: row.monthlyPrediction,
    }));

  const estimatedUnits = filteredRows.reduce(
    (sum, row) => sum + row.monthlyPrediction,
    0,
  );
  const estimatedRevenue = filteredRows.reduce(
    (sum, row) => sum + row.monthlyPrediction * row.price,
    0,
  );
  const highDemandCount = filteredRows.filter(
    (row) => row.status === "Alta demanda",
  ).length;
  const stockRiskCount = filteredRows.filter((row) => row.stockRisk).length;
  const detailMonthlySalesData = detailProduct
    ? buildMonthlySalesChartData(detailProduct, historyLength, data?.cutoffMonth)
    : [];
  const detailMonthlyViewsData = detailProduct
    ? buildMonthlyViewsChartData(detailProduct, data?.cutoffMonth)
    : [];

  return (
    <section className={styles.page}>
      <header className={styles.hero}>
        <div className={styles.heroContent}>
          <div>
            <span className={styles.heroBadge}>Modelo real</span>
            <h1>Prediccion de ventas</h1>
            <p>
              Predice las unidades que podrian venderse el proximo mes
              utilizando el historial de ventas y las vistas de cada producto.
            </p>
          </div>

          <div className={styles.heroActions}>
            <button
              type="button"
              className={styles.secondaryBtn}
              onClick={() => void loadPredictions(false)}
              disabled={loading || refreshing}
            >
              <FaArrowsRotate />
              Reintentar
            </button>
            <button
              type="button"
              className={styles.refreshBtn}
              onClick={() => void loadPredictions(true)}
              disabled={loading || refreshing}
            >
              <FaArrowsRotate />
              {refreshing ? "Actualizando" : "Actualizar predicciones"}
            </button>
          </div>
        </div>

        {data && (
          <div className={styles.heroMeta}>
            <span>Mes de corte: {data.cutoffMonth}</span>
            <span>Mes pronosticado: {data.predictionMonth}</span>
            <span>Modelo: {data.model ?? "No disponible"}</span>
            <span>Generado: {new Date(data.generatedAt).toLocaleString("es-MX")}</span>
          </div>
        )}
      </header>

      <section className={styles.warningBanner} aria-label="Advertencia">
        <FaCircleInfo />
        <p>
          Las predicciones son estimaciones y deben utilizarse como apoyo para la
          planeacion de inventario.
        </p>
      </section>

      {error && (
        <section className={styles.messagePanel} role="alert">
          <FaTriangleExclamation />
          <div>
            <strong>No se pudieron cargar las predicciones</strong>
            <p>{error}</p>
          </div>
          <button
            type="button"
            className={styles.refreshBtn}
            onClick={() => void loadPredictions(true)}
            disabled={loading || refreshing}
          >
            <FaArrowsRotate />
            Reintentar
          </button>
        </section>
      )}

      <section className={styles.filtersPanel} aria-label="Filtros de prediccion">
        <div className={styles.sectionTitle}>
          <span>
            <FaFilter />
          </span>
          <div>
            <h2>Filtros de visualizacion</h2>
            <p>
              Los meses seleccionados solo cambian las graficas; el modelo usa
              siempre sus ventanas entrenadas.
            </p>
          </div>
        </div>

        <div className={styles.filtersGrid}>
          <label className={styles.field}>
            <span>Meses mostrados en la grafica</span>
            <select
              value={historyWindow}
              onChange={(event) =>
                setHistoryWindow(event.target.value as HistoryWindow)
              }
            >
              {historyOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className={styles.field}>
            <span>Categoria</span>
            <select
              value={categoryFilter}
              onChange={(event) => setCategoryFilter(event.target.value)}
            >
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </label>

          <label className={styles.field}>
            <span>Marca</span>
            <select
              value={brandFilter}
              onChange={(event) => setBrandFilter(event.target.value)}
            >
              {brands.map((brand) => (
                <option key={brand} value={brand}>
                  {brand}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      {loading && !data && (
        <section className={styles.messagePanel} aria-live="polite">
          <FaArrowsRotate />
          <div>
            <strong>Cargando predicciones</strong>
            <p>Consultando ventas, vistas y modelo de regresion.</p>
          </div>
        </section>
      )}

      {!loading && rows.length === 0 && (
        <section className={styles.messagePanel}>
          <FaCircleInfo />
          <div>
            <strong>Sin productos para predecir</strong>
            <p>No se encontraron productos activos con identificador publico.</p>
          </div>
        </section>
      )}

      {rows.length > 0 && (
        <>
          <section className={styles.kpiGrid} aria-label="Resumen de prediccion">
            <article className={styles.kpiCard}>
              <span className={styles.kpiIcon}>
                <FaChartLine />
              </span>
              <div>
                <span>Ventas estimadas</span>
                <strong>{estimatedUnits} unidades</strong>
                <small>{MONTHLY_FORECAST_LABEL}</small>
              </div>
            </article>

            <article className={styles.kpiCard}>
              <span className={styles.kpiIcon}>
                <FaArrowTrendUp />
              </span>
              <div>
                <span>Ingreso estimado</span>
                <strong>{currencyFormatter.format(estimatedRevenue)}</strong>
                <small>Segun precio actual</small>
              </div>
            </article>

            <article className={styles.kpiCard}>
              <span className={styles.kpiIcon}>
                <FaBoxesStacked />
              </span>
              <div>
                <span>Alta demanda</span>
                <strong>{highDemandCount} productos</strong>
                <small>Prediccion del modelo</small>
              </div>
            </article>

            <article className={styles.kpiCard}>
              <span className={styles.kpiIcon}>
                <FaTriangleExclamation />
              </span>
              <div>
                <span>Riesgo de stock</span>
                <strong>{stockRiskCount} productos</strong>
                <small>Prediccion supera inventario</small>
              </div>
            </article>
          </section>

          <section className={styles.chartGrid}>
            <article className={styles.panel}>
              <div className={styles.panelHeader}>
                <div className={styles.sectionTitle}>
                  <span>
                    <FaChartLine />
                  </span>
                  <div>
                    <h2>Historial vs prediccion</h2>
                    <p>Linea historica y valor estimado por el modelo.</p>
                  </div>
                </div>

                <label className={styles.compactField}>
                  <span>Producto</span>
                  <select
                    value={selectedProductId}
                    onChange={(event) => setSelectedProductId(event.target.value)}
                  >
                    {rows.map((row) => (
                      <option key={row.id} value={row.id}>
                        {row.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className={styles.chartBox}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="period" />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="ventas"
                      name="Ventas reales"
                      stroke="#111827"
                      strokeWidth={3}
                      dot={{ r: 4 }}
                      connectNulls={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="prediccion"
                      name="Prediccion"
                      stroke="#ef4444"
                      strokeWidth={3}
                      strokeDasharray="6 6"
                      dot={{ r: 5 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </article>

            <article className={styles.panel}>
              <div className={styles.sectionTitle}>
                <span>
                  <FaArrowTrendUp />
                </span>
                <div>
                  <h2>Productos con mayor demanda futura</h2>
                  <p>Ranking mensual estimado.</p>
                </div>
              </div>

              <div className={styles.chartBox}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topDemandData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="product" interval={0} tick={{ fontSize: 11 }} />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Bar
                      dataKey="prediccion"
                      name="Unidades estimadas"
                      radius={[8, 8, 0, 0]}
                    >
                      {topDemandData.map((entry) => (
                        <Cell key={entry.product} fill="#ef4444" />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </article>
          </section>

          <section className={styles.panel}>
            <div className={styles.sectionTitle}>
              <span>
                <FaTableList />
              </span>
              <div>
                <h2>Productos analizados</h2>
                <p>
                  Selecciona un producto para revisar su prediccion individual.
                </p>
              </div>
            </div>

            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>
                      <span className={styles.columnHeader}>
                        <FaTableList />
                        Producto
                      </span>
                    </th>
                    <th>
                      <span className={styles.columnHeader}>
                        <FaBoxesStacked />
                        Categoria
                      </span>
                    </th>
                    <th>
                      <span className={styles.columnHeader}>
                        <FaBoxesStacked />
                        Stock
                      </span>
                    </th>
                    <th>
                      <span className={styles.columnHeader}>
                        <FaChartLine />
                        Prediccion
                      </span>
                    </th>
                    <th>
                      <span className={styles.columnHeader}>
                        <FaArrowTrendUp />
                        Estado
                      </span>
                    </th>
                    <th>
                      <span className={styles.columnHeader}>
                        <FaTriangleExclamation />
                        Accion
                      </span>
                    </th>
                    <th>
                      <span className={styles.columnHeader}>
                        <FaEye />
                        Detalle
                      </span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.length === 0 ? (
                    <tr>
                      <td colSpan={7}>
                        <strong>No hay productos con esos filtros.</strong>
                        <span>Ajusta categoria o marca para volver a ver resultados.</span>
                      </td>
                    </tr>
                  ) : (
                    filteredRows.map((row) => (
                      <tr key={row.id}>
                        <td>
                          <strong>{row.name}</strong>
                          <span>
                            {row.brand} - {row.type}
                          </span>
                        </td>
                        <td>{row.category}</td>
                        <td>{row.stock} unidades</td>
                        <td>
                          <strong>{row.monthlyPrediction} unidades</strong>
                          <span>{row.predictionDecimal.toFixed(2)} decimales</span>
                        </td>
                        <td>
                          <span
                            className={`${styles.statusPill} ${statusClassName(
                              row.status,
                            )}`}
                          >
                            {row.status}
                          </span>
                          <span
                            className={row.trendPercent >= 0 ? styles.up : styles.down}
                          >
                            {row.trendPercent >= 0 ? "+" : ""}
                            {row.trendPercent}% vs corte
                          </span>
                          {row.insufficientHistory && (
                            <span>Historial incompleto</span>
                          )}
                        </td>
                        <td>
                          <span
                            className={`${styles.actionPill} ${
                              row.stockRisk ? styles.actionRisk : ""
                            }`}
                          >
                            {row.action}
                          </span>
                        </td>
                        <td>
                          <button
                            type="button"
                            className={styles.detailBtn}
                            onClick={() => {
                              setDetailProductId(row.id);
                              setDetailChartView("sales");
                            }}
                          >
                            <FaEye />
                            Ver detalle
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}

      {detailProduct && (
        <div
          className={styles.modalOverlay}
          role="presentation"
          onClick={() => setDetailProductId(null)}
        >
          <section
            className={styles.detailModal}
            role="dialog"
            aria-modal="true"
            aria-labelledby="prediction-detail-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className={styles.detailHeader}>
              <div>
                <span>{detailProduct.category}</span>
                <h2 id="prediction-detail-title">{detailProduct.name}</h2>
                <p>{detailProduct.brand}</p>
              </div>
              <button
                type="button"
                className={styles.closeBtn}
                onClick={() => setDetailProductId(null)}
                aria-label="Cerrar detalle"
              >
                <FaXmark />
              </button>
            </div>

            <div className={styles.detailStats}>
              <article>
                <span>Stock actual</span>
                <strong>{detailProduct.stock}</strong>
              </article>
              <article>
                <span>Prediccion</span>
                <strong>{detailPrediction}</strong>
              </article>
              <article>
                <span>Ventas corte</span>
                <strong>{detailProduct.ventasMesAnterior}</strong>
              </article>
              <article>
                <span>Vistas corte</span>
                <strong>{detailProduct.vistasMesAnterior}</strong>
              </article>
            </div>

            <div className={styles.detailChartBlock}>
              <div className={styles.detailChartTitle}>
                <strong>
                  {detailChartView === "sales"
                    ? "Cantidad de ventas por mes"
                    : detailChartView === "views"
                      ? "Vistas de producto"
                      : "Stock actual vs prediccion"}
                </strong>
                <span>
                  {detailChartView === "sales"
                    ? "Ventas historicas agrupadas por mes."
                    : detailChartView === "views"
                      ? "Vistas usadas para la ventana movil de tres meses."
                      : `Comparacion individual del producto seleccionado en ${DETAIL_FORECAST_LABEL.toLowerCase()}.`}
                </span>
              </div>

              <div className={styles.chartTabs} aria-label="Vista de grafica">
                <button
                  type="button"
                  className={`${styles.chartTab} ${
                    detailChartView === "sales" ? styles.chartTabActive : ""
                  }`}
                  onClick={() => setDetailChartView("sales")}
                >
                  Ventas
                </button>
                <button
                  type="button"
                  className={`${styles.chartTab} ${
                    detailChartView === "views" ? styles.chartTabActive : ""
                  }`}
                  onClick={() => setDetailChartView("views")}
                >
                  Vistas
                </button>
                <button
                  type="button"
                  className={`${styles.chartTab} ${
                    detailChartView === "stock" ? styles.chartTabActive : ""
                  }`}
                  onClick={() => setDetailChartView("stock")}
                >
                  Stock
                </button>
              </div>

              <div className={styles.detailMiniChart}>
                <ResponsiveContainer width="100%" height="100%">
                  {detailChartView === "sales" ? (
                    <BarChart data={detailMonthlySalesData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="month" />
                      <YAxis allowDecimals={false} />
                      <Tooltip />
                      <Legend />
                      <Bar
                        dataKey="ventas"
                        name="Ventas"
                        fill="#111827"
                        radius={[8, 8, 0, 0]}
                      />
                    </BarChart>
                  ) : detailChartView === "views" ? (
                    <BarChart data={detailMonthlyViewsData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="month" />
                      <YAxis allowDecimals={false} />
                      <Tooltip />
                      <Legend />
                      <Bar
                        dataKey="vistas"
                        name="Vistas"
                        fill="#ef4444"
                        radius={[8, 8, 0, 0]}
                      />
                    </BarChart>
                  ) : (
                    <BarChart
                      data={[
                        {
                          name: detailProduct.name,
                          stock: detailProduct.stock,
                          prediccion: detailPrediction,
                        },
                      ]}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="name" hide />
                      <YAxis allowDecimals={false} />
                      <Tooltip />
                      <Legend />
                      <Bar
                        dataKey="stock"
                        name="Stock actual"
                        fill="#111827"
                        radius={[8, 8, 0, 0]}
                      />
                      <Bar
                        dataKey="prediccion"
                        name="Prediccion"
                        fill={detailStockRisk ? "#ef4444" : "#22c55e"}
                        radius={[8, 8, 0, 0]}
                      />
                    </BarChart>
                  )}
                </ResponsiveContainer>
              </div>
            </div>

            <div className={styles.detailNote}>
              <p>
                {detailStockRisk
                  ? "La prediccion supera el stock actual. Conviene revisar reabastecimiento."
                  : "El stock actual cubre la prediccion mensual estimada."}
              </p>
              {detailProduct.insufficientHistory && (
                <p>{detailProduct.warnings[0]}</p>
              )}
            </div>
          </section>
        </div>
      )}
    </section>
  );
}
