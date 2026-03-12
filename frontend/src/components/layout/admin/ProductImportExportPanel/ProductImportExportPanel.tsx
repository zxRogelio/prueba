/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMemo, useState } from "react";
import styles from "./ProductImportExportPanel.module.css";
import {
  AVAILABLE_EXPORT_FIELDS,
  exportProductsCsv,
  exportProductsImportTemplateCsv,
  uploadProductsCsv,
  validateProductsImport,
  previewProductsImport,
  getProductsImportErrors,
  commitProductsImport,
  type ExportField,
} from "../../../../services/admin/catalogImportExport";

type ImportErrorRow = {
  error_id: number;
  row_num: number;
  field_name: string;
  error_message: string;
};

type PreviewRow = {
  row_num: number;
  id_producto: number | null;
  name: string;
  brandId: number | null;
  brandName: string | null;
  categoryId: number | null;
  categoryName: string | null;
  price: number | null;
  stock: number | null;
  status: string | null;
  productType: string | null;
  core_id_match: number | null;
  core_logic_match: number | null;
  core_logic_name: string | null;
  action: "NEW" | "UPDATE_BY_ID" | "DUPLICATE_LOGICAL";
};

type PreviewResponse = {
  batchId: string;
  summary: {
    totalRows: number;
    newRows: number;
    matchedExistingRows: number;
    duplicateByNameBrandCategory: number;
    errorsCount: number;
  };
  comparison: PreviewRow[];
  errors: ImportErrorRow[];
};

const DEFAULT_EXPORT_FIELDS: ExportField[] = [
  "id_producto",
  "name",
  "brandName",
  "categoryName",
  "price",
  "stock",
  "status",
  "productType",
];

