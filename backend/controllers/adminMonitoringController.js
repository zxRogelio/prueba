import { sequelize } from "../config/sequelize.js";

const bytesToMB = (bytes = 0) => Number(bytes / (1024 * 1024)).toFixed(2);

export const getPostgresMonitoring = async (req, res) => {
  try {
    const {
      schema = "all",
      search = "",
      sortBy = "total_bytes",
      sortOrder = "desc",
      limit = "200",
    } = req.query;

    const allowedSorts = new Set([
      "schema",
      "table_name",
      "est_rows",
      "dead_rows",
      "table_bytes",
      "index_bytes",
      "total_bytes",
      "seq_scan",
      "idx_scan",
      "total_scans",
      "inserts",
      "updates",
      "deletes",
      "hot_updates",
      "cache_hit_ratio",
      "size_pct",
    ]);

    const safeSortBy = allowedSorts.has(String(sortBy)) ? String(sortBy) : "total_bytes";
    const safeSortOrder = String(sortOrder).toLowerCase() === "asc" ? "ASC" : "DESC";
    const safeLimit = Math.min(Math.max(Number(limit) || 200, 1), 1000);

    const replacements = {
      schema,
      search: `%${search}%`,
      limit: safeLimit,
    };

    const [summaryRows] = await sequelize.query(`
      SELECT
        current_database() AS database,
        COUNT(*)::int AS tables,
        COUNT(DISTINCT n.nspname)::int AS schemas,
        COALESCE(SUM(pg_total_relation_size(c.oid)), 0)::bigint AS total_tables_bytes,
        pg_database_size(current_database())::bigint AS database_bytes
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE c.relkind = 'r'
        AND n.nspname NOT IN ('pg_catalog', 'information_schema');
    `);

    const [schemaRows] = await sequelize.query(
      `
      SELECT
        st.schemaname AS schema,
        COUNT(*)::int AS tables,
        COALESCE(SUM(st.n_live_tup), 0)::bigint AS est_rows,
        COALESCE(SUM(st.n_dead_tup), 0)::bigint AS dead_rows,
        COALESCE(SUM(pg_relation_size(st.relid)), 0)::bigint AS table_bytes,
        COALESCE(SUM(pg_indexes_size(st.relid)), 0)::bigint AS index_bytes,
        COALESCE(SUM(pg_total_relation_size(st.relid)), 0)::bigint AS total_bytes,
        COALESCE(SUM(st.seq_scan), 0)::bigint AS seq_scan,
        COALESCE(SUM(st.idx_scan), 0)::bigint AS idx_scan,
        COALESCE(SUM(st.seq_scan + st.idx_scan), 0)::bigint AS total_scans,
        COALESCE(SUM(st.n_tup_ins), 0)::bigint AS inserts,
        COALESCE(SUM(st.n_tup_upd), 0)::bigint AS updates,
        COALESCE(SUM(st.n_tup_del), 0)::bigint AS deletes
      FROM pg_stat_user_tables st
      GROUP BY st.schemaname
      ORDER BY total_bytes DESC;
      `,
      { replacements }
    );

    const [tableRows] = await sequelize.query(
      `
      WITH db_totals AS (
        SELECT COALESCE(SUM(pg_total_relation_size(st.relid)), 0)::numeric AS all_tables_bytes
        FROM pg_stat_user_tables st
      )
      SELECT
        st.schemaname,
        st.relname AS table_name,
        st.n_live_tup::bigint AS est_rows,
        st.n_dead_tup::bigint AS dead_rows,
        pg_relation_size(st.relid)::bigint AS table_bytes,
        pg_indexes_size(st.relid)::bigint AS index_bytes,
        pg_total_relation_size(st.relid)::bigint AS total_bytes,
        st.seq_scan::bigint AS seq_scan,
        st.idx_scan::bigint AS idx_scan,
        (st.seq_scan + st.idx_scan)::bigint AS total_scans,
        st.n_tup_ins::bigint AS inserts,
        st.n_tup_upd::bigint AS updates,
        st.n_tup_del::bigint AS deletes,
        st.n_tup_hot_upd::bigint AS hot_updates,
        st.n_mod_since_analyze::bigint AS pending_analyze,
        st.last_vacuum,
        st.last_autovacuum,
        st.last_analyze,
        st.last_autoanalyze,
        COALESCE(io.heap_blks_read, 0)::bigint AS heap_blks_read,
        COALESCE(io.heap_blks_hit, 0)::bigint AS heap_blks_hit,
        CASE
          WHEN COALESCE(io.heap_blks_hit, 0) + COALESCE(io.heap_blks_read, 0) = 0 THEN 0
          ELSE ROUND(
            (COALESCE(io.heap_blks_hit, 0)::numeric /
            (COALESCE(io.heap_blks_hit, 0) + COALESCE(io.heap_blks_read, 0))) * 100, 2
          )
        END AS cache_hit_ratio,
        CASE
          WHEN db_totals.all_tables_bytes = 0 THEN 0
          ELSE ROUND((pg_total_relation_size(st.relid)::numeric / db_totals.all_tables_bytes) * 100, 2)
        END AS size_pct
      FROM pg_stat_user_tables st
      JOIN pg_statio_user_tables io
        ON io.relid = st.relid
      CROSS JOIN db_totals
      WHERE (:schema = 'all' OR st.schemaname = :schema)
        AND (:search = '%%' OR st.relname ILIKE :search)
      ORDER BY ${safeSortBy} ${safeSortOrder}
      LIMIT :limit;
      `,
      { replacements }
    );

    const summary = summaryRows[0] || {};

    const transformedSchemaRows = schemaRows.map((row) => ({
      schema: row.schema,
      tables: Number(row.tables || 0),
      estimatedRows: Number(row.est_rows || 0),
      deadRows: Number(row.dead_rows || 0),
      tableMB: bytesToMB(row.table_bytes),
      indexMB: bytesToMB(row.index_bytes),
      totalMB: bytesToMB(row.total_bytes),
      seqScan: Number(row.seq_scan || 0),
      idxScan: Number(row.idx_scan || 0),
      totalScans: Number(row.total_scans || 0),
      inserts: Number(row.inserts || 0),
      updates: Number(row.updates || 0),
      deletes: Number(row.deletes || 0),
    }));

    const transformedTables = tableRows.map((row) => ({
      schema: row.schemaname,
      table: row.table_name,
      estimatedRows: Number(row.est_rows || 0),
      deadRows: Number(row.dead_rows || 0),
      tableMB: bytesToMB(row.table_bytes),
      indexMB: bytesToMB(row.index_bytes),
      totalMB: bytesToMB(row.total_bytes),
      sizePct: Number(row.size_pct || 0),
      seqScan: Number(row.seq_scan || 0),
      idxScan: Number(row.idx_scan || 0),
      totalScans: Number(row.total_scans || 0),
      inserts: Number(row.inserts || 0),
      updates: Number(row.updates || 0),
      deletes: Number(row.deletes || 0),
      hotUpdates: Number(row.hot_updates || 0),
      pendingAnalyze: Number(row.pending_analyze || 0),
      heapBlocksRead: Number(row.heap_blks_read || 0),
      heapBlocksHit: Number(row.heap_blks_hit || 0),
      cacheHitRatio: Number(row.cache_hit_ratio || 0),
      lastVacuum: row.last_vacuum,
      lastAutovacuum: row.last_autovacuum,
      lastAnalyze: row.last_analyze,
      lastAutoanalyze: row.last_autoanalyze,
    }));

    const hottestTables = [...transformedTables]
      .sort((a, b) => b.totalScans - a.totalScans)
      .slice(0, 5);

    const biggestTables = [...transformedTables]
      .sort((a, b) => Number(b.totalMB) - Number(a.totalMB))
      .slice(0, 5);

    return res.json({
      summary: {
        database: summary.database || "unknown",
        tables: Number(summary.tables || 0),
        schemas: Number(summary.schemas || 0),
        tablesSizeMB: bytesToMB(summary.total_tables_bytes),
        databaseSizeMB: bytesToMB(summary.database_bytes),
      },
      filters: {
        schema,
        search,
        sortBy: safeSortBy,
        sortOrder: safeSortOrder.toLowerCase(),
        limit: safeLimit,
      },
      schemas: transformedSchemaRows,
      tables: transformedTables,
      highlights: {
        hottestTables,
        biggestTables,
      },
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    return res.status(500).json({
      error: "No se pudieron obtener métricas de PostgreSQL",
      detail: error.message,
    });
  }
};