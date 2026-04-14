import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  BadgeCheck,
  CalendarClock,
  CircleAlert,
  Clock3,
  CloudAlert,
  CloudBackup,
  CloudCheck,
  Database,
  DatabaseBackup,
  Download,
  FileText,
  FolderOpen,
  HardDrive,
  HardDriveDownload,
  History,
  LayoutDashboard,
  Play,
  ShieldCheck,
  SlidersHorizontal,
  Table2,
  Trash2,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import styles from "./AdminBackupsPage.module.css";
import {
  createBackup,
  createBackupSchedule,
  deleteBackupSchedule,
  downloadBackupFile,
  getBackupOptions,
  getBackupLogContent,
  listBackups,
  listBackupSchedules,
  runBackupScheduleNow,
  type BackupMode,
  type BackupRecord,
  type BackupScope,
  type BackupSchedule,
} from "../../services/admin/backupService";

type TabKey = "overview" | "manual" | "schedules" | "history";
type ToastType = "success" | "error" | "info";
type HistoryOriginFilter = "all" | "manual" | "scheduled";
type HistoryStorageFilter = "all" | "local" | "cloud";
type Tone = "red" | "blue" | "green" | "amber" | "slate";

type ToastItem = {
  id: number;
  type: ToastType;
  title: string;
  message: string;
};

type LogViewerState = {
  open: boolean;
  loading: boolean;
  filename: string;
  content: string;
};

const HISTORY_PAGE_SIZE = 6;
const CHART_COLORS = {
  red: "#ef4444",
  rose: "#f43f5e",
  coral: "#fb7185",
  blush: "#fda4af",
  amber: "#fb7185",
  wine: "#7f1d1d",
  axis: "#64748b",
  grid: "rgba(148, 163, 184, 0.18)",
};

const formatDate = (value?: string | null) => {
  if (!value) return "N/D";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "N/D";
  return date.toLocaleString("es-MX", {
    dateStyle: "medium",
    timeStyle: "short",
  });
};

const getErrorMessage = (error: unknown, fallback: string) => {
  if (typeof error === "object" && error !== null) {
    const maybeResponse = (
      error as { response?: { data?: { error?: string; detail?: string } } }
    ).response;

    if (maybeResponse?.data?.error) return maybeResponse.data.error;
    if (maybeResponse?.data?.detail) return maybeResponse.data.detail;
  }

  if (error instanceof Error && error.message) return error.message;

  return fallback;
};

const getErrorLogFilename = (error: unknown) => {
  if (typeof error !== "object" || error === null) return null;

  return (
    (
      error as {
        response?: { data?: { log?: { filename?: string | null } | null } };
      }
    ).response?.data?.log?.filename || null
  );
};

const getScopeLabel = (scope?: BackupScope | string | null) => {
  if (scope === "full") return "Base completa";
  if (scope === "table") return "Tabla especifica";
  return "Respaldo";
};

const getModeLabel = (mode?: BackupMode | string | null) => {
  if (mode === "data-only") return "Solo datos";
  if (mode === "schema-and-data") return "Estructura + datos";
  return "No identificado";
};

const hasCloudCopy = (backup: BackupRecord) =>
  backup.source === "cloudinary" || Boolean(backup.cloudinary?.url);

const isManualBackup = (backup: BackupRecord) => backup.origin !== "scheduled";

const getOriginLabel = (origin?: BackupRecord["origin"]) =>
  origin === "scheduled" ? "Programado" : "Manual";

const getSourceLabel = (backup: BackupRecord) => {
  if (backup.source === "cloudinary") return "Nube / Cloudinary";
  if (backup.source === "local" && hasCloudCopy(backup)) return "Local + nube";
  if (backup.source === "local") return "Local";
  if (hasCloudCopy(backup)) return "Nube / Cloudinary";
  return "Desconocido";
};

const parseDateFilterValue = (value: string, endOfDay = false) => {
  if (!value) return null;

  const [year, month, day] = value.split("-").map(Number);

  if (!year || !month || !day) return null;

  return endOfDay
    ? new Date(year, month - 1, day, 23, 59, 59, 999)
    : new Date(year, month - 1, day, 0, 0, 0, 0);
};

const getRunStatusTone = (status?: string | null): Tone => {
  const normalized = status?.toLowerCase() || "";

  if (
    normalized.includes("success") ||
    normalized.includes("ok") ||
    normalized.includes("complet") ||
    normalized.includes("exito")
  ) {
    return "green";
  }

  if (
    normalized.includes("error") ||
    normalized.includes("fail") ||
    normalized.includes("fall")
  ) {
    return "red";
  }

  if (
    normalized.includes("pend") ||
    normalized.includes("wait") ||
    normalized.includes("cola")
  ) {
    return "amber";
  }

  return "slate";
};

const cronPresets = [
  { label: "Diario 3:00 AM", value: "0 3 * * *" },
  { label: "Cada 12 horas", value: "0 */12 * * *" },
  { label: "Cada 30 minutos", value: "*/30 * * * *" },
  { label: "Domingos 2:00 AM", value: "0 2 * * 0" },
];

const emptyScheduleForm = {
  enabled: true,
  cronExpression: "0 3 * * *",
  scope: "full" as BackupScope,
  schema: "",
  table: "",
  mode: "schema-and-data" as BackupMode,
  uploadToCloudinary: false,
  timezone: "America/Mexico_City",
};

