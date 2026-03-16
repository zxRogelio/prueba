import 'dotenv/config';
import { Client } from 'pg';

const connectionString = process.env.DATABASE_URL_RUNTIME || process.env.DATABASE_URL;

if (!connectionString) {
  console.error('❌ Falta DATABASE_URL_RUNTIME o DATABASE_URL para conectar a PostgreSQL.');
  process.exit(1);
}

const bytesToMB = (bytes = 0) => Number(bytes / (1024 * 1024)).toFixed(2);

async function main() {
  const client = new Client({ connectionString });
  await client.connect();

  const summaryQuery = `
    SELECT
      current_database() AS database,
      COUNT(*)::int AS tables,
      COALESCE(SUM(pg_total_relation_size(c.oid)), 0)::bigint AS total_tables_bytes,
      pg_database_size(current_database())::bigint AS database_bytes
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relkind = 'r'
      AND n.nspname NOT IN ('pg_catalog', 'information_schema');
  `;

  const tableDetailsQuery = `
    SELECT
      st.schemaname,
      st.relname AS table_name,
      st.n_live_tup::bigint AS est_rows,
      pg_relation_size(st.relid)::bigint AS table_bytes,
      pg_indexes_size(st.relid)::bigint AS index_bytes,
      pg_total_relation_size(st.relid)::bigint AS total_bytes,
      st.seq_scan::bigint,
      st.idx_scan::bigint
    FROM pg_stat_user_tables st
    ORDER BY pg_total_relation_size(st.relid) DESC;
  `;

  const summaryResult = await client.query(summaryQuery);
  const detailResult = await client.query(tableDetailsQuery);

  const summary = summaryResult.rows[0] || {
    database: 'unknown',
    tables: 0,
    total_tables_bytes: 0,
    database_bytes: 0,
  };

  const rows = detailResult.rows.map((row) => ({
    schema: row.schemaname,
    table: row.table_name,
    estimatedRows: Number(row.est_rows || 0),
    tableMB: bytesToMB(row.table_bytes),
    indexMB: bytesToMB(row.index_bytes),
    totalMB: bytesToMB(row.total_bytes),
    seqScan: Number(row.seq_scan || 0),
    idxScan: Number(row.idx_scan || 0),
  }));

  console.log('\n📊 Resumen PostgreSQL');
  console.table([
    {
      database: summary.database,
      tables: Number(summary.tables || 0),
      tablesSizeMB: bytesToMB(summary.total_tables_bytes),
      databaseSizeMB: bytesToMB(summary.database_bytes),
    },
  ]);

  console.log('\n Tamaño y uso por tabla');
  console.table(rows);

  await client.end();
}

main().catch(async (error) => {
  console.error('Error obteniendo métricas de PostgreSQL:', error.message);
  process.exit(1);
});