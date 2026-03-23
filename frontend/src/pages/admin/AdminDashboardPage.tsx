/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  Database,
  HardDrive,
  RefreshCw,
  Search,
  Table2,
  Activity,
  Layers3,
  ArrowUpDown,
  AlertTriangle,
  Wrench,
  ScanSearch,
  KeyRound,
  ShieldCheck,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from "recharts";
import styles from "./AdminDashboardPage.module.css";
import {
  getPostgresMonitoring,
  runAnalyzeTable,
  runReindex,
  runVacuumAnalyze,
  type MonitoringResponse,
  type MonitoringFilters,
  type MaintenancePayload,
} from "../../services/admin/monitoringService";

type TabKey =
  | "overview"
  | "schemas"
  | "tables"
  | "indexes"
  | "maintenance";

const CHART_COLORS = [
  "#ef4444",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
  "#14b8a6",
];

const formatDate = (value?: string | null) => {
  if (!value) return "-";
  return new Date(value).toLocaleString();
};

const toNumber = (value: unknown) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

const formatCompactNumber = (value: number) =>
  new Intl.NumberFormat("es-MX", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);

const formatPlainNumber = (value: number) =>
  new Intl.NumberFormat("es-MX", {
    maximumFractionDigits: 0,
  }).format(value);

const formatMB = (value: number) =>
  `${new Intl.NumberFormat("es-MX", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)} MB`;

const getCacheHitStatus = (value: number) => {
  if (value >= 95) return "good";
  if (value >= 80) return "warn";
  return "bad";
};

const getDeadRowsStatus = (value: number) => {
  if (value <= 100) return "good";
  if (value <= 1000) return "warn";
  return "bad";
};

