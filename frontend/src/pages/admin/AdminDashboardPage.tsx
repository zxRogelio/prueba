/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useState } from "react";
import styles from "./AdminDashboardPage.module.css";
import {
  getPostgresMonitoring,
  type MonitoringResponse,
  type MonitoringFilters,
} from "../../services/admin/monitoringService";

const formatDate = (value?: string | null) => {
  if (!value) return "-";
  return new Date(value).toLocaleString();
};

export default function AdminDashboardPage() {
  const [data, setData] = useState<MonitoringResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [filters, setFilters] = useState<MonitoringFilters>({
    schema: "all",
    search: "",
    sortBy: "total_bytes",
    sortOrder: "desc",
    limit: 200,
  });

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

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1>Panel Administrativo PostgreSQL</h1>
          <p>
            Monitoreo avanzado por esquema, tabla, accesos, crecimiento,
            mantenimiento y uso.
          </p>
        </div>

        <div className={styles.actions}>
          <button
            className={styles.refresh}
            onClick={() => load(filters)}
            disabled={loading}
          >
            {loading ? "Actualizando..." : "Actualizar métricas"}
          </button>
        </div>
      </div>

      {error && <div className={styles.error}>{error}</div>}

      <div className={styles.filtersCard}>
        <div className={styles.filtersGrid}>
          <div className={styles.field}>
            <label>Esquema</label>
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

          <div className={styles.field}>
            <label>Buscar tabla</label>
            <input
              type="text"
              placeholder="Ej. users, products, sessions..."
              value={filters.search}
              onChange={(e) => handleFilterChange("search", e.target.value)}
            />
          </div>

          <div className={styles.field}>
            <label>Ordenar por</label>
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

          <div className={styles.field}>
            <label>Orden</label>
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

          <div className={styles.field}>
            <label>Límite</label>
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
      </div>

      <div className={styles.cards}>
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <div className={styles.k}>Base de datos</div>
            <span className={styles.cardIcon} aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none">
                <ellipse
                  cx="12"
                  cy="6"
                  rx="7"
                  ry="3"
                  stroke="currentColor"
                  strokeWidth="1.8"
                />
                <path
                  d="M5 6v6c0 1.7 3.1 3 7 3s7-1.3 7-3V6"
                  stroke="currentColor"
                  strokeWidth="1.8"
                />
                <path
                  d="M5 12v6c0 1.7 3.1 3 7 3s7-1.3 7-3v-6"
                  stroke="currentColor"
                  strokeWidth="1.8"
                />
              </svg>
            </span>
          </div>
          <div className={styles.v}>{summary?.database || "-"}</div>
        </div>
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <div className={styles.k}>Esquemas</div>
            <span className={styles.cardIcon} aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none">
                <rect
                  x="4"
                  y="4"
                  width="6"
                  height="6"
                  rx="1.5"
                  stroke="currentColor"
                  strokeWidth="1.8"
                />
                <rect
                  x="14"
                  y="4"
                  width="6"
                  height="6"
                  rx="1.5"
                  stroke="currentColor"
                  strokeWidth="1.8"
                />
                <rect
                  x="9"
                  y="14"
                  width="6"
                  height="6"
                  rx="1.5"
                  stroke="currentColor"
                  strokeWidth="1.8"
                />
                <path
                  d="M12 10v4M10 14h4"
                  stroke="currentColor"
                  strokeWidth="1.8"
                />
              </svg>
            </span>
          </div>
          <div className={styles.v}>{summary?.schemas ?? 0}</div>
        </div>
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <div className={styles.k}>Tablas</div>
            <span className={styles.cardIcon} aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none">
                <rect x="4" y="5" width="16" height="14" rx="2" stroke="currentColor" strokeWidth="1.8" />
                <path d="M4 10h16M9 10v9M15 10v9" stroke="currentColor" strokeWidth="1.8" />
              </svg>
            </span>
          </div>
          <div className={styles.v}>{summary?.tables ?? 0}</div>
        </div>
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <div className={styles.k}>Peso total tablas</div>
            <span className={styles.cardIcon} aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none">
                <path d="M5 8h14l-2 9H7L5 8Z" stroke="currentColor" strokeWidth="1.8" />
                <path d="M12 8V5M9 5h6" stroke="currentColor" strokeWidth="1.8" />
                <path d="M8 12h8" stroke="currentColor" strokeWidth="1.8" />
              </svg>
            </span>
          </div>
          <div className={styles.v}>{summary?.tablesSizeMB || "0.00"} MB</div>
        </div>
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <div className={styles.k}>Peso total DB</div>
            <span className={styles.cardIcon} aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none">
                <rect x="4" y="4" width="16" height="16" rx="2.5" stroke="currentColor" strokeWidth="1.8" />
                <path d="M9 8h6M8 12h8M10 16h4" stroke="currentColor" strokeWidth="1.8" />
              </svg>
            </span>
          </div>
          <div className={styles.v}>{summary?.databaseSizeMB || "0.00"} MB</div>
        </div>
      </div>

      <div className={styles.meta}>
        <span className={styles.metaIcon} aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.8" />
            <path d="M12 8v4l2.5 2.5" stroke="currentColor" strokeWidth="1.8" />
          </svg>
        </span>
        Última actualización:{" "}
        {data?.updatedAt ? new Date(data.updatedAt).toLocaleString() : "-"}
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}><span className={styles.titleIcon} aria-hidden="true"><svg viewBox="0 0 24 24" fill="none"><path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="1.8" /></svg></span>Resumen por esquema</h2>
        <div className={styles.tableWrap}>
        <table className={`${styles.table} ${styles.summaryTable}`}>
            <thead>
              <tr>
                <th>Schema</th>
                <th>Tablas</th>
                <th>Filas est.</th>
                <th>Filas muertas</th>
                <th>Tabla (MB)</th>
                <th>Índices (MB)</th>
                <th>Total (MB)</th>
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
                    <td>{row.tables}</td>
                    <td>{row.estimatedRows}</td>
                    <td>{row.deadRows}</td>
                    <td>{row.tableMB}</td>
                    <td>{row.indexMB}</td>
                    <td>{row.totalMB}</td>
                    <td>{row.totalScans}</td>
                    <td>{row.inserts}</td>
                    <td>{row.updates}</td>
                    <td>{row.deletes}</td>
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
      </div>

      <div className={styles.highlightsGrid}>
        <div className={styles.panel}>
          <h3 className={styles.panelTitle}><span className={styles.titleIcon} aria-hidden="true"><svg viewBox="0 0 24 24" fill="none"><path d="M5 18V10M12 18V6M19 18v-4" stroke="currentColor" strokeWidth="1.8" /><path d="M4 18h16" stroke="currentColor" strokeWidth="1.8" /></svg></span>Top tablas más consultadas</h3>
          <div className={styles.simpleList}>
            {data?.highlights?.hottestTables?.length ? (
              data.highlights.hottestTables.map((item) => (
                <div
                  key={`${item.schema}.${item.table}`}
                  className={styles.simpleItem}
                >
                  <div>
                    <strong>
                      {item.schema}.{item.table}
                    </strong>
                    <span>{item.totalScans} accesos</span>
                  </div>
                  <small>
                    Seq: {item.seqScan} | Idx: {item.idxScan}
                  </small>
                </div>
              ))
            ) : (
              <div className={styles.empty}>Sin datos</div>
            )}
          </div>
        </div>

        <div className={styles.panel}>
        <h3 className={styles.panelTitle}><span className={styles.titleIcon} aria-hidden="true"><svg viewBox="0 0 24 24" fill="none"><path d="M5 8h14l-2 9H7L5 8Z" stroke="currentColor" strokeWidth="1.8" /><path d="M12 8V5M9 5h6" stroke="currentColor" strokeWidth="1.8" /></svg></span>Top tablas más pesadas</h3>
          <div className={styles.simpleList}>
            {data?.highlights?.biggestTables?.length ? (
              data.highlights.biggestTables.map((item) => (
                <div
                  key={`${item.schema}.${item.table}`}
                  className={styles.simpleItem}
                >
                  <div>
                    <strong>
                      {item.schema}.{item.table}
                    </strong>
                    <span>{item.totalMB} MB</span>
                  </div>
                  <small>{item.sizePct}% del total de tablas</small>
                </div>
              ))
            ) : (
              <div className={styles.empty}>Sin datos</div>
            )}
          </div>
        </div>
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>
          <span className={styles.titleIcon} aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none">
              <rect
                x="4"
                y="5"
                width="16"
                height="14"
                rx="2"
                stroke="currentColor"
                strokeWidth="1.8"
              />
              <path
                d="M4 10h16M10 10v9"
                stroke="currentColor"
                strokeWidth="1.8"
              />
            </svg>
          </span>
          Detalle por tabla
        </h2>
        <div className={styles.tableWrap}>
          <table className={`${styles.table} ${styles.detailTable}`}>
            <thead>
              <tr>
                <th>Schema</th>
                <th>Tabla</th>
                <th>Filas est.</th>
                <th>Muertas</th>
                <th>Tabla (MB)</th>
                <th>Índices (MB)</th>
                <th>Total (MB)</th>
                <th>% tamaño</th>
                <th>Accesos</th>
                <th>Seq</th>
                <th>Idx</th>
                <th>Ins</th>
                <th>Upd</th>
                <th>Del</th>
                <th>Hot Upd</th>
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
                    <td>{row.estimatedRows}</td>
                    <td>{row.deadRows}</td>
                    <td>{row.tableMB}</td>
                    <td>{row.indexMB}</td>
                    <td>{row.totalMB}</td>
                    <td>{row.sizePct}%</td>
                    <td>{row.totalScans}</td>
                    <td>{row.seqScan}</td>
                    <td>{row.idxScan}</td>
                    <td>{row.inserts}</td>
                    <td>{row.updates}</td>
                    <td>{row.deletes}</td>
                    <td>{row.hotUpdates}</td>
                    <td>{row.pendingAnalyze}</td>
                    <td>{row.cacheHitRatio}%</td>
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
      </div>
    </div>
  );
}
