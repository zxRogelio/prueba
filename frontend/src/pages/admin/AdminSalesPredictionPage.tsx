import { useMemo, useState } from "react";
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
  FaBoxesStacked,
  FaChartLine,
  FaEye,
  FaFilter,
  FaTableList,
  FaXmark,
  FaTriangleExclamation,
} from "react-icons/fa6";
import styles from "./AdminSalesPredictionPage.module.css";

type HistoryWindow = "4" | "8" | "12";
type DemandStatus = "Alta demanda" | "Demanda media" | "Baja demanda";
type DetailChartView = "sales" | "stock";

type SalesProduct = {
  id: string;
  name: string;
  category: string;
  brand: string;
  type: string;
  price: number;
  stock: number;
  cartAdds: number;
  promotion: boolean;
  history: number[];
};

type PredictionRow = SalesProduct & {
  monthlyPrediction: number;
  periodPrediction: number;
  status: DemandStatus;
  stockRisk: boolean;
  action: string;
  trendPercent: number;
};

const MONTHLY_FORECAST_MULTIPLIER = 1;
const MONTHLY_FORECAST_LABEL = "Proximo mes";
const DETAIL_FORECAST_LABEL = "Por mes";

const historyOptions: Array<{ value: HistoryWindow; label: string }> = [
  { value: "4", label: "Ultimos 4 meses" },
  { value: "8", label: "Ultimos 8 meses" },
  { value: "12", label: "Ultimos 12 meses" },
];

const demoProducts: SalesProduct[] = [
  {
    id: "prd-001",
    name: "Proteina Whey Vainilla",
    category: "Suplementos",
    brand: "Optimum Nutrition",
    type: "Suplementacion",
    price: 899,
    stock: 16,
    cartAdds: 88,
    promotion: false,
    history: [7, 8, 9, 11, 12, 13, 14, 15, 17, 18, 19, 21],
  },
  {
    id: "prd-002",
    name: "Creatina Monohidratada 300 g",
    category: "Suplementos",
    brand: "Titanium",
    type: "Suplementacion",
    price: 449,
    stock: 20,
    cartAdds: 73,
    promotion: true,
    history: [5, 6, 7, 7, 9, 9, 10, 11, 12, 13, 14, 15],
  },
  {
    id: "prd-003",
    name: "Pre-entreno C4 Ripped",
    category: "Suplementos",
    brand: "Cellucor",
    type: "Suplementacion",
    price: 649,
    stock: 8,
    cartAdds: 54,
    promotion: false,
    history: [4, 6, 5, 7, 7, 8, 9, 10, 12, 12, 13, 15],
  },
  {
    id: "prd-004",
    name: "Playera Training Dry Fit",
    category: "Ropa deportiva",
    brand: "Titanium",
    type: "Ropa",
    price: 988,
    stock: 10,
    cartAdds: 44,
    promotion: false,
    history: [6, 5, 7, 8, 8, 9, 9, 10, 10, 12, 12, 13],
  },
  {
    id: "prd-005",
    name: "Short Deportivo Performance",
    category: "Ropa deportiva",
    brand: "Titanium",
    type: "Ropa",
    price: 499,
    stock: 11,
    cartAdds: 39,
    promotion: true,
    history: [3, 4, 4, 5, 6, 7, 7, 8, 8, 9, 10, 10],
  },
  {
    id: "prd-006",
    name: "Shaker Titanium 700 ml",
    category: "Accesorios",
    brand: "Titanium",
    type: "Accesorio",
    price: 179,
    stock: 35,
    cartAdds: 62,
    promotion: false,
    history: [8, 9, 9, 10, 10, 11, 12, 12, 13, 15, 16, 17],
  },
  {
    id: "prd-007",
    name: "Guantes de Gimnasio",
    category: "Accesorios",
    brand: "Titanium",
    type: "Accesorio",
    price: 259,
    stock: 7,
    cartAdds: 26,
    promotion: false,
    history: [4, 4, 5, 5, 6, 6, 6, 7, 7, 8, 8, 9],
  },
  {
    id: "prd-008",
    name: "Multivitaminico Fitness",
    category: "Suplementos",
    brand: "Universal",
    type: "Suplementacion",
    price: 289,
    stock: 28,
    cartAdds: 31,
    promotion: false,
    history: [6, 5, 6, 6, 7, 7, 6, 7, 8, 8, 9, 9],
  },
];