export default function AdminDashboardPage() {
  const [data, setData] = useState<MonitoringResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<TabKey>("overview");

  const [filters, setFilters] = useState<MonitoringFilters>({
    schema: "all",
    search: "",
    sortBy: "total_bytes",
    sortOrder: "desc",
    limit: 200,
  });

  const [maintenanceForm, setMaintenanceForm] = useState({
    schema: "",
    table: "",
    indexName: "",
  });
  const [maintenanceLoading, setMaintenanceLoading] = useState(false);
  const [maintenanceMessage, setMaintenanceMessage] = useState("");
  const [maintenanceError, setMaintenanceError] = useState("");

  const load = async (currentFilters = filters) => {
    setLoading(true);
    setError("");

    try {
      const response = await getPostgresMonitoring(currentFilters);
      setData(response);
    } catch (err: any) {
      setError(err?.response?.data?.error || "No se pudo cargar el monitoreo.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(filters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const summary = data?.summary;

  const schemaOptions = useMemo(() => {
    const values = data?.schemas?.map((item) => item.schema) || [];
    return ["all", ...values];
  }, [data]);

  const maintenanceSchemaOptions = useMemo(() => {
    const uniqueSchemas = Array.from(
      new Set((data?.tables || []).map((item) => item.schema)),
    );
    return uniqueSchemas;
  }, [data]);

  const tableOptions = useMemo(() => {
    if (!maintenanceForm.schema) return [];
    return (data?.tables || []).filter(
      (item) => item.schema === maintenanceForm.schema,
    );
  }, [data, maintenanceForm.schema]);

  const indexOptions = useMemo(() => {
    if (!maintenanceForm.schema) return [];
    return (data?.indexes || []).filter(
      (item) => item.schema === maintenanceForm.schema,
    );
  }, [data, maintenanceForm.schema]);

  const handleFilterChange = (
    key: keyof MonitoringFilters,
    value: string | number,
  ) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const applyFilters = () => {
    load(filters);
  };

  const resetFilters = () => {
    const next = {
      schema: "all",
      search: "",
      sortBy: "total_bytes",
      sortOrder: "desc" as const,
      limit: 200,
    };
    setFilters(next);
    load(next);
  };

  const handleMaintenanceFieldChange = (
    key: "schema" | "table" | "indexName",
    value: string,
  ) => {
    setMaintenanceMessage("");
    setMaintenanceError("");

    if (key === "schema") {
      setMaintenanceForm({
        schema: value,
        table: "",
        indexName: "",
      });
      return;
    }

    if (key === "table") {
      setMaintenanceForm((prev) => ({
        ...prev,
        table: value,
      }));
      return;
    }

    setMaintenanceForm((prev) => ({
      ...prev,
      indexName: value,
    }));
  };

  const executeMaintenance = async (
    action: "vacuum" | "analyze" | "reindex",
  ) => {
    setMaintenanceMessage("");
    setMaintenanceError("");

    try {
      if (!maintenanceForm.schema) {
        setMaintenanceError("Selecciona un esquema.");
        return;
      }

      let payload: MaintenancePayload;

      if (action === "reindex" && maintenanceForm.indexName) {
        payload = {
          schema: maintenanceForm.schema,
          indexName: maintenanceForm.indexName,
        };
      } else {
        if (!maintenanceForm.table) {
          setMaintenanceError("Selecciona una tabla.");
          return;
        }

        payload = {
          schema: maintenanceForm.schema,
          table: maintenanceForm.table,
        };
      }

      setMaintenanceLoading(true);

      let response;
      if (action === "vacuum") {
        response = await runVacuumAnalyze(payload);
      } else if (action === "analyze") {
        response = await runAnalyzeTable(payload);
      } else {
        response = await runReindex(payload);
      }

      setMaintenanceMessage(response.message || "Acción ejecutada correctamente.");
      await load(filters);
    } catch (err: any) {
      setMaintenanceError(
        err?.response?.data?.error ||
          err?.response?.data?.detail ||
          "No se pudo ejecutar la acción de mantenimiento.",
      );
    } finally {
      setMaintenanceLoading(false);
    }
  };

  const schemaChartData = useMemo(() => {
    if (!data?.schemas?.length) return [];
    return data.schemas.slice(0, 8).map((item) => ({
      name: item.schema,
      totalMB: toNumber(item.totalMB),
      rows: toNumber(item.estimatedRows),
      accesses: toNumber(item.totalScans),
    }));
  }, [data]);

  const hottestTablesChartData = useMemo(() => {
    if (!data?.highlights?.hottestTables?.length) return [];
    return data.highlights.hottestTables.slice(0, 6).map((item) => ({
      name: `${item.schema}.${item.table}`,
      totalScans: toNumber(item.totalScans),
      seqScan: toNumber(item.seqScan),
      idxScan: toNumber(item.idxScan),
    }));
  }, [data]);

  const biggestTablesChartData = useMemo(() => {
    if (!data?.highlights?.biggestTables?.length) return [];
    return data.highlights.biggestTables.slice(0, 6).map((item) => ({
      name: `${item.schema}.${item.table}`,
      totalMB: toNumber(item.totalMB),
      sizePct: toNumber(item.sizePct),
    }));
  }, [data]);

  const maintenancePieData = useMemo(() => {
    if (!data?.tables?.length) return [];
    const analyzed = data.tables.filter(
      (row) => !toNumber(row.pendingAnalyze),
    ).length;
    const pending = data.tables.filter((row) =>
      Boolean(toNumber(row.pendingAnalyze)),
    ).length;

    return [
      { name: "Analizadas", value: analyzed },
      { name: "Pendientes", value: pending },
    ];
  }, [data]);

  const healthIndicators = useMemo(() => {
    const tables = data?.tables || [];

    if (!tables.length) {
      return {
        avgCacheHit: 0,
        totalDeadRows: 0,
        totalPendingAnalyze: 0,
        totalHotUpdates: 0,
      };
    }

    const avgCacheHit =
      tables.reduce((acc, row) => acc + toNumber(row.cacheHitRatio), 0) /
      tables.length;

    const totalDeadRows = tables.reduce(
      (acc, row) => acc + toNumber(row.deadRows),
      0,
    );

    const totalPendingAnalyze = tables.reduce(
      (acc, row) => acc + toNumber(row.pendingAnalyze),
      0,
    );

    const totalHotUpdates = tables.reduce(
      (acc, row) => acc + toNumber(row.hotUpdates),
      0,
    );

    return {
      avgCacheHit,
      totalDeadRows,
      totalPendingAnalyze,
      totalHotUpdates,
    };
  }, [data]);

  const topRiskTables = useMemo(() => {
    if (!data?.tables?.length) return [];
    return [...data.tables]
      .sort((a, b) => toNumber(b.deadRows) - toNumber(a.deadRows))
      .slice(0, 5);
  }, [data]);

  const topTableSummaries = useMemo(() => {
    if (!data?.tables?.length) return [];
    return [...data.tables]
      .sort((a, b) => toNumber(b.totalMB) - toNumber(a.totalMB))
      .slice(0, 8);
  }, [data]);

  const indexStats = useMemo(() => {
    const indexes = data?.indexes || [];
    const totalIndexes = indexes.length;
    const unusedIndexes = indexes.filter((item) => item.idxScan === 0).length;
    const invalidIndexes = indexes.filter((item) => !item.isValid).length;
    const heavyIndexes = indexes.filter((item) => item.indexSizeMB >= 10).length;

    return {
      totalIndexes,
      unusedIndexes,
      invalidIndexes,
      heavyIndexes,
    };
  }, [data]);

  const biggestIndexesChartData = useMemo(() => {
    const indexes = data?.indexes || [];
    return [...indexes]
      .sort((a, b) => toNumber(b.indexSizeMB) - toNumber(a.indexSizeMB))
      .slice(0, 8)
      .map((item) => ({
        name: item.indexName,
        sizeMB: toNumber(item.indexSizeMB),
      }));
  }, [data]);

  const reviewIndexes = useMemo(() => {
    const indexes = data?.indexes || [];
    return indexes
      .filter(
        (item) =>
          item.needsReview ||
          !item.isValid ||
          item.idxScan === 0 ||
          (toNumber(item.indexSizeMB) > 10 && toNumber(item.idxScan) < 10),
      )
      .slice(0, 10);
  }, [data]);

  const maintenanceCards = useMemo(() => {
    return {
      totalDeadRows:
        data?.maintenance?.totalDeadRows ?? healthIndicators.totalDeadRows,
      totalPendingAnalyze:
        data?.maintenance?.totalPendingAnalyze ??
        healthIndicators.totalPendingAnalyze,
      tablesNeedingVacuum: data?.maintenance?.tablesNeedingVacuum ?? 0,
      tablesNeedingAnalyze: data?.maintenance?.tablesNeedingAnalyze ?? 0,
    };
  }, [data, healthIndicators]);

  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroText}>
          <div className={styles.badge}>Panel Administrativo PostgreSQL</div>
          <h1>Monitoreo visual de rendimiento y uso</h1>
          <p>
            Convierte las métricas técnicas en algo más fácil de observar con
            tarjetas, gráficas y apartados organizados por esquema, tablas,
            índices y mantenimiento.
          </p>
        </div>

        <div className={styles.heroActions}>
          <button
            className={styles.primaryBtn}
            onClick={() => load(filters)}
            disabled={loading}
          >
            <RefreshCw size={18} className={loading ? styles.spin : ""} />
            {loading ? "Actualizando..." : "Actualizar métricas"}
          </button>
        </div>
      </section>

      {error && (
        <div className={styles.errorBox}>
          <AlertTriangle size={18} />
          <span>{error}</span>
        </div>
      )}

      <section className={styles.filtersCard}>
        <div className={styles.filtersTop}>
          <h2>Filtros de monitoreo</h2>
          <p>Reduce y organiza la información antes de analizarla.</p>
        </div>

        <div className={styles.filtersGrid}>
          <div className={styles.field}>
            <label>Esquema</label>
            <div className={styles.inputWrap}>
              <Layers3 size={16} />
              <select
                value={filters.schema}
                onChange={(e) => handleFilterChange("schema", e.target.value)}
              >
                {schemaOptions.map((schema) => (
                  <option key={schema} value={schema}>
                    {schema === "all" ? "Todos" : schema}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className={styles.field}>
            <label>Buscar tabla</label>
            <div className={styles.inputWrap}>
              <Search size={16} />
              <input
                type="text"
                placeholder="Ej. users, products, sessions..."
                value={filters.search}
                onChange={(e) => handleFilterChange("search", e.target.value)}
              />
            </div>
          </div>

          <div className={styles.field}>
            <label>Ordenar por</label>
            <div className={styles.inputWrap}>
              <ArrowUpDown size={16} />
              <select
                value={filters.sortBy}
                onChange={(e) => handleFilterChange("sortBy", e.target.value)}
              >
                <option value="total_bytes">Peso total</option>
                <option value="table_bytes">Peso tabla</option>
                <option value="index_bytes">Peso índices</option>
                <option value="est_rows">Filas estimadas</option>
                <option value="dead_rows">Filas muertas</option>
                <option value="total_scans">Accesos</option>
                <option value="seq_scan">Seq Scan</option>
                <option value="idx_scan">Idx Scan</option>
                <option value="inserts">Inserts</option>
                <option value="updates">Updates</option>
                <option value="deletes">Deletes</option>
                <option value="cache_hit_ratio">Cache hit %</option>
                <option value="size_pct">% tamaño</option>
                <option value="schema">Schema</option>
                <option value="table_name">Tabla</option>
              </select>
            </div>
          </div>

          <div className={styles.field}>
            <label>Orden</label>
            <div className={styles.inputWrap}>
              <ArrowUpDown size={16} />
              <select
                value={filters.sortOrder}
                onChange={(e) =>
                  handleFilterChange(
                    "sortOrder",
                    e.target.value as "asc" | "desc",
                  )
                }
              >
                <option value="desc">Descendente</option>
                <option value="asc">Ascendente</option>
              </select>
            </div>
          </div>

          <div className={styles.field}>
            <label>Límite</label>
            <div className={styles.inputWrap}>
              <Table2 size={16} />
              <select
                value={filters.limit}
                onChange={(e) =>
                  handleFilterChange("limit", Number(e.target.value))
                }
              >
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value={200}>200</option>
                <option value={500}>500</option>
                <option value={1000}>1000</option>
              </select>
            </div>
          </div>
        </div>

        <div className={styles.filterActions}>
          <button
            className={styles.primaryBtn}
            onClick={applyFilters}
            disabled={loading}
          >
            Aplicar filtros
          </button>

          <button
            className={styles.secondaryBtn}
            onClick={resetFilters}
            disabled={loading}
          >
            Limpiar
          </button>
        </div>
      </section>

      <section className={styles.kpiGrid}>
        <article className={styles.kpiCard}>
          <div className={styles.kpiIcon}>
            <Database size={20} />
          </div>
          <div>
            <span className={styles.kpiLabel}>Base de datos</span>
            <strong className={styles.kpiValue}>{summary?.database || "-"}</strong>
          </div>
        </article>

        <article className={styles.kpiCard}>
          <div className={styles.kpiIcon}>
            <Layers3 size={20} />
          </div>
          <div>
            <span className={styles.kpiLabel}>Esquemas</span>
            <strong className={styles.kpiValue}>
              {formatPlainNumber(toNumber(summary?.schemas))}
            </strong>
          </div>
        </article>

        <article className={styles.kpiCard}>
          <div className={styles.kpiIcon}>
            <Table2 size={20} />
          </div>
          <div>
            <span className={styles.kpiLabel}>Tablas</span>
            <strong className={styles.kpiValue}>
              {formatPlainNumber(toNumber(summary?.tables))}
            </strong>
          </div>
        </article>

        <article className={styles.kpiCard}>
          <div className={styles.kpiIcon}>
            <HardDrive size={20} />
          </div>
          <div>
            <span className={styles.kpiLabel}>Peso tablas</span>
            <strong className={styles.kpiValue}>
              {formatMB(toNumber(summary?.tablesSizeMB))}
            </strong>
          </div>
        </article>

        <article className={styles.kpiCard}>
          <div className={styles.kpiIcon}>
            <BarChart3 size={20} />
          </div>
          <div>
            <span className={styles.kpiLabel}>Peso DB</span>
            <strong className={styles.kpiValue}>
              {formatMB(toNumber(summary?.databaseSizeMB))}
            </strong>
          </div>
        </article>

        <article className={styles.kpiCard}>
          <div className={styles.kpiIcon}>
            <Activity size={20} />
          </div>
          <div>
            <span className={styles.kpiLabel}>Cache hit promedio</span>
            <strong className={styles.kpiValue}>
              {healthIndicators.avgCacheHit.toFixed(2)}%
            </strong>
          </div>
        </article>
      </section>

      <section className={styles.metaRow}>
        <div className={styles.metaItem}>
          <span>Última actualización</span>
          <strong>
            {data?.updatedAt ? new Date(data.updatedAt).toLocaleString() : "-"}
          </strong>
        </div>
        <div className={styles.metaItem}>
          <span>Filas muertas detectadas</span>
          <strong>{formatCompactNumber(healthIndicators.totalDeadRows)}</strong>
        </div>
        <div className={styles.metaItem}>
          <span>Pendientes de analyze</span>
          <strong>
            {formatCompactNumber(healthIndicators.totalPendingAnalyze)}
          </strong>
        </div>
        <div className={styles.metaItem}>
          <span>HOT updates</span>
          <strong>{formatCompactNumber(healthIndicators.totalHotUpdates)}</strong>
        </div>
      </section>

      <section className={styles.tabsSection}>
        <div className={styles.tabs}>
          <button
            type="button"
            className={`${styles.tabBtn} ${
              activeTab === "overview" ? styles.tabBtnActive : ""
            }`}
            onClick={() => setActiveTab("overview")}
          >
            Resumen visual
          </button>

          <button
            type="button"
            className={`${styles.tabBtn} ${
              activeTab === "schemas" ? styles.tabBtnActive : ""
            }`}
            onClick={() => setActiveTab("schemas")}
          >
            Esquemas
          </button>

          <button
            type="button"
            className={`${styles.tabBtn} ${
              activeTab === "tables" ? styles.tabBtnActive : ""
            }`}
            onClick={() => setActiveTab("tables")}
          >
            Tablas
          </button>

          <button
            type="button"
            className={`${styles.tabBtn} ${
              activeTab === "indexes" ? styles.tabBtnActive : ""
            }`}
            onClick={() => setActiveTab("indexes")}
          >
            Índices
          </button>

          <button
            type="button"
            className={`${styles.tabBtn} ${
              activeTab === "maintenance" ? styles.tabBtnActive : ""
            }`}
            onClick={() => setActiveTab("maintenance")}
          >
            Mantenimiento
          </button>
        </div>

        {activeTab === "overview" && (
          <div className={styles.tabContent}>
            <div className={styles.tabSectionHeader}>
              <h2>Resumen visual</h2>
              <p>
                Vista general del comportamiento de la base de datos, el uso y
                el estado de mantenimiento.
              </p>
            </div>

            <div className={styles.chartGrid}>
              <article className={styles.panel}>
                <div className={styles.panelHeader}>
                  <div>
                    <h3>Espacio por esquema</h3>
                    <p>Comparación del tamaño total agrupado por schema.</p>
                  </div>
                </div>

                <div className={styles.chartBox}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={schemaChartData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Bar dataKey="totalMB" radius={[8, 8, 0, 0]} fill="#ef4444" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </article>

              <article className={styles.panel}>
                <div className={styles.panelHeader}>
                  <div>
                    <h3>Mantenimiento</h3>
                    <p>Tablas analizadas contra tablas pendientes.</p>
                  </div>
                </div>

                <div className={styles.chartBox}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={maintenancePieData}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={60}
                        outerRadius={90}
                        paddingAngle={4}
                      >
                        {maintenancePieData.map((_, index) => (
                          <Cell
                            key={`cell-maintenance-${index}`}
                            fill={CHART_COLORS[index % CHART_COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className={styles.legendList}>
                  {maintenancePieData.map((item, index) => (
                    <div className={styles.legendItem} key={item.name}>
                      <span
                        className={styles.legendDot}
                        style={{
                          backgroundColor:
                            CHART_COLORS[index % CHART_COLORS.length],
                        }}
                      />
                      <span>{item.name}</span>
                      <strong>{item.value}</strong>
                    </div>
                  ))}
                </div>
              </article>

              <article className={styles.panel}>
                <div className={styles.panelHeader}>
                  <div>
                    <h3>Tablas más consultadas</h3>
                    <p>Top de accesos combinando seq scan e index scan.</p>
                  </div>
                </div>

                <div className={styles.chartBox}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={hottestTablesChartData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Area
                        type="monotone"
                        dataKey="totalScans"
                        stroke="#3b82f6"
                        fill="#93c5fd"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </article>

              <article className={styles.panel}>
                <div className={styles.panelHeader}>
                  <div>
                    <h3>Tablas más pesadas</h3>
                    <p>Las que más espacio están consumiendo actualmente.</p>
                  </div>
                </div>

                <div className={styles.chartBox}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={biggestTablesChartData}
                      layout="vertical"
                      margin={{ left: 20 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 12 }} />
                      <YAxis
                        dataKey="name"
                        type="category"
                        tick={{ fontSize: 11 }}
                        width={130}
                      />
                      <Tooltip />
                      <Bar dataKey="totalMB" radius={[0, 8, 8, 0]} fill="#f97316" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </article>
            </div>

            <div className={styles.insightGrid}>
              <article className={styles.panel}>
                <div className={styles.panelHeader}>
                  <div>
                    <h3>Indicadores de salud</h3>
                    <p>Lectura rápida para detectar problemas.</p>
                  </div>
                </div>

                <div className={styles.healthGrid}>
                  <div
                    className={`${styles.healthCard} ${
                      styles[getCacheHitStatus(healthIndicators.avgCacheHit)]
                    }`}
                  >
                    <span>Cache hit promedio</span>
                    <strong>{healthIndicators.avgCacheHit.toFixed(2)}%</strong>
                  </div>

                  <div
                    className={`${styles.healthCard} ${
                      styles[getDeadRowsStatus(healthIndicators.totalDeadRows)]
                    }`}
                  >
                    <span>Filas muertas</span>
                    <strong>{formatCompactNumber(healthIndicators.totalDeadRows)}</strong>
                  </div>

                  <div
                    className={`${styles.healthCard} ${
                      healthIndicators.totalPendingAnalyze > 0
                        ? styles.warn
                        : styles.good
                    }`}
                  >
                    <span>Pending analyze</span>
                    <strong>
                      {formatCompactNumber(healthIndicators.totalPendingAnalyze)}
                    </strong>
                  </div>

                  <div className={`${styles.healthCard} ${styles.info}`}>
                    <span>HOT updates</span>
                    <strong>{formatCompactNumber(healthIndicators.totalHotUpdates)}</strong>
                  </div>
                </div>
              </article>

              <article className={styles.panel}>
                <div className={styles.panelHeader}>
                  <div>
                    <h3>Tablas con mayor riesgo</h3>
                    <p>Ordenadas por filas muertas para priorizar mantenimiento.</p>
                  </div>
                </div>

                <div className={styles.simpleList}>
                  {topRiskTables.length ? (
                    topRiskTables.map((item) => (
                      <div
                        key={`${item.schema}.${item.table}`}
                        className={styles.simpleItem}
                      >
                        <div>
                          <strong>
                            {item.schema}.{item.table}
                          </strong>
                          <span>
                            Filas muertas:{" "}
                            {formatCompactNumber(toNumber(item.deadRows))}
                          </span>
                        </div>
                        <small>
                          Cache hit: {toNumber(item.cacheHitRatio).toFixed(2)}%
                        </small>
                      </div>
                    ))
                  ) : (
                    <div className={styles.emptyState}>Sin datos</div>
                  )}
                </div>
              </article>
            </div>

            <article className={styles.panel}>
              <div className={styles.panelHeader}>
                <div>
                  <h3>Resumen rápido de tablas importantes</h3>
                  <p>Vista compacta de las tablas más pesadas.</p>
                </div>
              </div>

              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Schema</th>
                      <th>Tabla</th>
                      <th>Total MB</th>
                      <th>% tamaño</th>
                      <th>Filas est.</th>
                      <th>Accesos</th>
                      <th>Cache hit %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topTableSummaries.length ? (
                      topTableSummaries.map((row) => (
                        <tr key={`${row.schema}.${row.table}`}>
                          <td>{row.schema}</td>
                          <td>{row.table}</td>
                          <td>{toNumber(row.totalMB).toFixed(2)}</td>
                          <td>{toNumber(row.sizePct).toFixed(2)}%</td>
                          <td>{formatCompactNumber(toNumber(row.estimatedRows))}</td>
                          <td>{formatCompactNumber(toNumber(row.totalScans))}</td>
                          <td>{toNumber(row.cacheHitRatio).toFixed(2)}%</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={7}>
                          {loading ? "Cargando..." : "Sin datos disponibles."}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </article>
          </div>
        )}

        {activeTab === "schemas" && (
          <div className={styles.tabContent}>
            <div className={styles.tabSectionHeader}>
              <h2>Esquemas</h2>
              <p>
                Vista agrupada por schema para analizar tamaño, accesos y movimiento.
              </p>
            </div>

            <article className={styles.panel}>
              <div className={styles.panelHeader}>
                <div>
                  <h3>Resumen por esquema</h3>
                  <p>Toda la información agrupada por schema.</p>
                </div>
              </div>

              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Schema</th>
                      <th>Tablas</th>
                      <th>Filas est.</th>
                      <th>Filas muertas</th>
                      <th>Tabla MB</th>
                      <th>Índices MB</th>
                      <th>Total MB</th>
                      <th>Accesos</th>
                      <th>Inserts</th>
                      <th>Updates</th>
                      <th>Deletes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data?.schemas?.length ? (
                      data.schemas.map((row) => (
                        <tr key={row.schema}>
                          <td>{row.schema}</td>
                          <td>{formatPlainNumber(toNumber(row.tables))}</td>
                          <td>{formatCompactNumber(toNumber(row.estimatedRows))}</td>
                          <td>{formatCompactNumber(toNumber(row.deadRows))}</td>
                          <td>{toNumber(row.tableMB).toFixed(2)}</td>
                          <td>{toNumber(row.indexMB).toFixed(2)}</td>
                          <td>{toNumber(row.totalMB).toFixed(2)}</td>
                          <td>{formatCompactNumber(toNumber(row.totalScans))}</td>
                          <td>{formatCompactNumber(toNumber(row.inserts))}</td>
                          <td>{formatCompactNumber(toNumber(row.updates))}</td>
                          <td>{formatCompactNumber(toNumber(row.deletes))}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={11}>{loading ? "Cargando..." : "Sin datos."}</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </article>
          </div>
        )}

        {activeTab === "tables" && (
          <div className={styles.tabContent}>
            <div className={styles.tabSectionHeader}>
              <h2>Tablas</h2>
              <p>
                Detalle por tabla con estadísticas de tamaño, accesos y mantenimiento.
              </p>
            </div>

            <article className={styles.panel}>
              <div className={styles.panelHeader}>
                <div>
                  <h3>Detalle por tabla</h3>
                  <p>Información completa sin mezclarla con el resumen principal.</p>
                </div>
              </div>

              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Schema</th>
                      <th>Tabla</th>
                      <th>Filas est.</th>
                      <th>Muertas</th>
                      <th>Tabla MB</th>
                      <th>Índices MB</th>
                      <th>Total MB</th>
                      <th>% tamaño</th>
                      <th>Accesos</th>
                      <th>Seq</th>
                      <th>Idx</th>
                      <th>Ins</th>
                      <th>Upd</th>
                      <th>Del</th>
                      <th>HOT Upd</th>
                      <th>Pending Analyze</th>
                      <th>Cache Hit %</th>
                      <th>Últ. Vacuum</th>
                      <th>Últ. Autovacuum</th>
                      <th>Últ. Analyze</th>
                      <th>Últ. Autoanalyze</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data?.tables?.length ? (
                      data.tables.map((row) => (
                        <tr key={`${row.schema}.${row.table}`}>
                          <td>{row.schema}</td>
                          <td>{row.table}</td>
                          <td>{formatCompactNumber(toNumber(row.estimatedRows))}</td>
                          <td>{formatCompactNumber(toNumber(row.deadRows))}</td>
                          <td>{toNumber(row.tableMB).toFixed(2)}</td>
                          <td>{toNumber(row.indexMB).toFixed(2)}</td>
                          <td>{toNumber(row.totalMB).toFixed(2)}</td>
                          <td>{toNumber(row.sizePct).toFixed(2)}%</td>
                          <td>{formatCompactNumber(toNumber(row.totalScans))}</td>
                          <td>{formatCompactNumber(toNumber(row.seqScan))}</td>
                          <td>{formatCompactNumber(toNumber(row.idxScan))}</td>
                          <td>{formatCompactNumber(toNumber(row.inserts))}</td>
                          <td>{formatCompactNumber(toNumber(row.updates))}</td>
                          <td>{formatCompactNumber(toNumber(row.deletes))}</td>
                          <td>{formatCompactNumber(toNumber(row.hotUpdates))}</td>
                          <td>{formatCompactNumber(toNumber(row.pendingAnalyze))}</td>
                          <td>{toNumber(row.cacheHitRatio).toFixed(2)}%</td>
                          <td>{formatDate(row.lastVacuum)}</td>
                          <td>{formatDate(row.lastAutovacuum)}</td>
                          <td>{formatDate(row.lastAnalyze)}</td>
                          <td>{formatDate(row.lastAutoanalyze)}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={21}>{loading ? "Cargando..." : "Sin datos."}</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </article>
          </div>
        )}

        {activeTab === "indexes" && (
          <div className={styles.tabContent}>
            <div className={styles.tabSectionHeader}>
              <h2>Índices</h2>
              <p>
                Apartado dedicado a índices creados, su tamaño, uso y posibles revisiones.
              </p>
            </div>

            <div className={styles.kpiGridSmall}>
              <article className={styles.kpiCard}>
                <div className={styles.kpiIcon}>
                  <KeyRound size={20} />
                </div>
                <div>
                  <span className={styles.kpiLabel}>Total índices</span>
                  <strong className={styles.kpiValue}>
                    {formatPlainNumber(indexStats.totalIndexes)}
                  </strong>
                </div>
              </article>

              <article className={styles.kpiCard}>
                <div className={styles.kpiIcon}>
                  <ScanSearch size={20} />
                </div>
                <div>
                  <span className={styles.kpiLabel}>No usados</span>
                  <strong className={styles.kpiValue}>
                    {formatPlainNumber(indexStats.unusedIndexes)}
                  </strong>
                </div>
              </article>

              <article className={styles.kpiCard}>
                <div className={styles.kpiIcon}>
                  <AlertTriangle size={20} />
                </div>
                <div>
                  <span className={styles.kpiLabel}>Inválidos</span>
                  <strong className={styles.kpiValue}>
                    {formatPlainNumber(indexStats.invalidIndexes)}
                  </strong>
                </div>
              </article>

              <article className={styles.kpiCard}>
                <div className={styles.kpiIcon}>
                  <HardDrive size={20} />
                </div>
                <div>
                  <span className={styles.kpiLabel}>Pesados (+10 MB)</span>
                  <strong className={styles.kpiValue}>
                    {formatPlainNumber(indexStats.heavyIndexes)}
                  </strong>
                </div>
              </article>
            </div>

            <div className={styles.insightGrid}>
              <article className={styles.panel}>
                <div className={styles.panelHeader}>
                  <div>
                    <h3>Índices más pesados</h3>
                    <p>Los que más espacio están usando en la base de datos.</p>
                  </div>
                </div>

                <div className={styles.chartBox}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={biggestIndexesChartData}
                      layout="vertical"
                      margin={{ left: 20 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 12 }} />
                      <YAxis
                        dataKey="name"
                        type="category"
                        tick={{ fontSize: 11 }}
                        width={170}
                      />
                      <Tooltip />
                      <Bar dataKey="sizeMB" radius={[0, 8, 8, 0]} fill="#8b5cf6" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </article>

              <article className={styles.panel}>
                <div className={styles.panelHeader}>
                  <div>
                    <h3>Índices a revisar</h3>
                    <p>No usados, inválidos o grandes con poco uso.</p>
                  </div>
                </div>

                <div className={styles.simpleList}>
                  {reviewIndexes.length ? (
                    reviewIndexes.map((item) => (
                      <div
                        key={`${item.schema}.${item.indexName}`}
                        className={styles.simpleItem}
                      >
                        <div>
                          <strong>{item.indexName}</strong>
                          <span>
                            {item.schema}.{item.tableName} · {item.indexSizeMB.toFixed(2)} MB
                          </span>
                        </div>
                        <small>Uso: {item.idxScan}</small>
                      </div>
                    ))
                  ) : (
                    <div className={styles.emptyState}>
                      No hay índices marcados para revisión.
                    </div>
                  )}
                </div>
              </article>
            </div>

            <article className={styles.panel}>
              <div className={styles.panelHeader}>
                <div>
                  <h3>Detalle de índices</h3>
                  <p>Tabla de índices conectada al backend.</p>
                </div>
              </div>

              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Schema</th>
                      <th>Tabla</th>
                      <th>Índice</th>
                      <th>Tamaño</th>
                      <th>Uso</th>
                      <th>Unique</th>
                      <th>Primary</th>
                      <th>Válido</th>
                      <th>Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data?.indexes?.length ? (
                      data.indexes.map((row) => (
                        <tr key={`${row.schema}.${row.indexName}`}>
                          <td>{row.schema}</td>
                          <td>{row.tableName}</td>
                          <td>{row.indexName}</td>
                          <td>{toNumber(row.indexSizeMB).toFixed(2)} MB</td>
                          <td>{formatCompactNumber(toNumber(row.idxScan))}</td>
                          <td>{row.isUnique ? "Sí" : "No"}</td>
                          <td>{row.isPrimary ? "Sí" : "No"}</td>
                          <td>{row.isValid ? "Sí" : "No"}</td>
                          <td>{row.usageStatus || "-"}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={9}>Sin datos de índices.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </article>
          </div>
        )}

        {activeTab === "maintenance" && (
          <div className={styles.tabContent}>
            <div className={styles.tabSectionHeader}>
              <h2>Mantenimiento</h2>
              <p>
                Ejecuta acciones controladas de mantenimiento y vuelve a cargar métricas al terminar.
              </p>
            </div>

            <div className={styles.kpiGridSmall}>
              <article className={styles.kpiCard}>
                <div className={styles.kpiIcon}>
                  <Wrench size={20} />
                </div>
                <div>
                  <span className={styles.kpiLabel}>Filas muertas</span>
                  <strong className={styles.kpiValue}>
                    {formatCompactNumber(maintenanceCards.totalDeadRows)}
                  </strong>
                </div>
              </article>

              <article className={styles.kpiCard}>
                <div className={styles.kpiIcon}>
                  <ScanSearch size={20} />
                </div>
                <div>
                  <span className={styles.kpiLabel}>Pending analyze</span>
                  <strong className={styles.kpiValue}>
                    {formatCompactNumber(maintenanceCards.totalPendingAnalyze)}
                  </strong>
                </div>
              </article>

              <article className={styles.kpiCard}>
                <div className={styles.kpiIcon}>
                  <Activity size={20} />
                </div>
                <div>
                  <span className={styles.kpiLabel}>Tablas para vacuum</span>
                  <strong className={styles.kpiValue}>
                    {formatCompactNumber(maintenanceCards.tablesNeedingVacuum)}
                  </strong>
                </div>
              </article>

              <article className={styles.kpiCard}>
                <div className={styles.kpiIcon}>
                  <ShieldCheck size={20} />
                </div>
                <div>
                  <span className={styles.kpiLabel}>Tablas para analyze</span>
                  <strong className={styles.kpiValue}>
                    {formatCompactNumber(maintenanceCards.tablesNeedingAnalyze)}
                  </strong>
                </div>
              </article>
            </div>

            <div className={styles.maintenanceGrid}>
              <article className={styles.panel}>
                <div className={styles.panelHeader}>
                  <div>
                    <h3>Estado de mantenimiento</h3>
                    <p>Resumen de necesidades detectadas.</p>
                  </div>
                </div>

                <div className={styles.healthGrid}>
                  <div className={`${styles.healthCard} ${styles.warn}`}>
                    <span>Filas muertas</span>
                    <strong>
                      {formatCompactNumber(maintenanceCards.totalDeadRows)}
                    </strong>
                  </div>

                  <div className={`${styles.healthCard} ${styles.warn}`}>
                    <span>Pending analyze</span>
                    <strong>
                      {formatCompactNumber(maintenanceCards.totalPendingAnalyze)}
                    </strong>
                  </div>

                  <div className={`${styles.healthCard} ${styles.info}`}>
                    <span>Tablas para vacuum</span>
                    <strong>
                      {formatCompactNumber(maintenanceCards.tablesNeedingVacuum)}
                    </strong>
                  </div>

                  <div className={`${styles.healthCard} ${styles.info}`}>
                    <span>Tablas para analyze</span>
                    <strong>
                      {formatCompactNumber(maintenanceCards.tablesNeedingAnalyze)}
                    </strong>
                  </div>
                </div>
              </article>

              <article className={styles.panel}>
                <div className={styles.panelHeader}>
                  <div>
                    <h3>Acciones de mantenimiento</h3>
                    <p>Selecciona esquema, tabla o índice y ejecuta la acción.</p>
                  </div>
                </div>

                <div className={styles.formGrid}>
                  <div className={styles.field}>
                    <label>Esquema</label>
                    <div className={styles.inputWrap}>
                      <Layers3 size={16} />
                      <select
                        value={maintenanceForm.schema}
                        onChange={(e) =>
                          handleMaintenanceFieldChange("schema", e.target.value)
                        }
                      >
                        <option value="">Selecciona un esquema</option>
                        {maintenanceSchemaOptions.map((schema) => (
                          <option key={schema} value={schema}>
                            {schema}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className={styles.field}>
                    <label>Tabla</label>
                    <div className={styles.inputWrap}>
                      <Table2 size={16} />
                      <select
                        value={maintenanceForm.table}
                        onChange={(e) =>
                          handleMaintenanceFieldChange("table", e.target.value)
                        }
                      >
                        <option value="">Selecciona una tabla</option>
                        {tableOptions.map((item) => (
                          <option
                            key={`${item.schema}.${item.table}`}
                            value={item.table}
                          >
                            {item.table}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className={styles.field}>
                    <label>Índice para reindex opcional</label>
                    <div className={styles.inputWrap}>
                      <KeyRound size={16} />
                      <select
                        value={maintenanceForm.indexName}
                        onChange={(e) =>
                          handleMaintenanceFieldChange("indexName", e.target.value)
                        }
                      >
                        <option value="">Selecciona un índice</option>
                        {indexOptions.map((item) => (
                          <option
                            key={`${item.schema}.${item.indexName}`}
                            value={item.indexName}
                          >
                            {item.indexName}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                <div className={styles.maintenanceActions}>
                  <button
                    className={styles.primaryBtn}
                    type="button"
                    disabled={maintenanceLoading}
                    onClick={() => executeMaintenance("vacuum")}
                  >
                    {maintenanceLoading ? "Procesando..." : "VACUUM ANALYZE"}
                  </button>

                  <button
                    className={styles.secondaryBtn}
                    type="button"
                    disabled={maintenanceLoading}
                    onClick={() => executeMaintenance("analyze")}
                  >
                    {maintenanceLoading ? "Procesando..." : "ANALYZE"}
                  </button>

                  <button
                    className={styles.secondaryBtn}
                    type="button"
                    disabled={maintenanceLoading}
                    onClick={() => executeMaintenance("reindex")}
                  >
                    {maintenanceLoading ? "Procesando..." : "REINDEX"}
                  </button>
                </div>

                {maintenanceMessage && (
                  <div className={styles.successNote}>{maintenanceMessage}</div>
                )}

                {maintenanceError && (
                  <div className={styles.errorNote}>{maintenanceError}</div>
                )}
              </article>
            </div>

            <article className={styles.panel}>
              <div className={styles.panelHeader}>
                <div>
                  <h3>Tablas que requieren atención</h3>
                  <p>
                    Vista rápida de tablas con más filas muertas y pendientes de analyze.
                  </p>
                </div>
              </div>

              <div className={styles.simpleList}>
                {topRiskTables.length ? (
                  topRiskTables.map((item) => (
                    <div
                      key={`${item.schema}.${item.table}`}
                      className={styles.simpleItem}
                    >
                      <div>
                        <strong>
                          {item.schema}.{item.table}
                        </strong>
                        <span>
                          Filas muertas:{" "}
                          {formatCompactNumber(toNumber(item.deadRows))}
                        </span>
                      </div>
                      <small>
                        Pending analyze:{" "}
                        {formatCompactNumber(toNumber(item.pendingAnalyze))}
                      </small>
                    </div>
                  ))
                ) : (
                  <div className={styles.emptyState}>Sin datos</div>
                )}
              </div>
            </article>
          </div>
        )}
      </section>
    </div>
  );
}