export default function AdminBackupsPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("overview");

  const [scope, setScope] = useState<BackupScope>("full");
  const [mode, setMode] = useState<BackupMode>("schema-and-data");
  const [selectedTable, setSelectedTable] = useState("");
  const [uploadToCloudinary, setUploadToCloudinary] = useState(false);

  const [cloudinaryEnabled, setCloudinaryEnabled] = useState(false);
  const [backupsPath, setBackupsPath] = useState("");
  const [tables, setTables] = useState<Array<{ schema: string; table: string }>>(
    [],
  );
  const [backups, setBackups] = useState<BackupRecord[]>([]);
  const [schedules, setSchedules] = useState<BackupSchedule[]>([]);

  const [loadingBackups, setLoadingBackups] = useState(true);
  const [loadingSchedules, setLoadingSchedules] = useState(true);
  const [creatingBackup, setCreatingBackup] = useState(false);
  const [savingSchedule, setSavingSchedule] = useState(false);
  const [runningScheduleId, setRunningScheduleId] = useState<string | null>(null);
  const [deletingScheduleId, setDeletingScheduleId] = useState<string | null>(null);

  const [scheduleForm, setScheduleForm] = useState(emptyScheduleForm);
  const [historyOriginFilter, setHistoryOriginFilter] =
    useState<HistoryOriginFilter>("all");
  const [historyStorageFilter, setHistoryStorageFilter] =
    useState<HistoryStorageFilter>("all");
  const [historyStartDate, setHistoryStartDate] = useState("");
  const [historyEndDate, setHistoryEndDate] = useState("");
  const [historyPage, setHistoryPage] = useState(1);

  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [logViewer, setLogViewer] = useState<LogViewerState>({
    open: false,
    loading: false,
    filename: "",
    content: "",
  });

  const pushToast = (type: ToastType, title: string, message: string) => {
    const id = Date.now() + Math.floor(Math.random() * 1000);

    setToasts((prev) => [...prev, { id, type, title, message }]);

    window.setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, 4200);
  };

  const removeToast = (id: number) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  const closeLogViewer = () => {
    setLogViewer({
      open: false,
      loading: false,
      filename: "",
      content: "",
    });
  };

  const handleOpenLog = async (filename?: string | null) => {
    if (!filename) {
      pushToast(
        "error",
        "Log no disponible",
        "Esta ejecucion no tiene un log asociado.",
      );
      return;
    }

    setLogViewer({
      open: true,
      loading: true,
      filename,
      content: "",
    });

    try {
      const response = await getBackupLogContent(filename);

      setLogViewer({
        open: true,
        loading: false,
        filename: response.filename,
        content: response.content,
      });
    } catch (error: unknown) {
      setLogViewer((prev) => ({
        ...prev,
        loading: false,
        content: "",
      }));

      pushToast(
        "error",
        "Error al cargar log",
        getErrorMessage(error, "No se pudo abrir el log solicitado."),
      );
    }
  };

  const loadData = async () => {
    setLoadingBackups(true);
    setLoadingSchedules(true);

    try {
      const [optionsResponse, backupsResponse, schedulesResponse] =
        await Promise.all([
          getBackupOptions(),
          listBackups(),
          listBackupSchedules(),
        ]);

      setTables(optionsResponse.tables || []);
      setBackups(backupsResponse.backups || []);
      setSchedules(schedulesResponse.schedules || []);
      setCloudinaryEnabled(Boolean(optionsResponse.cloudinaryEnabled));
      setBackupsPath(optionsResponse.backupsPath || "");

      if (optionsResponse.tables.length > 0) {
        const first = optionsResponse.tables[0];
        const firstFull = `${first.schema}.${first.table}`;

        if (!selectedTable) {
          setSelectedTable(firstFull);
        }

        setScheduleForm((prev) => ({
          ...prev,
          schema: prev.schema || first.schema,
          uploadToCloudinary:
            prev.uploadToCloudinary && optionsResponse.cloudinaryEnabled,
        }));
      }
    } catch (error: unknown) {
      pushToast(
        "error",
        "Error al cargar datos",
        getErrorMessage(
          error,
          "No se pudieron cargar respaldos o programaciones.",
        ),
      );
    } finally {
      setLoadingBackups(false);
      setLoadingSchedules(false);
    }
  };

  useEffect(() => {
    void loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setHistoryPage(1);
  }, [historyEndDate, historyOriginFilter, historyStartDate, historyStorageFilter]);

  const tableOptions = useMemo(
    () =>
      tables.map((item) => ({
        value: `${item.schema}.${item.table}`,
        label: `${item.schema}.${item.table}`,
      })),
    [tables],
  );

  const schemaOptions = useMemo(() => {
    return Array.from(new Set(tables.map((item) => item.schema)));
  }, [tables]);

  const scheduleTableOptions = useMemo(() => {
    if (!scheduleForm.schema) return [];
    return tables.filter((item) => item.schema === scheduleForm.schema);
  }, [tables, scheduleForm.schema]);

  const summaryCards = useMemo(() => {
    const totalBackups = backups.length;
    const scheduledBackups = backups.filter(
      (item) => item.origin === "scheduled",
    ).length;
    const manualBackups = backups.filter(
      (item) => item.origin !== "scheduled",
    ).length;
    const activeSchedules = schedules.filter((item) => item.enabled).length;

    return {
      totalBackups,
      scheduledBackups,
      manualBackups,
      activeSchedules,
    };
  }, [backups, schedules]);

  const latestScheduledBackups = useMemo(() => {
    return backups.filter((item) => item.origin === "scheduled").slice(0, 5);
  }, [backups]);

  const filteredHistoryBackups = useMemo(() => {
    const startDate = parseDateFilterValue(historyStartDate);
    const endDate = parseDateFilterValue(historyEndDate, true);

    return backups.filter((backup) => {
      const createdAt = backup.createdAt ? new Date(backup.createdAt) : null;

      const matchesOrigin =
        historyOriginFilter === "all" ||
        (historyOriginFilter === "manual"
          ? isManualBackup(backup)
          : backup.origin === "scheduled");

      const matchesStorage =
        historyStorageFilter === "all" ||
        (historyStorageFilter === "cloud"
          ? hasCloudCopy(backup)
          : !hasCloudCopy(backup));

      if (!matchesOrigin || !matchesStorage) return false;

      if (!createdAt || Number.isNaN(createdAt.getTime())) {
        return !startDate && !endDate;
      }

      if (startDate && createdAt < startDate) return false;
      if (endDate && createdAt > endDate) return false;

      return true;
    });
  }, [
    backups,
    historyEndDate,
    historyOriginFilter,
    historyStartDate,
    historyStorageFilter,
  ]);

  const historySummaryCards = useMemo(() => {
    return {
      total: backups.length,
      manuals: backups.filter(isManualBackup).length,
      cloud: backups.filter(hasCloudCopy).length,
      visible: filteredHistoryBackups.length,
    };
  }, [backups, filteredHistoryBackups.length]);

  const totalHistoryPages = Math.max(
    1,
    Math.ceil(filteredHistoryBackups.length / HISTORY_PAGE_SIZE),
  );

  useEffect(() => {
    if (historyPage > totalHistoryPages) {
      setHistoryPage(totalHistoryPages);
    }
  }, [historyPage, totalHistoryPages]);

  const paginatedHistoryBackups = useMemo(() => {
    const startIndex = (historyPage - 1) * HISTORY_PAGE_SIZE;
    return filteredHistoryBackups.slice(
      startIndex,
      startIndex + HISTORY_PAGE_SIZE,
    );
  }, [filteredHistoryBackups, historyPage]);

  const hasActiveHistoryFilters = Boolean(
    historyOriginFilter !== "all" ||
      historyStorageFilter !== "all" ||
      historyStartDate ||
      historyEndDate,
  );

  const historyResultsLabel = useMemo(() => {
    if (filteredHistoryBackups.length === 0) {
      return "0 resultados";
    }

    const startIndex = (historyPage - 1) * HISTORY_PAGE_SIZE + 1;
    const endIndex = startIndex + paginatedHistoryBackups.length - 1;

    return `Mostrando ${startIndex}-${endIndex} de ${filteredHistoryBackups.length} respaldos`;
  }, [filteredHistoryBackups.length, historyPage, paginatedHistoryBackups.length]);

  const displayedHistoryPage =
    filteredHistoryBackups.length === 0 ? 0 : Math.min(historyPage, totalHistoryPages);
  const displayedHistoryPages =
    filteredHistoryBackups.length === 0 ? 0 : totalHistoryPages;

  const clearHistoryFilters = () => {
    setHistoryOriginFilter("all");
    setHistoryStorageFilter("all");
    setHistoryStartDate("");
    setHistoryEndDate("");
  };

  const handleCreateBackup = async () => {
    setCreatingBackup(true);

    try {
      const [schema, table] = selectedTable.split(".");

      const payload =
        scope === "table"
          ? { scope, schema, table, uploadToCloudinary, mode }
          : { scope, uploadToCloudinary, mode };

      const response = await createBackup(payload);

      pushToast(
        "success",
        "Backup generado",
        response.message || "El respaldo se genero correctamente.",
      );

      await loadData();
    } catch (error: unknown) {
      const logFilename = getErrorLogFilename(error);

      pushToast(
        "error",
        "Error al generar backup",
        logFilename
          ? `${getErrorMessage(error, "No se pudo generar el backup.")} Log: ${logFilename}`
          : getErrorMessage(error, "No se pudo generar el backup."),
      );

      if (logFilename) {
        await handleOpenLog(logFilename);
      }
    } finally {
      setCreatingBackup(false);
    }
  };

  const handleCreateSchedule = async () => {
    setSavingSchedule(true);

    try {
      if (scheduleForm.scope === "table" && !scheduleForm.table) {
        pushToast(
          "error",
          "Tabla requerida",
          "Debes elegir una tabla para una programacion por tabla.",
        );
        return;
      }

      const response = await createBackupSchedule({
        enabled: scheduleForm.enabled,
        cronExpression: scheduleForm.cronExpression,
        scope: scheduleForm.scope,
        schema: scheduleForm.schema,
        table: scheduleForm.scope === "table" ? scheduleForm.table : null,
        mode: scheduleForm.mode,
        uploadToCloudinary: scheduleForm.uploadToCloudinary,
        timezone: scheduleForm.timezone,
      });

      pushToast(
        "success",
        "Programacion creada",
        response.message || "La programacion se guardo correctamente.",
      );

      setScheduleForm((prev) => ({
        ...prev,
        table: "",
      }));

      await loadData();
      setActiveTab("schedules");
    } catch (error: unknown) {
      pushToast(
        "error",
        "Error al crear programacion",
        getErrorMessage(error, "No se pudo crear la programacion."),
      );
    } finally {
      setSavingSchedule(false);
    }
  };

  const handleDeleteSchedule = async (id: string) => {
    setDeletingScheduleId(id);

    try {
      const response = await deleteBackupSchedule(id);

      pushToast(
        "success",
        "Programacion eliminada",
        response.message || "La programacion se elimino correctamente.",
      );

      await loadData();
    } catch (error: unknown) {
      pushToast(
        "error",
        "Error al eliminar programacion",
        getErrorMessage(error, "No se pudo eliminar la programacion."),
      );
    } finally {
      setDeletingScheduleId(null);
    }
  };

  const handleRunScheduleNow = async (id: string) => {
    setRunningScheduleId(id);

    try {
      const response = await runBackupScheduleNow(id);

      if (response.schedule.lastRunStatus === "error") {
        pushToast(
          "error",
          "Programacion ejecutada con error",
          response.schedule.lastRunMessage ||
            "La programacion termino con error. Revisa el log.",
        );

        await loadData();

        if (response.schedule.lastRunLogFilename) {
          await handleOpenLog(response.schedule.lastRunLogFilename);
        }

        return;
      }

      pushToast(
        "success",
        "Programacion ejecutada",
        response.message || "La programacion se ejecuto correctamente.",
      );

      await loadData();
    } catch (error: unknown) {
      pushToast(
        "error",
        "Error al ejecutar programacion",
        getErrorMessage(error, "No se pudo ejecutar la programacion."),
      );
    } finally {
      setRunningScheduleId(null);
    }
  };

  const handleDownloadBackup = async (backup: BackupRecord) => {
    try {
      if (!backup.downloadUrl && !backup.cloudinary?.url) {
        pushToast(
          "error",
          "Descarga no disponible",
          "Este respaldo no tiene una ruta de descarga disponible.",
        );
        return;
      }

      await downloadBackupFile(
        backup.downloadUrl,
        backup.filename,
        backup.cloudinary?.url,
      );

      pushToast(
        "success",
        "Descarga completada",
        `El archivo ${backup.filename} se descargo correctamente.`,
      );
    } catch (error: unknown) {
      pushToast(
        "error",
        "Error al descargar",
        getErrorMessage(error, "No se pudo descargar el respaldo."),
      );
    }
  };

  const getToneClassName = (tone: Tone) => {
    if (tone === "green") return styles.toneGreen;
    if (tone === "blue") return styles.toneBlue;
    if (tone === "amber") return styles.toneAmber;
    if (tone === "red") return styles.toneRed;
    return styles.toneSlate;
  };

  const getToastIcon = (type: ToastType) => {
    if (type === "success") return BadgeCheck;
    if (type === "error") return CircleAlert;
    return Activity;
  };

  const tabItems = [
    { key: "overview" as const, label: "Resumen", icon: LayoutDashboard },
    { key: "manual" as const, label: "Backup manual", icon: DatabaseBackup },
    {
      key: "schedules" as const,
      label: "Programaciones",
      icon: CalendarClock,
    },
    { key: "history" as const, label: "Historial", icon: History },
  ];

  const storageLocationLabel = backupsPath ? "Servidor" : "No disponible";

  const heroHighlights = [
    {
      label: "Ruta local",
      value: storageLocationLabel,
      icon: FolderOpen,
      tone: "slate" as Tone,
    },
    {
      label: "Nube",
      value: cloudinaryEnabled ? "Cloudinary activo" : "Sin configuracion",
      icon: cloudinaryEnabled ? CloudCheck : CloudAlert,
      tone: (cloudinaryEnabled ? "green" : "amber") as Tone,
    },
    {
      label: "Tablas detectadas",
      value: String(tables.length),
      icon: Table2,
      tone: "blue" as Tone,
    },
  ];

  const metricItems = [
    {
      label: "Respaldos totales",
      value: summaryCards.totalBackups,
      helper: "Registros acumulados.",
      icon: Database,
      tone: "red" as Tone,
    },
    {
      label: "Manuales",
      value: summaryCards.manualBackups,
      helper: "Generados desde este panel.",
      icon: HardDriveDownload,
      tone: "blue" as Tone,
    },
    {
      label: "Programados",
      value: summaryCards.scheduledBackups,
      helper: "Corren por cron.",
      icon: CalendarClock,
      tone: "amber" as Tone,
    },
    {
      label: "Programaciones activas",
      value: summaryCards.activeSchedules,
      helper: "Listas para ejecutarse.",
      icon: ShieldCheck,
      tone: "green" as Tone,
    },
  ];

  const overviewStatusItems = [
    {
      label: "Ruta local",
      value: storageLocationLabel,
      helper: "Ubicacion actual donde se almacenan los archivos.",
      icon: FolderOpen,
      tone: "slate" as Tone,
    },
    {
      label: "Cloudinary",
      value: cloudinaryEnabled ? "Disponible" : "No configurado",
      helper: cloudinaryEnabled
        ? "Se puede mantener copia remota."
        : "Solo se mantendra copia local.",
      icon: cloudinaryEnabled ? CloudCheck : CloudAlert,
      tone: (cloudinaryEnabled ? "green" : "amber") as Tone,
    },
    {
      label: "Programaciones activas",
      value: String(summaryCards.activeSchedules),
      helper: "Jobs habilitados actualmente.",
      icon: CalendarClock,
      tone: "red" as Tone,
    },
    {
      label: "Tablas detectadas",
      value: String(tables.length),
      helper: "Disponibles para respaldos por tabla.",
      icon: Table2,
      tone: "blue" as Tone,
    },
  ];

  const manualHighlights = [
    {
      label: "Alcance",
      value:
        scope === "table" && selectedTable ? selectedTable : "Base completa",
      helper:
        scope === "table"
          ? "Se respalda solo la tabla elegida."
          : "Incluye toda la base de datos.",
      icon: scope === "table" ? Table2 : Database,
      tone: "red" as Tone,
    },
    {
      label: "Modo",
      value: getModeLabel(mode),
      helper:
        mode === "data-only"
          ? "Ideal para restauraciones enfocadas en contenido."
          : "Conserva estructura y contenido.",
      icon: Activity,
      tone: "blue" as Tone,
    },
    {
      label: "Destino",
      value:
        uploadToCloudinary && cloudinaryEnabled
          ? "Local + Cloudinary"
          : "Solo local",
      helper:
        uploadToCloudinary && cloudinaryEnabled
          ? "Mantendra copia remota y local."
          : "Se guardara unicamente en disco.",
      icon:
        uploadToCloudinary && cloudinaryEnabled ? CloudBackup : HardDrive,
      tone:
        uploadToCloudinary && cloudinaryEnabled
          ? ("green" as Tone)
          : ("slate" as Tone),
    },
  ];

  const scheduleHighlights = [
    {
      label: "Programaciones activas",
      value: String(summaryCards.activeSchedules),
      helper: "Tareas habilitadas en este momento.",
      icon: BadgeCheck,
      tone: "green" as Tone,
    },
    {
      label: "Presets cron",
      value: String(cronPresets.length),
      helper: "Atajos para crear horarios frecuentes.",
      icon: CalendarClock,
      tone: "amber" as Tone,
    },
    {
      label: "Esquemas detectados",
      value: String(schemaOptions.length),
      helper: "Base disponible para segmentar respaldos.",
      icon: Table2,
      tone: "blue" as Tone,
    },
  ];

  const historyCards = [
    {
      label: "Total historial",
      value: historySummaryCards.total,
      helper: "Respaldos registrados.",
      icon: Database,
      tone: "red" as Tone,
    },
    {
      label: "Manuales",
      value: historySummaryCards.manuals,
      helper: "Generados desde el panel.",
      icon: HardDriveDownload,
      tone: "blue" as Tone,
    },
    {
      label: "En nube",
      value: historySummaryCards.cloud,
      helper: "Con copia en Cloudinary.",
      icon: CloudBackup,
      tone: "green" as Tone,
    },
    {
      label: "Resultados",
      value: historySummaryCards.visible,
      helper: "Segun los filtros activos.",
      icon: SlidersHorizontal,
      tone: "amber" as Tone,
    },
  ];

  const backupCompositionData = useMemo(
    () =>
      [
        {
          name: "Manual · local",
          value: backups.filter(
            (item) => isManualBackup(item) && !hasCloudCopy(item),
          ).length,
          color: CHART_COLORS.red,
        },
        {
          name: "Manual · nube",
          value: backups.filter(
            (item) => isManualBackup(item) && hasCloudCopy(item),
          ).length,
          color: CHART_COLORS.rose,
        },
        {
          name: "Programado · local",
          value: backups.filter(
            (item) => item.origin === "scheduled" && !hasCloudCopy(item),
          ).length,
          color: CHART_COLORS.amber,
        },
        {
          name: "Programado · nube",
          value: backups.filter(
            (item) => item.origin === "scheduled" && hasCloudCopy(item),
          ).length,
          color: CHART_COLORS.wine,
        },
      ].filter((item) => item.value > 0),
    [backups],
  );

  const backupCompositionSeries = useMemo(
    () =>
      backupCompositionData.map((item) => ({
        ...item,
        name: item.name.replace("Â·", "-"),
      })),
    [backupCompositionData],
  );

  const scopeCoverageData = useMemo(
    () => [
      {
        name: "Base completa",
        manual: backups.filter(
          (item) => item.scope === "full" && isManualBackup(item),
        ).length,
        scheduled: backups.filter(
          (item) => item.scope === "full" && item.origin === "scheduled",
        ).length,
      },
      {
        name: "Por tabla",
        manual: backups.filter(
          (item) => item.scope === "table" && isManualBackup(item),
        ).length,
        scheduled: backups.filter(
          (item) => item.scope === "table" && item.origin === "scheduled",
        ).length,
      },
    ],
    [backups],
  );

  const chartHighlights = [
    {
      label: "Copia remota",
      value: `${historySummaryCards.cloud} respaldos`,
      helper: "Backups con salida a Cloudinary.",
      tone: "red" as Tone,
      icon: CloudBackup,
    },
    {
      label: "Operacion manual",
      value: `${summaryCards.manualBackups} ejecuciones`,
      helper: "Generadas directamente por el panel.",
      tone: "red" as Tone,
      icon: HardDriveDownload,
    },
    {
      label: "Cobertura por tabla",
      value: `${backups.filter((item) => item.scope === "table").length} registros`,
      helper: "Respaldos segmentados por tabla.",
      tone: "red" as Tone,
      icon: Table2,
    },
  ];

  return (
    <div className={styles.page}>
      <div className={styles.toastContainer}>
        {toasts.map((toast) => {
          const ToastIcon = getToastIcon(toast.type);

          return (
            <div
              key={toast.id}
              className={`${styles.toast} ${
                toast.type === "success"
                  ? styles.toastSuccess
                  : toast.type === "error"
                    ? styles.toastError
                    : styles.toastInfo
              }`}
            >
              <span className={styles.toastIconWrap}>
                <ToastIcon size={18} />
              </span>

              <div className={styles.toastBody}>
                <strong>{toast.title}</strong>
                <p>{toast.message}</p>
              </div>

              <button
                className={styles.toastClose}
                onClick={() => removeToast(toast.id)}
                type="button"
              >
                &times;
              </button>
            </div>
          );
        })}
      </div>

      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <div className={styles.heroText}>
            <span className={styles.heroBadge}>
              <ShieldCheck size={14} />
              Backups y automatizacion
            </span>

            <h1 className={styles.title}>Panel de respaldos</h1>

            <p className={styles.subtitle}>
              Crea backups manuales, programa respaldos automaticos y mantiene
              visibilidad completa del estado local y en la nube desde una sola
              pantalla.
            </p>
          </div>

          <div className={styles.heroQuickGrid}>
            {heroHighlights.map((item) => {
              const Icon = item.icon;

              return (
                <div key={item.label} className={styles.heroQuickCard}>
                  <span
                    className={`${styles.iconShell} ${getToneClassName(item.tone)}`}
                  >
                    <Icon size={18} />
                  </span>

                  <div className={styles.heroQuickCopy}>
                    <span className={styles.heroQuickLabel}>{item.label}</span>
                    <strong className={styles.heroQuickValue}>{item.value}</strong>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className={styles.metricsGrid}>
        {metricItems.map((item) => {
          const Icon = item.icon;

          return (
            <div key={item.label} className={styles.metricCard}>
              <div className={styles.metricHeader}>
                <span
                  className={`${styles.iconShell} ${getToneClassName(item.tone)}`}
                >
                  <Icon size={18} />
                </span>
                <span className={styles.metricLabel}>{item.label}</span>
              </div>

              <strong className={styles.metricValue}>{item.value}</strong>
              <small className={styles.metricHelper}>{item.helper}</small>
            </div>
          );
        })}
      </section>

      <section className={styles.tabsSection}>
        <div className={styles.tabs}>
          {tabItems.map((tab) => {
            const Icon = tab.icon;

            return (
              <button
                key={tab.key}
                className={`${styles.tabBtn} ${
                  activeTab === tab.key ? styles.tabBtnActive : ""
                }`}
                onClick={() => setActiveTab(tab.key)}
                type="button"
              >
                <span className={styles.tabBtnIcon}>
                  <Icon size={16} />
                </span>
                {tab.label}
              </button>
            );
          })}
        </div>

        {activeTab === "overview" && (
          <div className={styles.tabContent}>
            <div className={styles.sectionHeader}>
              <div className={styles.sectionHeading}>
                <span className={styles.sectionIcon}>
                  <LayoutDashboard size={18} />
                </span>
                <div>
                  <h2>Resumen general</h2>
                  <p>
                    Estado actual de respaldos, disponibilidad de nube y ultimos
                    movimientos automaticos.
                  </p>
                </div>
              </div>

              <span className={styles.sectionTag}>Vista ejecutiva</span>
            </div>

            <div className={styles.overviewGrid}>
              <div className={`${styles.card} ${styles.cardAccent}`}>
                <div className={styles.cardHeader}>
                  <div className={styles.cardTitleWrap}>
                    <span className={`${styles.iconShell} ${styles.toneGreen}`}>
                      <ShieldCheck size={18} />
                    </span>
                    <div className={styles.cardTitleCopy}>
                      <h3>Estado del sistema</h3>
                      <p>Configuracion clave para respaldo local y remoto.</p>
                    </div>
                  </div>

                  <span className={styles.cardPill}>Operativo</span>
                </div>

                <div className={styles.infoGrid}>
                  {overviewStatusItems.map((item) => {
                    const Icon = item.icon;

                    return (
                      <div key={item.label} className={styles.infoBox}>
                        <div className={styles.infoBoxHeader}>
                          <span
                            className={`${styles.iconShell} ${getToneClassName(item.tone)}`}
                          >
                            <Icon size={16} />
                          </span>
                          <strong>{item.label}</strong>
                        </div>

                        <div className={styles.infoValue}>{item.value}</div>
                        <span className={styles.infoHint}>{item.helper}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className={styles.card}>
                <div className={styles.cardHeader}>
                  <div className={styles.cardTitleWrap}>
                    <span className={`${styles.iconShell} ${styles.toneAmber}`}>
                      <History size={18} />
                    </span>
                    <div className={styles.cardTitleCopy}>
                      <h3>Ultimos backups programados</h3>
                      <p>Lectura rapida de los respaldos automaticos recientes.</p>
                    </div>
                  </div>

                  <span className={styles.cardPill}>Top 5</span>
                </div>

                {latestScheduledBackups.length === 0 ? (
                  <div className={styles.emptyState}>
                    <span className={`${styles.iconShell} ${styles.toneSlate}`}>
                      <CalendarClock size={18} />
                    </span>
                    <strong>No hay respaldos programados todavia.</strong>
                    <p>Crea una programacion para empezar a poblar esta vista.</p>
                  </div>
                ) : (
                  <div className={styles.list}>
                    {latestScheduledBackups.map((backup) => (
                      <div key={backup.id} className={styles.timelineItem}>
                        <span className={`${styles.iconShell} ${styles.toneAmber}`}>
                          <CalendarClock size={16} />
                        </span>

                        <div className={styles.timelineContent}>
                          <strong>{backup.filename}</strong>
                          <span>{formatDate(backup.createdAt)}</span>

                          <div className={styles.inlineMeta}>
                            <span className={styles.inlineChip}>
                              {getScopeLabel(backup.scope)}
                            </span>
                            <span className={styles.inlineChip}>
                              {getModeLabel(backup.mode)}
                            </span>
                            <span className={styles.inlineChip}>
                              {hasCloudCopy(backup) ? "Con nube" : "Solo local"}
                            </span>
                          </div>
                        </div>

                        <span className={styles.badgeSoft}>Programado</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className={styles.analyticsGrid}>
              <div className={styles.analyticsCard}>
                <div className={styles.analyticsCardHeader}>
                  <div className={styles.analyticsCardTitle}>
                    <span className={styles.analyticsBadge}>
                      <CloudBackup size={16} />
                    </span>
                    <div>
                      <h3>Distribucion operativa</h3>
                      <p>
                        Vista estilo reporte para entender como se reparte el
                        respaldo entre manual, programado y nube.
                      </p>
                    </div>
                  </div>

                  <span className={styles.analyticsPill}>Dona</span>
                </div>

                <div className={styles.analyticsCardBody}>
                  {backupCompositionSeries.length === 0 ? (
                    <div className={styles.chartEmptyState}>
                      <span className={`${styles.iconShell} ${styles.toneSlate}`}>
                        <History size={18} />
                      </span>
                      <strong>Aun no hay datos para graficar.</strong>
                      <p>Genera respaldos para ver la distribucion operativa.</p>
                    </div>
                  ) : (
                    <div className={styles.donutLayout}>
                      <div className={styles.chartCanvas}>
                        <ResponsiveContainer width="100%" height={220}>
                          <PieChart>
                            <Tooltip
                              formatter={(value) => [
                                `${Number(value ?? 0)} respaldos`,
                                "Total",
                              ]}
                              contentStyle={{
                                borderRadius: 16,
                                border: "1px solid rgba(15, 23, 42, 0.08)",
                                boxShadow: "0 18px 40px rgba(15, 23, 42, 0.14)",
                              }}
                            />
                            <Pie
                              data={backupCompositionSeries}
                              dataKey="value"
                              nameKey="name"
                              innerRadius={54}
                              outerRadius={86}
                              paddingAngle={3}
                              stroke="#fff7f5"
                              strokeWidth={3}
                            >
                              {backupCompositionSeries.map((entry) => (
                                <Cell key={entry.name} fill={entry.color} />
                              ))}
                            </Pie>
                          </PieChart>
                        </ResponsiveContainer>
                      </div>

                      <div className={styles.analyticsLegend}>
                        {backupCompositionSeries.map((item) => (
                          <div key={item.name} className={styles.analyticsLegendItem}>
                            <span
                              className={styles.analyticsLegendDot}
                              style={{ backgroundColor: item.color }}
                            />
                            <div className={styles.analyticsLegendCopy}>
                              <strong>{item.name}</strong>
                              <span>{item.value} respaldos</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className={styles.analyticsCard}>
                <div className={styles.analyticsCardHeader}>
                  <div className={styles.analyticsCardTitle}>
                    <span className={styles.analyticsBadge}>
                      <Activity size={16} />
                    </span>
                    <div>
                      <h3>Cobertura por alcance</h3>
                      <p>
                        Barras horizontales para comparar respaldos manuales y
                        programados por tipo de alcance.
                      </p>
                    </div>
                  </div>

                  <span className={styles.analyticsPill}>Barras</span>
                </div>

                <div className={styles.analyticsCardBody}>
                  <div className={styles.chartCanvasWide}>
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart
                        data={scopeCoverageData}
                        layout="vertical"
                        margin={{ top: 8, right: 12, left: 0, bottom: 8 }}
                        barCategoryGap={18}
                      >
                        <defs>
                          <linearGradient id="backupManualGradient" x1="0" y1="0" x2="1" y2="0">
                            <stop offset="0%" stopColor={CHART_COLORS.red} />
                            <stop offset="100%" stopColor={CHART_COLORS.coral} />
                          </linearGradient>
                          <linearGradient id="backupScheduledGradient" x1="0" y1="0" x2="1" y2="0">
                            <stop offset="0%" stopColor={CHART_COLORS.wine} />
                            <stop offset="100%" stopColor={CHART_COLORS.blush} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid stroke={CHART_COLORS.grid} horizontal={false} />
                        <XAxis
                          type="number"
                          allowDecimals={false}
                          stroke={CHART_COLORS.axis}
                        />
                        <YAxis
                          type="category"
                          dataKey="name"
                          stroke={CHART_COLORS.axis}
                          width={92}
                        />
                        <Tooltip
                          contentStyle={{
                            borderRadius: 16,
                            border: "1px solid rgba(15, 23, 42, 0.08)",
                            boxShadow: "0 18px 40px rgba(15, 23, 42, 0.14)",
                          }}
                        />
                        <Bar
                          dataKey="manual"
                          name="Manuales"
                          fill="url(#backupManualGradient)"
                          radius={[0, 10, 10, 0]}
                          barSize={12}
                        />
                        <Bar
                          dataKey="scheduled"
                          name="Programados"
                          fill="url(#backupScheduledGradient)"
                          radius={[0, 10, 10, 0]}
                          barSize={12}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  <div className={styles.analyticsHighlights}>
                    {chartHighlights.map((item) => {
                      const Icon = item.icon;

                      return (
                        <div key={item.label} className={styles.analyticsHighlightItem}>
                          <span
                            className={`${styles.iconShell} ${getToneClassName(item.tone)}`}
                          >
                            <Icon size={16} />
                          </span>
                          <div>
                            <strong>{item.label}</strong>
                            <span>{item.value}</span>
                            <small>{item.helper}</small>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "manual" && (
          <div className={styles.tabContent}>
            <div className={styles.sectionHeader}>
              <div className={styles.sectionHeading}>
                <span className={styles.sectionIcon}>
                  <DatabaseBackup size={18} />
                </span>
                <div>
                  <h2>Crear backup manual</h2>
                  <p>
                    Genera un respaldo inmediato de la base completa o de una
                    tabla concreta con una vista de configuracion mas clara.
                  </p>
                </div>
              </div>

              <span className={styles.sectionTag}>Accion inmediata</span>
            </div>

            <div className={styles.workflowGrid}>
              <div className={`${styles.card} ${styles.cardAccent}`}>
                <div className={styles.cardHeader}>
                  <div className={styles.cardTitleWrap}>
                    <span className={`${styles.iconShell} ${styles.toneRed}`}>
                      <DatabaseBackup size={18} />
                    </span>
                    <div className={styles.cardTitleCopy}>
                      <h3>Configuracion del respaldo</h3>
                      <p>Define alcance, modo y destino antes de generar.</p>
                    </div>
                  </div>

                  <span className={styles.cardPill}>Manual</span>
                </div>

                <div className={styles.formGrid}>
                  <label className={styles.field}>
                    <span>Que quieres respaldar</span>
                    <select
                      value={scope}
                      onChange={(e) => setScope(e.target.value as BackupScope)}
                    >
                      <option value="full">Toda la base de datos</option>
                      <option value="table">Solo una tabla</option>
                    </select>
                  </label>

                  <label className={styles.field}>
                    <span>Modo</span>
                    <select
                      value={mode}
                      onChange={(e) => setMode(e.target.value as BackupMode)}
                    >
                      <option value="schema-and-data">Estructura + datos</option>
                      <option value="data-only">Solo datos</option>
                    </select>
                  </label>

                  <label className={styles.field}>
                    <span>Proveedor</span>
                    <div className={styles.readonlyBox}>
                      Local + {cloudinaryEnabled ? "Cloudinary" : "Sin Cloudinary"}
                    </div>
                  </label>
                </div>

                {scope === "table" && (
                  <label className={styles.field}>
                    <span>Tabla</span>
                    <select
                      value={selectedTable}
                      onChange={(e) => setSelectedTable(e.target.value)}
                    >
                      {tableOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                )}

                <label className={styles.checkboxRow}>
                  <input
                    type="checkbox"
                    checked={uploadToCloudinary}
                    onChange={(e) => setUploadToCloudinary(e.target.checked)}
                    disabled={!cloudinaryEnabled}
                  />
                  <div className={styles.checkboxCopy}>
                    <span>Subir tambien a Cloudinary</span>
                    <small>
                      {cloudinaryEnabled
                        ? "Mantendra una copia remota adicional."
                        : "Configura Cloudinary para habilitar esta opcion."}
                    </small>
                  </div>
                </label>

                <div className={styles.previewCard}>
                  <div className={styles.previewHeader}>
                    <span className={`${styles.iconShell} ${styles.toneAmber}`}>
                      <Database size={16} />
                    </span>
                    <strong>Vista previa</strong>
                  </div>

                  <p>
                    Se generara un backup de{" "}
                    <b>{getModeLabel(mode).toLowerCase()}</b> de{" "}
                    <b>
                      {scope === "table" && selectedTable
                        ? selectedTable
                        : "toda la base de datos"}
                    </b>
                    {uploadToCloudinary && cloudinaryEnabled
                      ? " y tambien se enviara a Cloudinary."
                      : "."}
                  </p>
                </div>

                <div className={styles.actionsRow}>
                  <button
                    className={styles.primaryBtn}
                    onClick={handleCreateBackup}
                    disabled={creatingBackup || (scope === "table" && !selectedTable)}
                    type="button"
                  >
                    <DatabaseBackup size={16} />
                    {creatingBackup ? "Generando..." : "Generar backup ahora"}
                  </button>
                </div>
              </div>

              <div className={styles.sideStack}>
                <div className={styles.card}>
                  <div className={styles.cardHeader}>
                    <div className={styles.cardTitleWrap}>
                      <span className={`${styles.iconShell} ${styles.toneBlue}`}>
                        <SlidersHorizontal size={18} />
                      </span>
                      <div className={styles.cardTitleCopy}>
                        <h3>Lectura de la configuracion</h3>
                        <p>Resumen visual de lo que se generara.</p>
                      </div>
                    </div>
                  </div>

                  <div className={styles.sideCardList}>
                    {manualHighlights.map((item) => {
                      const Icon = item.icon;

                      return (
                        <div key={item.label} className={styles.infoBox}>
                          <div className={styles.infoBoxHeader}>
                            <span
                              className={`${styles.iconShell} ${getToneClassName(item.tone)}`}
                            >
                              <Icon size={16} />
                            </span>
                            <strong>{item.label}</strong>
                          </div>

                          <div className={styles.infoValue}>{item.value}</div>
                          <span className={styles.infoHint}>{item.helper}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className={styles.card}>
                  <div className={styles.cardHeader}>
                    <div className={styles.cardTitleWrap}>
                      <span className={`${styles.iconShell} ${styles.toneAmber}`}>
                        <CircleAlert size={18} />
                      </span>
                      <div className={styles.cardTitleCopy}>
                        <h3>Buenas practicas</h3>
                        <p>Pequenos recordatorios antes de lanzar el respaldo.</p>
                      </div>
                    </div>
                  </div>

                  <div className={styles.helperList}>
                    <div className={styles.helperItem}>
                      <span className={`${styles.iconShell} ${styles.toneGreen}`}>
                        <ShieldCheck size={16} />
                      </span>
                      <div className={styles.helperItemBody}>
                        <strong>Usa backup completo cuando haras restauracion total.</strong>
                        <p>Es la opcion mas segura para snapshots generales.</p>
                      </div>
                    </div>

                    <div className={styles.helperItem}>
                      <span className={`${styles.iconShell} ${styles.toneBlue}`}>
                        <Table2 size={16} />
                      </span>
                      <div className={styles.helperItemBody}>
                        <strong>Usa backup por tabla para cambios puntuales.</strong>
                        <p>Reduce ruido cuando solo necesitas una parte del esquema.</p>
                      </div>
                    </div>

                    <div className={styles.helperItem}>
                      <span className={`${styles.iconShell} ${styles.toneAmber}`}>
                        <CloudBackup size={16} />
                      </span>
                      <div className={styles.helperItemBody}>
                        <strong>Activa nube si necesitas redundancia fuera del servidor.</strong>
                        <p>Cloudinary agrega una copia remota para descarga posterior.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "schedules" && (
          <div className={styles.tabContent}>
            <div className={styles.sectionHeader}>
              <div className={styles.sectionHeading}>
                <span className={styles.sectionIcon}>
                  <CalendarClock size={18} />
                </span>
                <div>
                  <h2>Programaciones</h2>
                  <p>
                    Crea varias reglas, ejecutalas al momento y controla su
                    estado desde tarjetas mas legibles.
                  </p>
                </div>
              </div>

              <span className={styles.sectionTag}>
                {summaryCards.activeSchedules} activas
              </span>
            </div>

            <div className={styles.workflowGrid}>
              <div className={`${styles.card} ${styles.cardAccent}`}>
                <div className={styles.cardHeader}>
                  <div className={styles.cardTitleWrap}>
                    <span className={`${styles.iconShell} ${styles.toneRed}`}>
                      <CalendarClock size={18} />
                    </span>
                    <div className={styles.cardTitleCopy}>
                      <h3>Nueva programacion</h3>
                      <p>Selecciona un preset o configura el cron manualmente.</p>
                    </div>
                  </div>
                </div>

                <div className={styles.presetGrid}>
                  {cronPresets.map((preset) => (
                    <button
                      key={preset.value}
                      type="button"
                      className={`${styles.presetBtn} ${
                        scheduleForm.cronExpression === preset.value
                          ? styles.presetBtnActive
                          : ""
                      }`}
                      onClick={() =>
                        setScheduleForm((prev) => ({
                          ...prev,
                          cronExpression: preset.value,
                        }))
                      }
                    >
                      <CalendarClock size={16} />
                      {preset.label}
                    </button>
                  ))}
                </div>

                <div className={styles.formGrid}>
                  <label className={styles.field}>
                    <span>Activar</span>
                    <select
                      value={scheduleForm.enabled ? "true" : "false"}
                      onChange={(e) =>
                        setScheduleForm((prev) => ({
                          ...prev,
                          enabled: e.target.value === "true",
                        }))
                      }
                    >
                      <option value="true">Si</option>
                      <option value="false">No</option>
                    </select>
                  </label>

                  <label className={styles.field}>
                    <span>Expresion cron</span>
                    <input
                      className={styles.textInput}
                      value={scheduleForm.cronExpression}
                      onChange={(e) =>
                        setScheduleForm((prev) => ({
                          ...prev,
                          cronExpression: e.target.value,
                        }))
                      }
                    />
                  </label>

                  <label className={styles.field}>
                    <span>Zona horaria</span>
                    <input
                      className={styles.textInput}
                      value={scheduleForm.timezone}
                      onChange={(e) =>
                        setScheduleForm((prev) => ({
                          ...prev,
                          timezone: e.target.value,
                        }))
                      }
                    />
                  </label>

                  <label className={styles.field}>
                    <span>Tipo</span>
                    <select
                      value={scheduleForm.scope}
                      onChange={(e) =>
                        setScheduleForm((prev) => ({
                          ...prev,
                          scope: e.target.value as BackupScope,
                          table: "",
                        }))
                      }
                    >
                      <option value="full">Toda la base de datos</option>
                      <option value="table">Solo una tabla</option>
                    </select>
                  </label>

                  <label className={styles.field}>
                    <span>Schema</span>
                    <select
                      value={scheduleForm.schema}
                      onChange={(e) =>
                        setScheduleForm((prev) => ({
                          ...prev,
                          schema: e.target.value,
                          table: "",
                        }))
                      }
                    >
                      {schemaOptions.map((schema) => (
                        <option key={schema} value={schema}>
                          {schema}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className={styles.field}>
                    <span>Modo</span>
                    <select
                      value={scheduleForm.mode}
                      onChange={(e) =>
                        setScheduleForm((prev) => ({
                          ...prev,
                          mode: e.target.value as BackupMode,
                        }))
                      }
                    >
                      <option value="schema-and-data">Estructura + datos</option>
                      <option value="data-only">Solo datos</option>
                    </select>
                  </label>
                </div>

                {scheduleForm.scope === "table" && (
                  <label className={styles.field}>
                    <span>Tabla especifica</span>
                    <select
                      value={scheduleForm.table}
                      onChange={(e) =>
                        setScheduleForm((prev) => ({
                          ...prev,
                          table: e.target.value,
                        }))
                      }
                    >
                      <option value="">Selecciona una tabla</option>
                      {scheduleTableOptions.map((item) => (
                        <option
                          key={`${item.schema}.${item.table}`}
                          value={item.table}
                        >
                          {item.schema}.{item.table}
                        </option>
                      ))}
                    </select>
                  </label>
                )}

                <label className={styles.checkboxRow}>
                  <input
                    type="checkbox"
                    checked={scheduleForm.uploadToCloudinary}
                    onChange={(e) =>
                      setScheduleForm((prev) => ({
                        ...prev,
                        uploadToCloudinary: e.target.checked,
                      }))
                    }
                    disabled={!cloudinaryEnabled}
                  />
                  <div className={styles.checkboxCopy}>
                    <span>Subir tambien a Cloudinary</span>
                    <small>
                      {cloudinaryEnabled
                        ? "La rutina mantendra copia remota ademas de la local."
                        : "Cloudinary no esta disponible en este entorno."}
                    </small>
                  </div>
                </label>

                <div className={styles.previewCard}>
                  <div className={styles.previewHeader}>
                    <span className={`${styles.iconShell} ${styles.toneAmber}`}>
                      <CalendarClock size={16} />
                    </span>
                    <strong>Vista previa</strong>
                  </div>

                  <p>
                    Esta programacion hara un backup{" "}
                    <b>{getModeLabel(scheduleForm.mode).toLowerCase()}</b> de{" "}
                    <b>
                      {scheduleForm.scope === "table" && scheduleForm.table
                        ? `${scheduleForm.schema}.${scheduleForm.table}`
                        : "toda la base de datos"}
                    </b>
                    {scheduleForm.uploadToCloudinary && cloudinaryEnabled
                      ? " y dejara copia remota."
                      : "."}
                  </p>
                </div>

                <div className={styles.actionsRow}>
                  <button
                    className={styles.primaryBtn}
                    onClick={handleCreateSchedule}
                    disabled={savingSchedule}
                    type="button"
                  >
                    <CalendarClock size={16} />
                    {savingSchedule ? "Guardando..." : "Crear programacion"}
                  </button>
                </div>
              </div>

              <div className={styles.sideStack}>
                <div className={styles.card}>
                  <div className={styles.cardHeader}>
                    <div className={styles.cardTitleWrap}>
                      <span className={`${styles.iconShell} ${styles.toneGreen}`}>
                        <BadgeCheck size={18} />
                      </span>
                      <div className={styles.cardTitleCopy}>
                        <h3>Lectura rapida</h3>
                        <p>Indicadores para definir la rutina ideal.</p>
                      </div>
                    </div>
                  </div>

                  <div className={styles.sideCardList}>
                    {scheduleHighlights.map((item) => {
                      const Icon = item.icon;

                      return (
                        <div key={item.label} className={styles.infoBox}>
                          <div className={styles.infoBoxHeader}>
                            <span
                              className={`${styles.iconShell} ${getToneClassName(item.tone)}`}
                            >
                              <Icon size={16} />
                            </span>
                            <strong>{item.label}</strong>
                          </div>

                          <div className={styles.infoValue}>{item.value}</div>
                          <span className={styles.infoHint}>{item.helper}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className={styles.card}>
                  <div className={styles.cardHeader}>
                    <div className={styles.cardTitleWrap}>
                      <span className={`${styles.iconShell} ${styles.toneBlue}`}>
                        <Clock3 size={18} />
                      </span>
                      <div className={styles.cardTitleCopy}>
                        <h3>Consejos de horario</h3>
                        <p>Recomendaciones simples para mantener orden operativo.</p>
                      </div>
                    </div>
                  </div>

                  <div className={styles.helperList}>
                    <div className={styles.helperItem}>
                      <span className={`${styles.iconShell} ${styles.toneAmber}`}>
                        <CalendarClock size={16} />
                      </span>
                      <div className={styles.helperItemBody}>
                        <strong>Usa presets para tareas recurrentes estables.</strong>
                        <p>Aceleran la configuracion y reducen errores de cron.</p>
                      </div>
                    </div>

                    <div className={styles.helperItem}>
                      <span className={`${styles.iconShell} ${styles.toneBlue}`}>
                        <Table2 size={16} />
                      </span>
                      <div className={styles.helperItemBody}>
                        <strong>Restringe a tabla cuando el respaldo es tematico.</strong>
                        <p>Evita generar archivos mas grandes de lo necesario.</p>
                      </div>
                    </div>

                    <div className={styles.helperItem}>
                      <span className={`${styles.iconShell} ${styles.toneGreen}`}>
                        <CloudBackup size={16} />
                      </span>
                      <div className={styles.helperItemBody}>
                        <strong>Combina nube y local para capas extra de recuperacion.</strong>
                        <p>Es util cuando la descarga posterior es una necesidad real.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <div className={styles.cardTitleWrap}>
                  <span className={`${styles.iconShell} ${styles.toneSlate}`}>
                    <History size={18} />
                  </span>
                  <div className={styles.cardTitleCopy}>
                    <h3>Programaciones creadas</h3>
                    <p>Controla estado, ultima ejecucion y acciones rapidas.</p>
                  </div>
                </div>
              </div>

              {loadingSchedules ? (
                <div className={styles.emptyState}>
                  <span className={`${styles.iconShell} ${styles.toneSlate}`}>
                    <CalendarClock size={18} />
                  </span>
                  <strong>Cargando programaciones...</strong>
                </div>
              ) : schedules.length === 0 ? (
                <div className={styles.emptyState}>
                  <span className={`${styles.iconShell} ${styles.toneSlate}`}>
                    <CalendarClock size={18} />
                  </span>
                  <strong>Aun no has creado programaciones.</strong>
                  <p>Configura la primera para automatizar la operacion.</p>
                </div>
              ) : (
                <div className={styles.scheduleList}>
                  {schedules.map((schedule) => (
                    <div key={schedule.id} className={styles.scheduleCard}>
                      <div className={styles.scheduleCardTop}>
                        <div className={styles.scheduleTitleBlock}>
                          <div className={styles.scheduleHeadingRow}>
                            <span
                              className={`${styles.iconShell} ${
                                schedule.enabled ? styles.toneGreen : styles.toneSlate
                              }`}
                            >
                              <CalendarClock size={16} />
                            </span>

                            <div>
                              <strong>
                                {schedule.scope === "table" && schedule.table
                                  ? `${schedule.schema}.${schedule.table}`
                                  : "Base de datos completa"}
                              </strong>
                              <span>
                                {getModeLabel(schedule.mode)} · {schedule.cronExpression}
                              </span>
                            </div>
                          </div>

                          <div className={styles.inlineMeta}>
                            <span className={styles.inlineChip}>
                              {schedule.timezone}
                            </span>
                            <span className={styles.inlineChip}>
                              {schedule.scope === "table"
                                ? "Respaldo por tabla"
                                : "Respaldo completo"}
                            </span>
                            <span className={styles.inlineChip}>
                              {schedule.uploadToCloudinary
                                ? "Con copia en nube"
                                : "Solo local"}
                            </span>
                          </div>
                        </div>

                        <div className={styles.scheduleStatusGroup}>
                          <span
                            className={`${styles.statusPill} ${
                              schedule.enabled ? styles.statusActive : styles.statusOff
                            }`}
                          >
                            {schedule.enabled ? "Activa" : "Inactiva"}
                          </span>

                          <span
                            className={`${styles.statusPill} ${getToneClassName(
                              getRunStatusTone(schedule.lastRunStatus),
                            )}`}
                          >
                            {schedule.lastRunStatus || "Sin estado"}
                          </span>
                        </div>
                      </div>

                      <div className={styles.scheduleMetaGrid}>
                        <div>
                          <span>Ultima ejecucion</span>
                          <strong>{formatDate(schedule.lastRunAt)}</strong>
                        </div>
                        <div>
                          <span>Destino</span>
                          <strong>
                            {schedule.uploadToCloudinary
                              ? "Local + Cloudinary"
                              : "Solo local"}
                          </strong>
                        </div>
                        <div>
                          <span>Frecuencia</span>
                          <strong>{schedule.cronExpression}</strong>
                        </div>
                      </div>

                      {schedule.lastRunMessage ? (
                        <div className={styles.infoInline}>{schedule.lastRunMessage}</div>
                      ) : null}

                      <div className={styles.actionsRow}>
                        <button
                          className={styles.secondaryBtn}
                          onClick={() => handleRunScheduleNow(schedule.id)}
                          disabled={runningScheduleId === schedule.id}
                          type="button"
                        >
                          <Play size={16} />
                          {runningScheduleId === schedule.id
                            ? "Ejecutando..."
                            : "Ejecutar ahora"}
                        </button>

                        {schedule.lastRunLogFilename ? (
                          <button
                            className={styles.secondaryBtn}
                            onClick={() => handleOpenLog(schedule.lastRunLogFilename)}
                            type="button"
                          >
                            <FileText size={16} />
                            Ver log
                          </button>
                        ) : null}

                        <button
                          className={styles.dangerBtn}
                          onClick={() => handleDeleteSchedule(schedule.id)}
                          disabled={deletingScheduleId === schedule.id}
                          type="button"
                        >
                          <Trash2 size={16} />
                          {deletingScheduleId === schedule.id
                            ? "Eliminando..."
                            : "Eliminar"}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "history" && (
          <div className={styles.tabContent}>
            <div className={styles.sectionHeader}>
              <div className={styles.sectionHeading}>
                <span className={styles.sectionIcon}>
                  <History size={18} />
                </span>
                <div>
                  <h2>Historial de respaldos</h2>
                  <p>
                    Filtra por origen, almacenamiento y fechas sin perder lectura
                    rapida del comportamiento general.
                  </p>
                </div>
              </div>

              <span className={styles.sectionTag}>
                {hasActiveHistoryFilters ? "Vista filtrada" : "Registro completo"}
              </span>
            </div>

            <div className={styles.card}>
              <div className={styles.historyToolbar}>
                <div className={styles.historySummaryGrid}>
                  {historyCards.map((item) => {
                    const Icon = item.icon;

                    return (
                      <div key={item.label} className={styles.historySummaryCard}>
                        <div className={styles.historySummaryHead}>
                          <span
                            className={`${styles.iconShell} ${getToneClassName(item.tone)}`}
                          >
                            <Icon size={17} />
                          </span>
                          <span>{item.label}</span>
                        </div>

                        <strong>{item.value}</strong>
                        <small>{item.helper}</small>
                      </div>
                    );
                  })}
                </div>

                <div className={styles.historyFilterGrid}>
                  <label className={styles.field}>
                    <span>Origen</span>
                    <select
                      value={historyOriginFilter}
                      onChange={(e) =>
                        setHistoryOriginFilter(e.target.value as HistoryOriginFilter)
                      }
                    >
                      <option value="all">Todos</option>
                      <option value="manual">Manuales</option>
                      <option value="scheduled">Programados</option>
                    </select>
                  </label>

                  <label className={styles.field}>
                    <span>Almacenamiento</span>
                    <select
                      value={historyStorageFilter}
                      onChange={(e) =>
                        setHistoryStorageFilter(e.target.value as HistoryStorageFilter)
                      }
                    >
                      <option value="all">Todo</option>
                      <option value="local">Solo local</option>
                      <option value="cloud">Con copia en nube</option>
                    </select>
                  </label>

                  <label className={styles.field}>
                    <span>Desde</span>
                    <input
                      type="date"
                      className={styles.textInput}
                      value={historyStartDate}
                      max={historyEndDate || undefined}
                      onChange={(e) => setHistoryStartDate(e.target.value)}
                    />
                  </label>

                  <label className={styles.field}>
                    <span>Hasta</span>
                    <input
                      type="date"
                      className={styles.textInput}
                      value={historyEndDate}
                      min={historyStartDate || undefined}
                      onChange={(e) => setHistoryEndDate(e.target.value)}
                    />
                  </label>

                  <div className={styles.historyFilterActions}>
                    <button
                      type="button"
                      className={styles.secondaryBtn}
                      onClick={clearHistoryFilters}
                      disabled={!hasActiveHistoryFilters}
                    >
                      <SlidersHorizontal size={16} />
                      Limpiar filtros
                    </button>
                  </div>
                </div>

                <div className={styles.historyMetaBar}>
                  <div className={styles.historyMetaCopy}>
                    <div className={styles.historyMetaTitle}>
                      <span className={`${styles.iconShell} ${styles.toneBlue}`}>
                        <History size={16} />
                      </span>
                      <strong>{historyResultsLabel}</strong>
                    </div>
                    <span>
                      {hasActiveHistoryFilters
                        ? "Vista filtrada por origen, almacenamiento o fechas."
                        : "Mostrando el historial completo de respaldos."}
                    </span>
                  </div>

                  <span
                    className={
                      hasActiveHistoryFilters ? styles.filterBadge : styles.badgeSoft
                    }
                  >
                    {hasActiveHistoryFilters ? "Filtros activos" : "Vista completa"}
                  </span>
                </div>
              </div>

              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th>Alcance</th>
                      <th>Modo</th>
                      <th>Ejecucion</th>
                      <th>Almacenamiento</th>
                      <th>Contenido</th>
                      <th>Tamano</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loadingBackups ? (
                      <tr>
                        <td colSpan={8} className={styles.emptyRow}>
                          Cargando historial...
                        </td>
                      </tr>
                    ) : filteredHistoryBackups.length === 0 ? (
                      <tr>
                        <td colSpan={8} className={styles.emptyRow}>
                          {backups.length === 0
                            ? "Aun no hay respaldos generados."
                            : "No hay respaldos que coincidan con los filtros seleccionados."}
                        </td>
                      </tr>
                    ) : (
                      paginatedHistoryBackups.map((backup) => (
                        <tr key={backup.id}>
                          <td>
                            <div className={styles.contentCell}>
                              <strong>{formatDate(backup.createdAt)}</strong>
                              <span>{backup.filename}</span>
                            </div>
                          </td>
                          <td>
                            <span className={styles.inlineChip}>
                              {getScopeLabel(backup.scope)}
                            </span>
                          </td>
                          <td>
                            <span className={styles.inlineChip}>
                              {getModeLabel(backup.mode)}
                            </span>
                          </td>
                          <td>
                            <div className={styles.contentCell}>
                              <strong>{getOriginLabel(backup.origin)}</strong>
                              <span>
                                {backup.origin === "scheduled"
                                  ? "Generado por una programacion"
                                  : "Generado manualmente"}
                              </span>
                            </div>
                          </td>
                          <td>
                            <div className={styles.contentCell}>
                              <strong>{getSourceLabel(backup)}</strong>
                              <span>
                                {hasCloudCopy(backup)
                                  ? "Con copia remota disponible"
                                  : "Disponible solo en local"}
                              </span>
                            </div>
                          </td>
                          <td>
                            <div className={styles.contentCell}>
                              <strong>
                                {backup.scope === "table" &&
                                backup.schema &&
                                backup.table
                                  ? `${backup.schema}.${backup.table}`
                                  : "Base completa"}
                              </strong>
                              <span>{backup.filename}</span>
                            </div>
                          </td>
                          <td>{backup.sizeKB || "N/D"} KB</td>
                          <td>
                            <div className={styles.rowActions}>
                              {backup.downloadUrl || backup.cloudinary?.url ? (
                                <button
                                  type="button"
                                  className={styles.downloadButton}
                                  onClick={() => handleDownloadBackup(backup)}
                                >
                                  <Download size={15} />
                                  Descargar
                                </button>
                              ) : (
                                <span className={styles.mutedText}>Sin descarga</span>
                              )}

                              {backup.executionLog?.filename ? (
                                <button
                                  type="button"
                                  className={styles.secondaryBtn}
                                  onClick={() =>
                                    handleOpenLog(backup.executionLog?.filename)
                                  }
                                >
                                  <FileText size={15} />
                                  Ver log
                                </button>
                              ) : null}

                              {backup.cloudinary?.url ? (
                                <a
                                  className={styles.cloudLink}
                                  href={backup.cloudinary.url}
                                  target="_blank"
                                  rel="noreferrer"
                                >
                                  <CloudBackup size={15} />
                                  Ver nube
                                </a>
                              ) : null}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <div className={styles.paginationBar}>
                <span className={styles.paginationSummary}>{historyResultsLabel}</span>

                <div className={styles.paginationActions}>
                  <button
                    type="button"
                    className={styles.secondaryBtn}
                    disabled={displayedHistoryPage <= 1}
                    onClick={() => setHistoryPage((current) => Math.max(1, current - 1))}
                  >
                    Anterior
                  </button>

                  <div className={styles.paginationIndicator}>
                    Pagina {displayedHistoryPage} de {displayedHistoryPages}
                  </div>

                  <button
                    type="button"
                    className={styles.secondaryBtn}
                    disabled={
                      displayedHistoryPage === 0 ||
                      displayedHistoryPage >= displayedHistoryPages
                    }
                    onClick={() =>
                      setHistoryPage((current) =>
                        Math.min(totalHistoryPages, current + 1),
                      )
                    }
                  >
                    Siguiente
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </section>

      {logViewer.open ? (
        <div className={styles.logOverlay} role="dialog" aria-modal="true">
          <div className={styles.logModal}>
            <div className={styles.logModalHeader}>
              <div className={styles.logModalTitle}>
                <span className={`${styles.iconShell} ${styles.toneSlate}`}>
                  <FileText size={18} />
                </span>
                <div>
                  <h3>
                    {logViewer.filename
                      ? `Log de ${logViewer.filename.replace(/\.log$/i, "")}`
                      : "Log de backup"}
                  </h3>
                  <p>{logViewer.filename || "Sin archivo seleccionado"}</p>
                </div>
              </div>

              <button
                type="button"
                className={styles.secondaryBtn}
                onClick={closeLogViewer}
              >
                Cerrar
              </button>
            </div>

            <div className={styles.logConsole}>
              {logViewer.loading ? (
                <div className={styles.logPlaceholder}>Cargando log...</div>
              ) : (
                <pre className={styles.logContent}>
                  {logViewer.content || "No hay contenido disponible."}
                </pre>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
