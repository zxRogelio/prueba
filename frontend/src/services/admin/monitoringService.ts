import { API } from "../../api/api";

export type MonitoringFilters = {
  schema?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  limit?: number;
};

export type MonitoringSummary = {
  database: string;
  tables: number;
  schemas: number;
  tablesSizeMB: string;
  databaseSizeMB: string;
};

export type MonitoringSchemaRow = {
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

export type MonitoringTableRow = {
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
  lastVacuum?: string | null;
  lastAutovacuum?: string | null;
  lastAnalyze?: string | null;
  lastAutoanalyze?: string | null;
};

export type MonitoringHighlightTable = {
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
  lastVacuum?: string | null;
  lastAutovacuum?: string | null;
  lastAnalyze?: string | null;
  lastAutoanalyze?: string | null;
};

export type MonitoringIndex = {
  schema: string;
  tableName: string;
  indexName: string;
  indexSizeMB: number;
  idxScan: number;
  isUnique: boolean;
  isPrimary: boolean;
  isValid: boolean;
  indexDefinition?: string;
  usageStatus?: "healthy" | "unused" | "low_usage" | "invalid";
  needsReview?: boolean;
};

export type MaintenanceSummary = {
  totalPendingAnalyze: number;
  totalDeadRows: number;
  tablesNeedingVacuum: number;
  tablesNeedingAnalyze: number;
};

export type MonitoringResponse = {
  summary: MonitoringSummary;
  filters?: MonitoringFilters;
  schemas: MonitoringSchemaRow[];
  tables: MonitoringTableRow[];
  highlights: {
    hottestTables: MonitoringHighlightTable[];
    biggestTables: MonitoringHighlightTable[];
  };
  indexes?: MonitoringIndex[];
  maintenance?: MaintenanceSummary;
  updatedAt: string;
};

export type MaintenancePayload = {
  schema: string;
  table?: string;
  indexName?: string;
};

export type MaintenanceActionResponse = {
  ok: boolean;
  message: string;
};

export const getPostgresMonitoring = async (
  filters: MonitoringFilters = {},
): Promise<MonitoringResponse> => {
  const { data } = await API.get("/admin/monitoring/postgres", {
    params: filters,
  });
  return data;
};

export const runVacuumAnalyze = async (
  payload: MaintenancePayload,
): Promise<MaintenanceActionResponse> => {
  const { data } = await API.post(
    "/admin/monitoring/maintenance/vacuum-analyze",
    payload,
  );
  return data;
};

export const runAnalyzeTable = async (
  payload: MaintenancePayload,
): Promise<MaintenanceActionResponse> => {
  const { data } = await API.post(
    "/admin/monitoring/maintenance/analyze",
    payload,
  );
  return data;
};

export const runReindex = async (
  payload: MaintenancePayload,
): Promise<MaintenanceActionResponse> => {
  const { data } = await API.post(
    "/admin/monitoring/maintenance/reindex",
    payload,
  );
  return data;
};