const currencyFormatter = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  maximumFractionDigits: 0,
});

function linearRegressionPrediction(values: number[]) {
  const n = values.length;
  const sumX = values.reduce((sum, _value, index) => sum + index + 1, 0);
  const sumY = values.reduce((sum, value) => sum + value, 0);
  const sumXY = values.reduce(
    (sum, value, index) => sum + (index + 1) * value,
    0,
  );
  const sumX2 = values.reduce((sum, _value, index) => sum + (index + 1) ** 2, 0);
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX ** 2);
  const intercept = (sumY - slope * sumX) / n;

  return Math.max(0, Math.round(intercept + slope * (n + 1)));
}

function conservativeMonthlyPrediction(values: number[]) {
  const regressionPrediction = linearRegressionPrediction(values);
  const recentValues = values.slice(-3);
  const recentAverage =
    recentValues.reduce((sum, value) => sum + value, 0) /
    Math.max(recentValues.length, 1);
  const previousValue = values.at(-1) ?? recentAverage;
  const blendedPrediction = Math.round(
    recentAverage * 0.7 + regressionPrediction * 0.3,
  );
  const maxGrowth = Math.ceil(previousValue * 1.2);
  const maxDrop = Math.floor(previousValue * 0.75);

  return Math.max(0, Math.min(maxGrowth, Math.max(maxDrop, blendedPrediction)));
}

function getDemandStatus(monthlyPrediction: number): DemandStatus {
  if (monthlyPrediction >= 18) return "Alta demanda";
  if (monthlyPrediction >= 10) return "Demanda media";
  return "Baja demanda";
}

function getAction(row: SalesProduct, periodPrediction: number) {
  if (periodPrediction > row.stock) return "Reabastecer inventario";
  if (periodPrediction < row.stock * 0.35) return "Evaluar promocion";
  return "Mantener seguimiento";
}

function getTrendPercent(values: number[], prediction: number) {
  const previous = values.at(-1) ?? 1;
  return Math.round(((prediction - previous) / Math.max(previous, 1)) * 100);
}

