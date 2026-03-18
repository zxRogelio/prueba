import { useEffect, useMemo, useState } from "react";
import styles from "./AdminSiteSettingsPage.module.css";
import {
  createBackup,
  downloadBackupFile,
  getBackupOptions,
  listBackups,
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

const formatDate = (value: string) => new Date(value).toLocaleString();

const getErrorMessage = (error: unknown, fallback: string) => {
  if (typeof error === "object" && error !== null) {
    const maybeResponse = (
      error as { response?: { data?: { error?: string } } }
    ).response;
    if (maybeResponse?.data?.error) return maybeResponse.data.error;
  }

  return fallback;
};

export default function AdminSiteSettingsPage() {
  const [data, setData] = useState<SiteSettings>(initial);
  const [scope, setScope] = useState<BackupScope>("full");
  const [selectedTable, setSelectedTable] = useState("");
  const [uploadToCloudinary, setUploadToCloudinary] = useState(false);
  const [cloudinaryEnabled, setCloudinaryEnabled] = useState(false);
  const [backupsPath, setBackupsPath] = useState("");
  const [tables, setTables] = useState<
    Array<{ schema: string; table: string }>
  >([]);
  const [backups, setBackups] = useState<BackupRecord[]>([]);
  const [loadingBackups, setLoadingBackups] = useState(true);
  const [creatingBackup, setCreatingBackup] = useState(false);
  const [backupMessage, setBackupMessage] = useState("");
  const [backupError, setBackupError] = useState("");

  const onSave = () => {
    // Luego lo conectamos a backend
    console.log("Guardando settings:", data);
    alert("Guardado (demo). Luego lo conectamos al backend 😉");
  };

  const loadBackupsData = async () => {
    setLoadingBackups(true);
    setBackupError("");

    try {
      const [optionsResponse, backupsResponse] = await Promise.all([
        getBackupOptions(),
        listBackups(),
      ]);

      setTables(optionsResponse.tables);
      setCloudinaryEnabled(optionsResponse.cloudinaryEnabled);
      setBackupsPath(optionsResponse.backupsPath);
      setBackups(backupsResponse.backups);
      if (optionsResponse.tables.length > 0 && !selectedTable) {
        setSelectedTable(
          `${optionsResponse.tables[0].schema}.${optionsResponse.tables[0].table}`,
        );
      }
    } catch (error: unknown) {
      setBackupError(
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
    loadBackupsData();
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

  const handleCreateBackup = async () => {
    setCreatingBackup(true);
    setBackupError("");
    setBackupMessage("");

    try {
      const [schema, table] = selectedTable.split(".");
      const payload =
        scope === "table"
          ? { scope, schema, table, uploadToCloudinary }
          : { scope, uploadToCloudinary };

      const response = await createBackup(payload);
      setBackupMessage(response.message);
      await loadBackupsData();

      await downloadBackupFile(
        response.backup.downloadUrl,
        response.backup.filename,
      );
    } catch (error: unknown) {
      setBackupError(getErrorMessage(error, "No se pudo generar el backup."));
    } finally {
      setCreatingBackup(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Gestión del sitio</h1>
          <p className={styles.subtitle}>
            Edita la información pública y administra respaldos descargables de
            la base de datos desde el panel admin.
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

        {/* Contacto */}
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

        {/* Imágenes */}
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

        <section className={styles.card}>
          <div className={styles.backupHeader}>
            <div>
              <h2 className={styles.cardTitle}>Backups de base de datos</h2>
              <p className={styles.cardDescription}>
                Genera respaldos completos o por tabla, descárgalos desde la web
                y opcionalmente súbelos a Cloudinary como archivo JSON.
              </p>
            </div>
            <button
              className={styles.secondaryBtn}
              onClick={loadBackupsData}
              disabled={loadingBackups}
            >
              {loadingBackups ? "Actualizando..." : "Recargar historial"}
            </button>
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

          {backupMessage && (
            <div className={styles.success}>{backupMessage}</div>
          )}
          {backupError && <div className={styles.error}>{backupError}</div>}

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
                  <th>Contenido</th>
                  <th>Tamaño</th>
                  <th>Cloudinary</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {backups.length === 0 ? (
                  <tr>
                    <td colSpan={6} className={styles.emptyRow}>
                      Aún no hay respaldos generados.
                    </td>
                  </tr>
                ) : (
                  backups.map((backup) => (
                    <tr key={backup.id}>
                      <td>{formatDate(backup.createdAt)}</td>
                      <td>{backup.scope === "full" ? "Completo" : "Tabla"}</td>
                      <td>
                        {backup.scope === "full"
                          ? `${backup.tablesIncluded} tablas / ${backup.rowsIncluded} filas`
                          : `${backup.schema}.${backup.table} / ${backup.rowsIncluded} filas`}
                      </td>
                      <td>{backup.sizeKB} KB</td>
                      <td>
                        {backup.cloudinary?.url ? (
                          <a
                            href={backup.cloudinary.url}
                            target="_blank"
                            rel="noreferrer"
                          >
                            Ver archivo
                          </a>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td>
                        <button
                          type="button"
                          className={styles.downloadButton}
                          onClick={() =>
                            downloadBackupFile(
                              backup.downloadUrl,
                              backup.filename,
                            )
                          }
                        >
                          Descargar
                        </button>
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
