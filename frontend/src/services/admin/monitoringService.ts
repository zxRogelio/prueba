import { API } from "../../api/api";

export type MonitoringFilters = {
  schema?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  limit?: number;
};

export type Summary = {
  database: string;
  tables: number;
  schemas: number;
  tablesSizeMB: string;
  databaseSizeMB: string;
};

export type SchemaMetric = {
  schema: string;
  tables: number;
  estimatedRows: number;
  deadRows: number;
  tableMB: string;
  indexMB: string;
  totalMB: string;
  seqScan: number;
  idxScan: number;
  totalScans: number;
  inserts: number;
  updates: number;
  deletes: number;
};

export type TableMetric = {
  schema: string;
  table: string;
  estimatedRows: number;
  deadRows: number;
  tableMB: string;
  indexMB: string;
  totalMB: string;
  sizePct: number;
  seqScan: number;
  idxScan: number;
  totalScans: number;
  inserts: number;
  updates: number;
  deletes: number;
  hotUpdates: number;
  pendingAnalyze: number;
  heapBlocksRead: number;
  heapBlocksHit: number;
  cacheHitRatio: number;
  lastVacuum: string | null;
  lastAutovacuum: string | null;
  lastAnalyze: string | null;
  lastAutoanalyze: string | null;
};

export type MonitoringResponse = {
  summary: Summary;
  filters: MonitoringFilters;
  schemas: SchemaMetric[];
  tables: TableMetric[];
  highlights: {
    hottestTables: TableMetric[];
    biggestTables: TableMetric[];
  };
  updatedAt: string;
};

export async function getPostgresMonitoring(filters: MonitoringFilters = {}) {
  const { data } = await API.get("/admin/monitoring/postgres", {
    params: filters,
  });
  return data;
}