export default function AdminSalesPredictionPage() {
  const [historyWindow, setHistoryWindow] = useState<HistoryWindow>("8");
  const [categoryFilter, setCategoryFilter] = useState("Todas");
  const [brandFilter, setBrandFilter] = useState("Todas");
  const [selectedProductId, setSelectedProductId] = useState(demoProducts[0].id);
  const [detailProductId, setDetailProductId] = useState<string | null>(null);
  const [detailChartView, setDetailChartView] =
    useState<DetailChartView>("sales");

  const historyLength = Number(historyWindow);

  const categories = useMemo(
    () => ["Todas", ...Array.from(new Set(demoProducts.map((item) => item.category)))],
    [],
  );
  const brands = useMemo(
    () => ["Todas", ...Array.from(new Set(demoProducts.map((item) => item.brand)))],
    [],
  );

  const rows = useMemo<PredictionRow[]>(() => {
    return demoProducts.map((product) => {
      const history = product.history.slice(-historyLength);
      const monthlyPrediction = conservativeMonthlyPrediction(history);
      const periodPrediction = monthlyPrediction * MONTHLY_FORECAST_MULTIPLIER;
      const status = getDemandStatus(periodPrediction);

      return {
        ...product,
        monthlyPrediction,
        periodPrediction,
        status,
        stockRisk: periodPrediction > product.stock,
        action: getAction(product, periodPrediction),
        trendPercent: getTrendPercent(history, monthlyPrediction),
      };
    });
  }, [historyLength]);

  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      const matchesCategory =
        categoryFilter === "Todas" || row.category === categoryFilter;
      const matchesBrand = brandFilter === "Todas" || row.brand === brandFilter;

      return matchesCategory && matchesBrand;
    });
  }, [brandFilter, categoryFilter, rows]);

  const visibleRows = filteredRows.length ? filteredRows : rows;
  const selectedProduct =
    rows.find((product) => product.id === selectedProductId) ?? rows[0];
  const detailProduct = detailProductId
    ? rows.find((product) => product.id === detailProductId) ?? null
    : null;
  const detailPrediction = detailProduct ? detailProduct.periodPrediction : 0;
  const detailStockRisk = detailProduct
    ? detailPrediction > detailProduct.stock
    : false;

  const buildTrendChartData = (
    product: PredictionRow,
    prediction = product.periodPrediction,
  ) => {
    const history = product.history.slice(-historyLength);
    const data: Array<{
      period: string;
      ventas: number | null;
      prediccion: number | null;
    }> = history.map((value, index) => ({
      period: `M${index + 1}`,
      ventas: value,
      prediccion: null,
    }));

    data.push({
      period: "Mes estimado",
      ventas: null,
      prediccion: prediction,
    });

    return data;
  };

  const buildMonthlySalesChartData = (product: PredictionRow) => {
    const history = product.history.slice(-historyLength);

    return history.map((value, index) => ({
      month: `Mes ${index + 1}`,
      ventas: value,
    }));
  };

  const trendChartData: Array<{
    period: string;
    ventas: number | null;
    prediccion: number | null;
  }> = buildTrendChartData(selectedProduct);

  const topDemandData = [...visibleRows]
    .sort((left, right) => right.periodPrediction - left.periodPrediction)
    .slice(0, 6)
    .map((row) => ({
      product: row.name.length > 18 ? `${row.name.slice(0, 18)}...` : row.name,
      prediccion: row.periodPrediction,
    }));

  const estimatedUnits = visibleRows.reduce(
    (sum, row) => sum + row.periodPrediction,
    0,
  );
  const estimatedRevenue = visibleRows.reduce(
    (sum, row) => sum + row.periodPrediction * row.price,
    0,
  );
  const highDemandCount = visibleRows.filter(
    (row) => row.status === "Alta demanda",
  ).length;
  const stockRiskCount = visibleRows.filter((row) => row.stockRisk).length;
  const detailMonthlySalesData = detailProduct
    ? buildMonthlySalesChartData(detailProduct)
    : [];

  return (
    <section className={styles.page}>
      <header className={styles.hero}>
        <div>
          <span className={styles.heroBadge}>Regresion simulada</span>
          <h1>Prediccion de ventas</h1>
          <p>
            Estima la demanda futura por producto usando historial de ventas,
            stock, precio, categoria, marca y senales de carrito. Esta vista es
            una simulacion completa en frontend.
          </p>
        </div>
      </header>

      <section className={styles.filtersPanel} aria-label="Filtros de prediccion">
        <div className={styles.sectionTitle}>
          <span>
            <FaFilter />
          </span>
          <div>
            <h2>Filtros por historial</h2>
            <p>Configura la ventana mensual para estimar el proximo mes.</p>
          </div>
        </div>

        <div className={styles.filtersGrid}>
          <label className={styles.field}>
            <span>Datos historicos</span>
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
            <small>Con tendencia positiva</small>
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
                <p>Linea historica y valor estimado por regresion.</p>
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
                <Bar dataKey="prediccion" name="Unidades estimadas" radius={[8, 8, 0, 0]}>
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
            <p>Selecciona un producto para revisar su prediccion individual.</p>
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
                    Precio
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
              {visibleRows.map((row) => (
                <tr key={row.id}>
                  <td>
                    <strong>{row.name}</strong>
                    <span>{row.brand}</span>
                  </td>
                  <td>{row.category}</td>
                  <td>{row.stock} unidades</td>
                  <td>{row.periodPrediction} unidades</td>
                  <td>{currencyFormatter.format(row.price)}</td>
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
              ))}
            </tbody>
          </table>
        </div>
      </section>

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
                <span>Precio</span>
                <strong>{currencyFormatter.format(detailProduct.price)}</strong>
              </article>
            </div>

            <div className={styles.detailChartBlock}>
              <div className={styles.detailChartTitle}>
                <strong>
                  {detailChartView === "sales"
                    ? "Cantidad de ventas por mes"
                    : "Stock actual vs prediccion"}
                </strong>
                <span>
                  {detailChartView === "sales"
                    ? "Ventas historicas agrupadas por mes."
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
                  Ventas por mes
                </button>
                <button
                  type="button"
                  className={`${styles.chartTab} ${
                    detailChartView === "stock" ? styles.chartTabActive : ""
                  }`}
                  onClick={() => setDetailChartView("stock")}
                >
                  Stock vs prediccion
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
            </div>
          </section>
        </div>
      )}
    </section>
  );
}
