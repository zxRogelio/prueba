import { useEffect, useMemo, useState } from "react";
import styles from "./AdminBackupsPage.module.css";
import {
  createBackup,
  createBackupSchedule,
  deleteBackupSchedule,
  downloadBackupFile,
  getBackupOptions,
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

type ToastItem = {
  id: number;
  type: ToastType;
  title: string;
  message: string;
};

const formatDate = (value?: string | null) => {
  if (!value) return "N/D";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "N/D";
  return date.toLocaleString();
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

const getScopeLabel = (scope?: BackupScope | string | null) => {
  if (scope === "full") return "Base completa";
  if (scope === "table") return "Tabla específica";
  return "Respaldo";
};

const getModeLabel = (mode?: BackupMode | string | null) => {
  if (mode === "data-only") return "Solo datos";
  if (mode === "schema-and-data") return "Estructura + datos";
  return "No identificado";
};

const getSourceLabel = (backup: BackupRecord) => {
  const hasCloudinary = Boolean(backup.cloudinary?.url);

  if (backup.source === "cloudinary") return "Cloudinary";
  if (backup.source === "local" && hasCloudinary) return "Local + Cloudinary";
  if (backup.source === "local") return "Local";
  if (hasCloudinary) return "Cloudinary";
  return "Desconocido";
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

  const [toasts, setToasts] = useState<ToastItem[]>([]);

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
        response.message || "El respaldo se generó correctamente.",
      );

      await loadData();
    } catch (error: unknown) {
      pushToast(
        "error",
        "Error al generar backup",
        getErrorMessage(error, "No se pudo generar el backup."),
      );
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
          "Debes elegir una tabla para una programación por tabla.",
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
        "Programación creada",
        response.message || "La programación se guardó correctamente.",
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
        "Error al crear programación",
        getErrorMessage(error, "No se pudo crear la programación."),
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
        "Programación eliminada",
        response.message || "La programación se eliminó correctamente.",
      );

      await loadData();
    } catch (error: unknown) {
      pushToast(
        "error",
        "Error al eliminar programación",
        getErrorMessage(error, "No se pudo eliminar la programación."),
      );
    } finally {
      setDeletingScheduleId(null);
    }
  };

  const handleRunScheduleNow = async (id: string) => {
    setRunningScheduleId(id);

    try {
      const response = await runBackupScheduleNow(id);

      pushToast(
        "success",
        "Programación ejecutada",
        response.message || "La programación se ejecutó correctamente.",
      );

      await loadData();
    } catch (error: unknown) {
      pushToast(
        "error",
        "Error al ejecutar programación",
        getErrorMessage(error, "No se pudo ejecutar la programación."),
      );
    } finally {
      setRunningScheduleId(null);
    }
  };

  const handleDownloadBackup = async (backup: BackupRecord) => {
    try {
      if (!backup.downloadUrl) {
        pushToast(
          "error",
          "Descarga no disponible",
          "Este respaldo no tiene descarga local.",
        );
        return;
      }

      await downloadBackupFile(backup.downloadUrl, backup.filename);

      pushToast(
        "success",
        "Descarga completada",
        `El archivo ${backup.filename} se descargó correctamente.`,
      );
    } catch (error: unknown) {
      pushToast(
        "error",
        "Error al descargar",
        getErrorMessage(error, "No se pudo descargar el respaldo."),
      );
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.toastContainer}>
        {toasts.map((toast) => (
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
            <div className={styles.toastBody}>
              <strong>{toast.title}</strong>
              <p>{toast.message}</p>
            </div>
            <button
              className={styles.toastClose}
              onClick={() => removeToast(toast.id)}
              type="button"
            >
              ×
            </button>
          </div>
        ))}
      </div>

      <section className={styles.hero}>
        <div>
          <span className={styles.heroBadge}>Backups y automatización</span>
          <h1 className={styles.title}>Panel de respaldos</h1>
          <p className={styles.subtitle}>
            Crea backups manuales, programa varios respaldos automáticos y
            administra tus programaciones desde un solo lugar.
          </p>
        </div>
      </section>

      <section className={styles.metricsGrid}>
        <div className={styles.metricCard}>
          <span>Respaldos totales</span>
          <strong>{summaryCards.totalBackups}</strong>
        </div>
        <div className={styles.metricCard}>
          <span>Manuales</span>
          <strong>{summaryCards.manualBackups}</strong>
        </div>
        <div className={styles.metricCard}>
          <span>Programados</span>
          <strong>{summaryCards.scheduledBackups}</strong>
        </div>
        <div className={styles.metricCard}>
          <span>Programaciones activas</span>
          <strong>{summaryCards.activeSchedules}</strong>
        </div>
      </section>

      <section className={styles.tabsSection}>
        <div className={styles.tabs}>
          <button
            className={`${styles.tabBtn} ${
              activeTab === "overview" ? styles.tabBtnActive : ""
            }`}
            onClick={() => setActiveTab("overview")}
            type="button"
          >
            Resumen
          </button>
          <button
            className={`${styles.tabBtn} ${
              activeTab === "manual" ? styles.tabBtnActive : ""
            }`}
            onClick={() => setActiveTab("manual")}
            type="button"
          >
            Backup manual
          </button>
          <button
            className={`${styles.tabBtn} ${
              activeTab === "schedules" ? styles.tabBtnActive : ""
            }`}
            onClick={() => setActiveTab("schedules")}
            type="button"
          >
            Programaciones
          </button>
          <button
            className={`${styles.tabBtn} ${
              activeTab === "history" ? styles.tabBtnActive : ""
            }`}
            onClick={() => setActiveTab("history")}
            type="button"
          >
            Historial
          </button>
        </div>

        {activeTab === "overview" && (
          <div className={styles.tabContent}>
            <div className={styles.sectionHeader}>
              <h2>Resumen general</h2>
              <p>
                Estado actual de respaldos, programaciones activas y últimos
                respaldos automáticos.
              </p>
            </div>

            <div className={styles.overviewGrid}>
              <div className={styles.card}>
                <h3>Estado del sistema</h3>
                <div className={styles.infoGrid}>
                  <div className={styles.infoBox}>
                    <strong>Ruta local</strong>
                    <span>{backupsPath || "No disponible"}</span>
                  </div>
                  <div className={styles.infoBox}>
                    <strong>Cloudinary</strong>
                    <span>{cloudinaryEnabled ? "Disponible" : "No configurado"}</span>
                  </div>
                  <div className={styles.infoBox}>
                    <strong>Programaciones activas</strong>
                    <span>{summaryCards.activeSchedules}</span>
                  </div>
                  <div className={styles.infoBox}>
                    <strong>Tablas detectadas</strong>
                    <span>{tables.length}</span>
                  </div>
                </div>
              </div>

              <div className={styles.card}>
                <h3>Últimos backups programados</h3>
                {latestScheduledBackups.length === 0 ? (
                  <div className={styles.emptyState}>
                    No hay respaldos programados todavía.
                  </div>
                ) : (
                  <div className={styles.list}>
                    {latestScheduledBackups.map((backup) => (
                      <div key={backup.id} className={styles.listItem}>
                        <div>
                          <strong>{backup.filename}</strong>
                          <span>{formatDate(backup.createdAt)}</span>
                        </div>
                        <span className={styles.badgeSoft}>Programado</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === "manual" && (
          <div className={styles.tabContent}>
            <div className={styles.sectionHeader}>
              <h2>Crear backup manual</h2>
              <p>
                Genera un respaldo inmediato de toda la base o de una tabla específica.
              </p>
            </div>

            <div className={styles.card}>
              <div className={styles.formGrid}>
                <label className={styles.field}>
                  <span>Qué quieres respaldar</span>
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
                <span>Subir también a Cloudinary</span>
              </label>

              <div className={styles.previewCard}>
                <strong>Vista previa</strong>
                <p>
                  Se generará un backup de{" "}
                  <b>{getModeLabel(mode).toLowerCase()}</b> de{" "}
                  <b>
                    {scope === "table" && selectedTable
                      ? selectedTable
                      : "toda la base de datos"}
                  </b>
                  {uploadToCloudinary ? " y también se enviará a Cloudinary." : "."}
                </p>
              </div>

              <div className={styles.actionsRow}>
                <button
                  className={styles.primaryBtn}
                  onClick={handleCreateBackup}
                  disabled={
                    creatingBackup ||
                    (scope === "table" && !selectedTable)
                  }
                  type="button"
                >
                  {creatingBackup ? "Generando..." : "Generar backup ahora"}
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === "schedules" && (
          <div className={styles.tabContent}>
            <div className={styles.sectionHeader}>
              <h2>Programaciones</h2>
              <p>
                Crea varias programaciones, ejecútalas manualmente o elimínalas.
              </p>
            </div>

            <div className={styles.card}>
              <h3>Nueva programación</h3>

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
                    <option value="true">Sí</option>
                    <option value="false">No</option>
                  </select>
                </label>

                <label className={styles.field}>
                  <span>Expresión cron</span>
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
                  <span>Tabla específica</span>
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
                <span>Subir también a Cloudinary</span>
              </label>

              <div className={styles.previewCard}>
                <strong>Vista previa</strong>
                <p>
                  Esta programación hará un backup{" "}
                  <b>{getModeLabel(scheduleForm.mode).toLowerCase()}</b> de{" "}
                  <b>
                    {scheduleForm.scope === "table" && scheduleForm.table
                      ? `${scheduleForm.schema}.${scheduleForm.table}`
                      : "toda la base de datos"}
                  </b>
                  .
                </p>
              </div>

              <div className={styles.actionsRow}>
                <button
                  className={styles.primaryBtn}
                  onClick={handleCreateSchedule}
                  disabled={savingSchedule}
                  type="button"
                >
                  {savingSchedule ? "Guardando..." : "Crear programación"}
                </button>
              </div>
            </div>

            <div className={styles.card}>
              <h3>Programaciones creadas</h3>

              {loadingSchedules ? (
                <div className={styles.emptyState}>Cargando programaciones...</div>
              ) : schedules.length === 0 ? (
                <div className={styles.emptyState}>
                  Aún no has creado programaciones.
                </div>
              ) : (
                <div className={styles.scheduleList}>
                  {schedules.map((schedule) => (
                    <div key={schedule.id} className={styles.scheduleCard}>
                      <div className={styles.scheduleCardTop}>
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

                        <span
                          className={`${styles.statusPill} ${
                            schedule.enabled ? styles.statusActive : styles.statusOff
                          }`}
                        >
                          {schedule.enabled ? "Activa" : "Inactiva"}
                        </span>
                      </div>

                      <div className={styles.scheduleMetaGrid}>
                        <div>
                          <span>Zona horaria</span>
                          <strong>{schedule.timezone}</strong>
                        </div>
                        <div>
                          <span>Última ejecución</span>
                          <strong>{formatDate(schedule.lastRunAt)}</strong>
                        </div>
                        <div>
                          <span>Último estado</span>
                          <strong>{schedule.lastRunStatus || "N/D"}</strong>
                        </div>
                      </div>

                      {schedule.lastRunMessage ? (
                        <div className={styles.infoInline}>
                          {schedule.lastRunMessage}
                        </div>
                      ) : null}

                      <div className={styles.actionsRow}>
                        <button
                          className={styles.secondaryBtn}
                          onClick={() => handleRunScheduleNow(schedule.id)}
                          disabled={runningScheduleId === schedule.id}
                          type="button"
                        >
                          {runningScheduleId === schedule.id
                            ? "Ejecutando..."
                            : "Ejecutar ahora"}
                        </button>

                        <button
                          className={styles.dangerBtn}
                          onClick={() => handleDeleteSchedule(schedule.id)}
                          disabled={deletingScheduleId === schedule.id}
                          type="button"
                        >
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
              <h2>Historial de respaldos</h2>
              <p>Todos los backups manuales y programados.</p>
            </div>

            <div className={styles.card}>
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th>Tipo</th>
                      <th>Modo</th>
                      <th>Origen</th>
                      <th>Contenido</th>
                      <th>Tamaño</th>
                      <th>Nube</th>
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
                    ) : backups.length === 0 ? (
                      <tr>
                        <td colSpan={8} className={styles.emptyRow}>
                          Aún no hay respaldos generados.
                        </td>
                      </tr>
                    ) : (
                      backups.map((backup) => (
                        <tr key={backup.id}>
                          <td>{formatDate(backup.createdAt)}</td>
                          <td>{getScopeLabel(backup.scope)}</td>
                          <td>{getModeLabel(backup.mode)}</td>
                          <td>
                            <div className={styles.contentCell}>
                              <strong>{getSourceLabel(backup)}</strong>
                              <span>
                                {backup.origin === "scheduled"
                                  ? "Programado"
                                  : "Manual"}
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
                          <td>{backup.cloudinary?.url ? "Sí" : "No"}</td>
                          <td>
                            <div className={styles.rowActions}>
                              {backup.downloadUrl ? (
                                <button
                                  type="button"
                                  className={styles.downloadButton}
                                  onClick={() => handleDownloadBackup(backup)}
                                >
                                  Descargar
                                </button>
                              ) : (
                                <span className={styles.mutedText}>
                                  Sin descarga
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}