import { useEffect, useMemo, useState } from "react";
import styles from "./AdminSiteSettingsPage.module.css";
import {
  createBackup,
  downloadBackupFile,
  getBackupOptions,
  listBackups,
  type BackupMode,
  type BackupRecord,
  type BackupScope,
} from "../../services/admin/backupService";

type SiteSettings = {
  slogan: string;
  filosofia: string;
  mision: string;
  vision: string;
  valores: string;
  telefono: string;
  correo: string;
  direccion: string;
  instagram: string;
  facebook: string;
  heroImageUrl: string;
  logoUrl: string;
};

type ToastType = "success" | "error" | "info";

type ToastItem = {
  id: number;
  type: ToastType;
  title: string;
  message: string;
};

const initial: SiteSettings = {
  slogan: "Tu destino de transformación",
  filosofia: "Aquí va la filosofía del gimnasio...",
  mision: "Aquí va la misión...",
  vision: "Aquí va la visión...",
  valores: "Disciplina, constancia, respeto...",
  telefono: "",
  correo: "",
  direccion: "",
  instagram: "",
  facebook: "",
  heroImageUrl: "",
  logoUrl: "",
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
  if (scope === "table") return "Tabla";
  return "Respaldo";
};

const getModeLabel = (mode?: BackupMode | string | null) => {
  if (mode === "data-only") return "Datos solamente";
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

const getContentLabel = (backup: BackupRecord) => {
  if (backup.scope === "table" && backup.schema && backup.table) {
    return `${backup.schema}.${backup.table}`;
  }

  if (backup.scope === "full") {
    return "Base de datos completa";
  }

  return backup.filename || "Respaldo";
};

const getRowsLabel = (backup: BackupRecord) => {
  if (typeof backup.rowsIncluded === "number") {
    return `${backup.rowsIncluded.toLocaleString()} filas`;
  }
  return "Filas N/D";
};

const getTablesLabel = (backup: BackupRecord) => {
  if (typeof backup.tablesIncluded === "number") {
    return `${backup.tablesIncluded.toLocaleString()} tablas`;
  }
  return "Tablas N/D";
};

const getSizeLabel = (backup: BackupRecord) => {
  if (backup.sizeKB) return `${backup.sizeKB} KB`;
  if (typeof backup.sizeBytes === "number") {
    return `${(backup.sizeBytes / 1024).toFixed(2)} KB`;
  }
  return "N/D";
};

const getCloudinaryLabel = (backup: BackupRecord) => {
  if (backup.cloudinary?.url) return "Disponible";
  return backup.source === "cloudinary" ? "Solo nube" : "No";
};

export default function AdminSiteSettingsPage() {
  const [data, setData] = useState<SiteSettings>(initial);

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
  const [loadingBackups, setLoadingBackups] = useState(true);
  const [creatingBackup, setCreatingBackup] = useState(false);
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

  const onSave = () => {
    console.log("Guardando settings:", data);
    pushToast(
      "info",
      "Guardado pendiente",
      "La conexión real de configuración del sitio aún no está implementada.",
    );
  };

  const loadBackupsData = async (showToast = false) => {
    setLoadingBackups(true);

    try {
      const [optionsResponse, backupsResponse] = await Promise.all([
        getBackupOptions(),
        listBackups(),
      ]);

      setTables(optionsResponse.tables || []);
      setCloudinaryEnabled(Boolean(optionsResponse.cloudinaryEnabled));
      setBackupsPath(optionsResponse.backupsPath || "");
      setBackups(backupsResponse.backups || []);

      if (optionsResponse.tables.length > 0 && !selectedTable) {
        setSelectedTable(
          `${optionsResponse.tables[0].schema}.${optionsResponse.tables[0].table}`,
        );
      }

      if (showToast) {
        pushToast(
          "success",
          "Historial actualizado",
          "La lista de respaldos se recargó correctamente.",
        );
      }
    } catch (error: unknown) {
      pushToast(
        "error",
        "Error al cargar respaldos",
        getErrorMessage(
          error,
          "No se pudo cargar la configuración de respaldos.",
        ),
      );
    } finally {
      setLoadingBackups(false);
    }
  };

  useEffect(() => {
    loadBackupsData(false);
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

  const summaryCards = useMemo(() => {
    const totalBackups = backups.length;
    const localCount = backups.filter((item) => item.source === "local").length;
    const cloudCount = backups.filter(
      (item) => item.source === "cloudinary" || item.cloudinary?.url,
    ).length;
    const totalSizeKB = backups.reduce((acc, item) => {
      const parsed = Number(item.sizeKB || 0);
      return acc + (Number.isFinite(parsed) ? parsed : 0);
    }, 0);

    return {
      totalBackups,
      localCount,
      cloudCount,
      totalSizeKB: totalSizeKB.toFixed(2),
    };
  }, [backups]);

  const handleCreateBackup = async () => {
    setCreatingBackup(true);

    try {
      const [schema, table] = selectedTable.split(".");

      const payload =
        scope === "table"
          ? { scope, schema, table, uploadToCloudinary, mode }
          : { scope, uploadToCloudinary, mode };

      console.log("📤 Enviando payload de backup:", payload);

      const response = await createBackup(payload);

      console.log("✅ Respuesta createBackup:", response);

      pushToast(
        "success",
        "Backup generado",
        response.message || "El respaldo se generó correctamente.",
      );

      await loadBackupsData(false);

      if (response.backup?.downloadUrl) {
        await downloadBackupFile(
          response.backup.downloadUrl,
          response.backup.filename,
        );

        pushToast(
          "info",
          "Descarga iniciada",
          `Se descargó el archivo ${response.backup.filename}.`,
        );
      } else {
        pushToast(
          "info",
          "Backup generado",
          "El respaldo se creó correctamente, pero no tiene ruta de descarga disponible.",
        );
      }
    } catch (error: unknown) {
      console.error("❌ Error en handleCreateBackup:", error);

      if (typeof error === "object" && error !== null) {
        const err = error as {
          response?: {
            status?: number;
            data?: {
              error?: string;
              detail?: string;
            };
          };
          message?: string;
        };

        console.error("❌ Status:", err.response?.status);
        console.error("❌ Backend error:", err.response?.data?.error);
        console.error("❌ Backend detail:", err.response?.data?.detail);
        console.error("❌ Message:", err.message);
      }

      pushToast(
        "error",
        "Error al generar backup",
        getErrorMessage(error, "No se pudo generar el backup."),
      );
    } finally {
      setCreatingBackup(false);
    }
  };

  const handleDownloadBackup = async (backup: BackupRecord) => {
    try {
      if (!backup.downloadUrl) {
        pushToast(
          "error",
          "Descarga no disponible",
          "Este respaldo no tiene ruta de descarga local disponible.",
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
        getErrorMessage(error, "No se pudo descargar el backup."),
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
              aria-label="Cerrar alerta"
              type="button"
            >
              ×
            </button>
          </div>
        ))}
      </div>

      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Gestión del sitio</h1>
          <p className={styles.subtitle}>
            Administra contenido público, imágenes institucionales y respaldos
            de base de datos desde un solo panel.
          </p>
        </div>

        <button className={styles.primaryBtn} onClick={onSave}>
          Guardar cambios
        </button>
      </div>

      <div className={styles.grid}>
        <section className={styles.card}>
          <h2 className={styles.cardTitle}>Contenido</h2>

          <label className={styles.field}>
            <span>Slogan</span>
            <input
              value={data.slogan}
              onChange={(e) =>
                setData((p) => ({ ...p, slogan: e.target.value }))
              }
              placeholder="Ej. Tu destino de transformación"
            />
          </label>

          <label className={styles.field}>
            <span>Filosofía</span>
            <textarea
              value={data.filosofia}
              onChange={(e) =>
                setData((p) => ({ ...p, filosofia: e.target.value }))
              }
              placeholder="Describe la filosofía del gimnasio..."
              rows={5}
            />
          </label>

          <div className={styles.twoCols}>
            <label className={styles.field}>
              <span>Misión</span>
              <textarea
                value={data.mision}
                onChange={(e) =>
                  setData((p) => ({ ...p, mision: e.target.value }))
                }
                rows={4}
              />
            </label>

            <label className={styles.field}>
              <span>Visión</span>
              <textarea
                value={data.vision}
                onChange={(e) =>
                  setData((p) => ({ ...p, vision: e.target.value }))
                }
                rows={4}
              />
            </label>
          </div>

          <label className={styles.field}>
            <span>Valores</span>
            <textarea
              value={data.valores}
              onChange={(e) =>
                setData((p) => ({ ...p, valores: e.target.value }))
              }
              placeholder="Ej. Disciplina, constancia, respeto..."
              rows={3}
            />
          </label>
        </section>

        <section className={styles.card}>
          <h2 className={styles.cardTitle}>Contacto</h2>

          <div className={styles.twoCols}>
            <label className={styles.field}>
              <span>Teléfono</span>
              <input
                value={data.telefono}
                onChange={(e) =>
                  setData((p) => ({ ...p, telefono: e.target.value }))
                }
                placeholder="Ej. +52 33 1234 5678"
              />
            </label>

            <label className={styles.field}>
              <span>Correo</span>
              <input
                value={data.correo}
                onChange={(e) =>
                  setData((p) => ({ ...p, correo: e.target.value }))
                }
                placeholder="Ej. contacto@titanium.com"
              />
            </label>
          </div>

          <label className={styles.field}>
            <span>Dirección</span>
            <input
              value={data.direccion}
              onChange={(e) =>
                setData((p) => ({ ...p, direccion: e.target.value }))
              }
              placeholder="Calle, número, colonia, ciudad..."
            />
          </label>

          <div className={styles.twoCols}>
            <label className={styles.field}>
              <span>Instagram</span>
              <input
                value={data.instagram}
                onChange={(e) =>
                  setData((p) => ({ ...p, instagram: e.target.value }))
                }
                placeholder="@titaniumgym"
              />
            </label>

            <label className={styles.field}>
              <span>Facebook</span>
              <input
                value={data.facebook}
                onChange={(e) =>
                  setData((p) => ({ ...p, facebook: e.target.value }))
                }
                placeholder="facebook.com/..."
              />
            </label>
          </div>
        </section>

        <section className={styles.card}>
          <h2 className={styles.cardTitle}>Imágenes</h2>

          <label className={styles.field}>
            <span>Logo (URL)</span>
            <input
              value={data.logoUrl}
              onChange={(e) =>
                setData((p) => ({ ...p, logoUrl: e.target.value }))
              }
              placeholder="https://..."
            />
          </label>

          <label className={styles.field}>
            <span>Imagen principal (Hero) (URL)</span>
            <input
              value={data.heroImageUrl}
              onChange={(e) =>
                setData((p) => ({ ...p, heroImageUrl: e.target.value }))
              }
              placeholder="https://..."
            />
          </label>

          <div className={styles.previewRow}>
            <div className={styles.previewBox}>
              <div className={styles.previewLabel}>Logo</div>
              {data.logoUrl ? (
                <img
                  className={styles.previewImg}
                  src={data.logoUrl}
                  alt="Logo"
                />
              ) : (
                <div className={styles.previewEmpty}>Sin imagen</div>
              )}
            </div>

            <div className={styles.previewBox}>
              <div className={styles.previewLabel}>Hero</div>
              {data.heroImageUrl ? (
                <img
                  className={styles.previewImg}
                  src={data.heroImageUrl}
                  alt="Hero"
                />
              ) : (
                <div className={styles.previewEmpty}>Sin imagen</div>
              )}
            </div>
          </div>
        </section>

        <section className={`${styles.card} ${styles.backupCard}`}>
          <div className={styles.backupHeader}>
            <div>
              <h2 className={styles.cardTitle}>Backups de base de datos</h2>
              <p className={styles.cardDescription}>
                Genera, consulta y descarga respaldos del sistema. Puedes crear
                backups por tabla o de base completa, con soporte para
                Cloudinary y visualización del historial.
              </p>
            </div>
            <button
              className={styles.secondaryBtn}
              onClick={() => loadBackupsData(true)}
              disabled={loadingBackups}
            >
              {loadingBackups ? "Actualizando..." : "Recargar historial"}
            </button>
          </div>

          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <span className={styles.statLabel}>Respaldos totales</span>
              <strong className={styles.statValue}>
                {summaryCards.totalBackups}
              </strong>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statLabel}>Locales</span>
              <strong className={styles.statValue}>
                {summaryCards.localCount}
              </strong>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statLabel}>Con nube</span>
              <strong className={styles.statValue}>
                {summaryCards.cloudCount}
              </strong>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statLabel}>Peso total visible</span>
              <strong className={styles.statValue}>
                {summaryCards.totalSizeKB} KB
              </strong>
            </div>
          </div>

          <div className={styles.backupInfoGrid}>
            <div className={styles.infoBox}>
              <strong>Guardado local</strong>
              <span>{backupsPath || "Se detectará al cargar"}</span>
            </div>
            <div className={styles.infoBox}>
              <strong>Cloudinary</strong>
              <span>{cloudinaryEnabled ? "Disponible" : "No configurado"}</span>
            </div>
          </div>

          <div className={styles.alertStrip}>
            <div className={styles.alertStripTitle}>Configuración actual</div>
            <div className={styles.alertStripText}>
              Modo seleccionado: <strong>{getModeLabel(mode)}</strong>. Alcance:{" "}
              <strong>{getScopeLabel(scope)}</strong>.
            </div>
          </div>

          <div className={styles.backupControls}>
            <div className={styles.inlineFieldGroup}>
              <label className={styles.field}>
                <span>Tipo de backup</span>
                <select
                  value={scope}
                  onChange={(e) => setScope(e.target.value as BackupScope)}
                >
                  <option value="full">Base de datos completa</option>
                  <option value="table">Tabla específica</option>
                </select>
              </label>

              <label className={styles.field}>
                <span>Modo de respaldo</span>
                <select
                  value={mode}
                  onChange={(e) => setMode(e.target.value as BackupMode)}
                >
                  <option value="schema-and-data">Estructura + datos</option>
                  <option value="data-only">Datos solamente</option>
                </select>
              </label>
            </div>

            <div className={styles.inlineFieldGroup}>
              <label className={styles.field}>
                <span>Tabla</span>
                <select
                  value={selectedTable}
                  onChange={(e) => setSelectedTable(e.target.value)}
                  disabled={scope !== "table" || tableOptions.length === 0}
                >
                  {tableOptions.length === 0 ? (
                    <option value="">No hay tablas disponibles</option>
                  ) : (
                    tableOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))
                  )}
                </select>
              </label>

              <div className={styles.field}>
                <span>Proveedor actual</span>
                <div className={styles.readonlyBox}>
                  Local + {cloudinaryEnabled ? "Cloudinary" : "Sin Cloudinary"}
                </div>
              </div>
            </div>

            <label className={styles.checkboxRow}>
              <input
                type="checkbox"
                checked={uploadToCloudinary}
                onChange={(e) => setUploadToCloudinary(e.target.checked)}
                disabled={!cloudinaryEnabled}
              />
              <span>
                Subir también a Cloudinary
                {!cloudinaryEnabled && " (configuración faltante en backend)"}
              </span>
            </label>

            <div className={styles.backupActions}>
              <button
                className={styles.primaryBtn}
                onClick={handleCreateBackup}
                disabled={
                  creatingBackup ||
                  loadingBackups ||
                  (scope === "table" && !selectedTable)
                }
              >
                {creatingBackup
                  ? "Generando backup..."
                  : "Generar y descargar backup"}
              </button>
            </div>
          </div>

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
                  <th>Cloudinary</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {loadingBackups ? (
                  <tr>
                    <td colSpan={8} className={styles.emptyRow}>
                      Cargando historial de respaldos...
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
                      <td>
                        <span className={`${styles.badge} ${styles.badgeGray}`}>
                          {getScopeLabel(backup.scope)}
                        </span>
                      </td>
                      <td>
                        <span
                          className={`${styles.badge} ${
                            backup.mode === "schema-and-data"
                              ? styles.badgeBlue
                              : backup.mode === "data-only"
                                ? styles.badgeAmber
                                : styles.badgeGray
                          }`}
                        >
                          {getModeLabel(backup.mode)}
                        </span>
                      </td>
                      <td>
                        <span
                          className={`${styles.badge} ${
                            backup.source === "cloudinary"
                              ? styles.badgePurple
                              : backup.source === "local" && backup.cloudinary?.url
                                ? styles.badgeBlue
                                : styles.badgeGreen
                          }`}
                        >
                          {getSourceLabel(backup)}
                        </span>
                      </td>
                      <td>
                        <div className={styles.contentCell}>
                          <strong>{getContentLabel(backup)}</strong>
                          <span>
                            {backup.scope === "full"
                              ? `${getTablesLabel(backup)} / ${getRowsLabel(backup)}`
                              : getRowsLabel(backup)}
                          </span>
                        </div>
                      </td>
                      <td>{getSizeLabel(backup)}</td>
                      <td>
                        {backup.cloudinary?.url ? (
                          <a
                            href={backup.cloudinary.url}
                            target="_blank"
                            rel="noreferrer"
                            className={styles.linkAction}
                          >
                            Ver archivo
                          </a>
                        ) : (
                          <span className={styles.mutedText}>
                            {getCloudinaryLabel(backup)}
                          </span>
                        )}
                      </td>
                      <td>
                        <div className={styles.rowActions}>
                          <button
                            type="button"
                            className={styles.downloadButton}
                            onClick={() => handleDownloadBackup(backup)}
                            disabled={!backup.downloadUrl}
                          >
                            Descargar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}