export default function ProductImportExportPanel() {
  const [file, setFile] = useState<File | null>(null);
  const [batchId, setBatchId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState<ImportErrorRow[]>([]);
  const [preview, setPreview] = useState<PreviewResponse | null>(null);
  const [selectedFields, setSelectedFields] = useState<ExportField[]>(DEFAULT_EXPORT_FIELDS);

  const toggleField = (field: ExportField) => {
    setSelectedFields((prev) =>
      prev.includes(field) ? prev.filter((x) => x !== field) : [...prev, field]
    );
  };

  const sortedFields = useMemo(() => AVAILABLE_EXPORT_FIELDS, []);

  const handleExportTemplate = async () => {
    try {
      setLoading(true);
      setMessage("");

      const blob = await exportProductsImportTemplateCsv(selectedFields);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "plantilla_importacion_productos.csv";
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      setMessage("Plantilla exportada correctamente.");
    } catch (error: any) {
      setMessage(
        error?.response?.data?.error || "Error exportando plantilla."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      setLoading(true);
      setMessage("");

      const blob = await exportProductsCsv(selectedFields);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "catalogo_productos.csv";
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      setMessage("CSV exportado correctamente.");
    } catch (error: any) {
      setMessage(error?.response?.data?.error || "Error exportando CSV.");
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setMessage("Selecciona un archivo CSV.");
      return;
    }

    try {
      setLoading(true);
      setMessage("");
      setErrors([]);
      setPreview(null);

      const data = await uploadProductsCsv(file);
      setBatchId(data.batchId);
      setMessage(`Archivo subido correctamente. Batch ID: ${data.batchId}`);
    } catch (error: any) {
      setMessage(error?.response?.data?.error || "Error subiendo CSV.");
    } finally {
      setLoading(false);
    }
  };

  const handleValidate = async () => {
    if (!batchId) {
      setMessage("No hay batchId para validar.");
      return;
    }

    try {
      setLoading(true);
      setMessage("");

      const data = await validateProductsImport(batchId);
      setErrors(data.errors || []);

      if (data.errorsCount > 0) {
        setMessage(`Se encontraron ${data.errorsCount} errores.`);
      } else {
        setMessage("Validación exitosa. No hay errores.");
      }
    } catch (error: any) {
      setMessage(
        error?.response?.data?.error || "Error validando importación."
      );
    } finally {
      setLoading(false);
    }
  };

  const handlePreview = async () => {
    if (!batchId) {
      setMessage("No hay batchId.");
      return;
    }

    try {
      setLoading(true);
      setMessage("");

      const data = await previewProductsImport(batchId);
      setPreview(data);
      setErrors(data.errors || []);
      setMessage("Preview generado correctamente.");
    } catch (error: any) {
      setMessage(error?.response?.data?.error || "Error generando preview.");
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshErrors = async () => {
    if (!batchId) {
      setMessage("No hay batchId.");
      return;
    }

    try {
      setLoading(true);
      const data = await getProductsImportErrors(batchId);
      setErrors(data.errors || []);
      setMessage(`Errores cargados: ${data.errorsCount}`);
    } catch (error: any) {
      setMessage(error?.response?.data?.error || "Error obteniendo errores.");
    } finally {
      setLoading(false);
    }
  };
const handleCommit = async () => {
  if (!batchId) {
    setMessage("No hay batchId.");
    return;
  }

  try {
    setLoading(true);
    setMessage("");

    const data = await commitProductsImport(batchId);
    setMessage(data.message || "Importación aplicada correctamente.");
  } catch (error: any) {
    console.log("COMMIT ERROR FULL:", error);

    const backendError =
      error?.response?.data?.details ||
      error?.response?.data?.error ||
      error?.response?.data?.message ||
      error?.details ||
      error?.error ||
      error?.message ||
      "Error aplicando importación.";

    setMessage(String(backendError));
  } finally {
    setLoading(false);
  }
};

  const getActionLabel = (action: PreviewRow["action"]) => {
    if (action === "NEW") return "Nuevo";
    if (action === "UPDATE_BY_ID") return "Actualizar por ID";
    return "Duplicado lógico";
  };

  return (
    <div className={styles.panel}>
      <h3 className={styles.title}>Importación / Exportación de Catálogo</h3>

      <div className={styles.grid}>
        <div className={styles.card}>
          <p className={styles.cardTitle}>Exportación avanzada</p>
          <p className={styles.cardHint}>
            Elige qué campos exportar en el CSV o en la plantilla.
          </p>

          <div className={styles.fieldList}>
            {sortedFields.map((field) => (
              <label key={field} className={styles.checkboxRow}>
                <input
                  type="checkbox"
                  checked={selectedFields.includes(field)}
                  onChange={() => toggleField(field)}
                />
                <span>{field}</span>
              </label>
            ))}
          </div>

          <div className={styles.actions}>
            <button
              className={`${styles.button} ${styles.ghost}`}
              onClick={handleExport}
              disabled={loading || selectedFields.length === 0}
            >
              Exportar CSV
            </button>

            <button
              className={`${styles.button} ${styles.secondary}`}
              onClick={handleExportTemplate}
              disabled={loading || selectedFields.length === 0}
            >
              Exportar plantilla
            </button>
          </div>
        </div>

        <div className={styles.card}>
          <p className={styles.cardTitle}>Importación inteligente</p>
          <p className={styles.cardHint}>
            Sube el CSV, valida, revisa la comparación y luego aplica.
          </p>

          <input
            className={styles.fileInput}
            type="file"
            accept=".csv"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
          />

          <div className={styles.actions}>
            <button
              className={`${styles.button} ${styles.primary}`}
              onClick={handleUpload}
              disabled={loading || !file}
            >
              Subir CSV
            </button>

            <button
              className={`${styles.button} ${styles.warning}`}
              onClick={handleValidate}
              disabled={loading || !batchId}
            >
              Validar lote
            </button>

            <button
              className={`${styles.button} ${styles.info}`}
              onClick={handlePreview}
              disabled={loading || !batchId}
            >
              Ver comparación
            </button>

            <button
              className={`${styles.button} ${styles.ghost}`}
              onClick={handleRefreshErrors}
              disabled={loading || !batchId}
            >
              Ver errores
            </button>

            <button
              className={`${styles.button} ${styles.success}`}
              onClick={handleCommit}
              disabled={loading || !batchId}
            >
              Aplicar importación
            </button>
          </div>
        </div>
      </div>

      <div className={styles.infoRow}>
        {batchId && (
          <span className={`${styles.badge} ${styles.batchBadge}`}>
            Batch ID: {batchId}
          </span>
        )}
        {message && (
          <span className={`${styles.badge} ${styles.message}`}>{message}</span>
        )}
      </div>

      {preview && (
        <div className={styles.previewWrap}>
          <h4 className={styles.errorsTitle}>Resumen del lote</h4>

          <div className={styles.summaryGrid}>
            <div className={styles.summaryCard}>
              <span>Total filas</span>
              <strong>{preview.summary.totalRows}</strong>
            </div>
            <div className={styles.summaryCard}>
              <span>Nuevos</span>
              <strong>{preview.summary.newRows}</strong>
            </div>
            <div className={styles.summaryCard}>
              <span>Coinciden con existentes</span>
              <strong>{preview.summary.matchedExistingRows}</strong>
            </div>
            <div className={styles.summaryCard}>
              <span>Duplicados lógicos</span>
              <strong>{preview.summary.duplicateByNameBrandCategory}</strong>
            </div>
            <div className={styles.summaryCard}>
              <span>Errores</span>
              <strong>{preview.summary.errorsCount}</strong>
            </div>
          </div>

          <div className={styles.tableContainer}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th className={styles.th}>Fila</th>
                  <th className={styles.th}>ID CSV</th>
                  <th className={styles.th}>Nombre</th>
                  <th className={styles.th}>Marca</th>
                  <th className={styles.th}>Categoría</th>
                  <th className={styles.th}>Precio</th>
                  <th className={styles.th}>Stock</th>
                  <th className={styles.th}>Acción</th>
                  <th className={styles.th}>ID coincidente</th>
                </tr>
              </thead>
              <tbody>
                {preview.comparison.map((row) => (
                  <tr key={`${row.row_num}-${row.name}`}>
                    <td className={styles.td}>{row.row_num}</td>
                    <td className={styles.td}>{row.id_producto ?? "Auto"}</td>
                    <td className={styles.td}>{row.name}</td>
                    <td className={styles.td}>{row.brandName ?? row.brandId ?? "—"}</td>
                    <td className={styles.td}>{row.categoryName ?? row.categoryId ?? "—"}</td>
                    <td className={styles.td}>{row.price ?? "—"}</td>
                    <td className={styles.td}>{row.stock ?? "—"}</td>
                    <td className={styles.td}>{getActionLabel(row.action)}</td>
                    <td className={styles.td}>
                      {row.core_id_match ?? row.core_logic_match ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {errors.length > 0 && (
        <div className={styles.errorsWrap}>
          <h4 className={styles.errorsTitle}>Errores encontrados</h4>
          <div className={styles.tableContainer}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th className={styles.th}>Fila</th>
                  <th className={styles.th}>Campo</th>
                  <th className={styles.th}>Error</th>
                </tr>
              </thead>
              <tbody>
                {errors.map((err) => (
                  <tr key={err.error_id}>
                    <td className={styles.td}>{err.row_num}</td>
                    <td className={styles.td}>{err.field_name}</td>
                    <td className={styles.td}>{err.error_message}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}